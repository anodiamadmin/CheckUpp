import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import { format } from "date-fns";
import { HistoryEntry, ScreeningHistory } from "@/lib/storage/screeningStorage";

interface ExportPDFOptions {
  screeningName: string;
  history: HistoryEntry[] | ScreeningHistory;
  isFullHistory?: boolean;
  user?: {
    name?: string;
    email?: string;
    $id?: string;
  };
}

type RecordWithType = HistoryEntry & { screeningType?: string };

type ParsedField = {
  label: string;
  value: string;
};

type ParsedResult =
  | {
      type: "structured";
      data: unknown;
    }
  | {
      type: "fields";
      fields: ParsedField[];
      flags: string[];
      rawText: string;
    }
  | {
      type: "text";
      text: string;
    };

type ParsedNotes = {
  facts: ParsedField[];
  bullets: string[];
};

type DetailSection = {
  title: string;
  items: ParsedField[];
};

const normalizeLabel = (label: string) =>
  label
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const parseDelimitedResult = (raw: string) => {
  const tokens = raw
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const fields: ParsedField[] = [];
  const flags: string[] = [];
  let currentField: ParsedField | null = null;

  const allowsContinuation = (label: string) => {
    const normalized = label.toLowerCase();
    return (
      normalized === "symptoms" ||
      normalized === "gum issues" ||
      normalized === "notes" ||
      normalized === "result value" ||
      normalized === "additional notes"
    );
  };

  for (const token of tokens) {
    const separatorIndex = token.indexOf(":");
    const looksLikeField =
      separatorIndex > 0 && separatorIndex < 45 && !token.startsWith("http");

    if (looksLikeField) {
      if (currentField) {
        fields.push(currentField);
      }

      const label = normalizeLabel(token.slice(0, separatorIndex));
      const value = token.slice(separatorIndex + 1).trim();
      currentField = { label, value };
      continue;
    }

    if (!currentField) {
      flags.push(token);
      continue;
    }

    const looksLikeStandaloneFlag =
      /^[A-Z][a-z]+(?:\s+[A-Za-z][A-Za-z'-]*){0,5}$/.test(token) &&
      !allowsContinuation(currentField.label);

    if (looksLikeStandaloneFlag) {
      fields.push(currentField);
      currentField = null;
      flags.push(token);
      continue;
    }

    currentField.value = currentField.value
      ? `${currentField.value}, ${token}`
      : token;
  }

  if (currentField) {
    fields.push(currentField);
  }

  return { fields, flags };
};

const parseResultData = (result: string): ParsedResult => {
  const trimmed = String(result ?? "").trim();
  if (!trimmed) {
    return { type: "text", text: "No result captured." };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return { type: "structured", data: parsed };
    }
  } catch {
    // fall through
  }

  const { fields, flags } = parseDelimitedResult(trimmed);
  if (fields.length > 0 || (flags.length > 0 && trimmed.includes(":"))) {
    return {
      type: "fields",
      fields,
      flags,
      rawText: trimmed,
    };
  }

  return { type: "text", text: trimmed };
};

const parseAdditionalNotes = (notes: string[]): ParsedNotes => {
  const facts: ParsedField[] = [];
  const bullets: string[] = [];

  const pushFact = (label: string, value: string) => {
    const normalizedLabel = normalizeLabel(label);
    const normalizedValue = value.trim();
    if (!normalizedLabel || !normalizedValue) return;
    facts.push({ label: normalizedLabel, value: normalizedValue });
  };

  const pushBullet = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    bullets.push(normalized);
  };

  notes.forEach((note) => {
    const lines = String(note ?? "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      const chunks = line
        .split(/,\s*/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);

      if (chunks.length <= 1) {
        const separatorIndex = line.indexOf(":");
        const looksLikeField =
          separatorIndex > 0 && separatorIndex < 45 && !line.startsWith("http");

        if (looksLikeField) {
          pushFact(line.slice(0, separatorIndex), line.slice(separatorIndex + 1));
          return;
        }

        pushBullet(line);
        return;
      }

      chunks.forEach((chunk) => {
        const separatorIndex = chunk.indexOf(":");
        const looksLikeField =
          separatorIndex > 0 && separatorIndex < 45 && !chunk.startsWith("http");

        if (looksLikeField) {
          pushFact(chunk.slice(0, separatorIndex), chunk.slice(separatorIndex + 1));
          return;
        }

        pushBullet(chunk);
      });
    });
  });

  const uniqueFacts = facts.filter((fact, index, list) => {
    const marker = `${fact.label}::${fact.value}`.toLowerCase();
    return (
      list.findIndex(
        (candidate) =>
          `${candidate.label}::${candidate.value}`.toLowerCase() === marker,
      ) === index
    );
  });

  const uniqueBullets = bullets.filter(
    (bullet, index, list) =>
      list.findIndex((candidate) => candidate.toLowerCase() === bullet.toLowerCase()) ===
      index,
  );

  return {
    facts: uniqueFacts,
    bullets: uniqueBullets,
  };
};

const resolveRecordType = (entry: RecordWithType, screeningName: string) => {
  const source = entry.screeningType || screeningName || "";
  return source.toLowerCase();
};

const classifyFieldSection = (label: string, recordType: string) => {
  const normalized = label.toLowerCase();

  if (normalized.includes("note")) return "Care Notes";
  if (/(symptom|gum issues)/.test(normalized)) return "Symptoms";

  if (
    /(smoking|substance|social support|work stress|exercise|correction|mouthwash|sleep|orthodontics)/.test(
      normalized,
    )
  ) {
    return "Risk & Lifestyle";
  }

  if (/(k-10|dass-21|depression|anxiety|stress)/.test(normalized)) {
    return "Assessment Scores";
  }

  if (/(fasting|random|post-meal|hba1c|ketones|bmi|glucose)/.test(normalized)) {
    return "Glucose & Metabolic";
  }

  if (/(bp|heart rate|hr|ecg|chol|ldl|hdl|trig)/.test(normalized)) {
    return "Cardio & Vitals";
  }

  if (
    /(right eye|left eye|both eyes|color vision|peripheral vision|pressure)/.test(
      normalized,
    )
  ) {
    return "Vision Findings";
  }

  if (
    /(brushing|flossing|cavities|fillings|missing teeth|crowns|implants|last cleaning|last x-ray)/.test(
      normalized,
    )
  ) {
    return "Dental Findings";
  }

  if (recordType.includes("cancer")) {
    return "Screening Results";
  }

  return "Other Details";
};

const getSectionOrder = (recordType: string) => {
  if (recordType.includes("diabetes")) {
    return [
      "Glucose & Metabolic",
      "Cardio & Vitals",
      "Risk & Lifestyle",
      "Symptoms",
      "Care Notes",
      "Other Details",
    ];
  }

  if (recordType.includes("cardiovascular") || recordType.includes("heart")) {
    return [
      "Cardio & Vitals",
      "Glucose & Metabolic",
      "Risk & Lifestyle",
      "Symptoms",
      "Care Notes",
      "Other Details",
    ];
  }

  if (recordType.includes("vision")) {
    return [
      "Vision Findings",
      "Symptoms",
      "Risk & Lifestyle",
      "Care Notes",
      "Other Details",
    ];
  }

  if (recordType.includes("dental")) {
    return [
      "Dental Findings",
      "Symptoms",
      "Risk & Lifestyle",
      "Care Notes",
      "Other Details",
    ];
  }

  if (recordType.includes("mental")) {
    return [
      "Assessment Scores",
      "Risk & Lifestyle",
      "Symptoms",
      "Care Notes",
      "Other Details",
    ];
  }

  if (recordType.includes("cancer")) {
    return ["Screening Results", "Risk & Lifestyle", "Care Notes", "Other Details"];
  }

  return [
    "Cardio & Vitals",
    "Glucose & Metabolic",
    "Vision Findings",
    "Dental Findings",
    "Assessment Scores",
    "Symptoms",
    "Risk & Lifestyle",
    "Care Notes",
    "Other Details",
  ];
};

const buildDetailSections = (fields: ParsedField[], recordType: string): DetailSection[] => {
  const grouped = new Map<string, ParsedField[]>();

  fields.forEach((field) => {
    const section = classifyFieldSection(field.label, recordType);
    const sectionItems = grouped.get(section) ?? [];
    sectionItems.push(field);
    grouped.set(section, sectionItems);
  });

  const order = getSectionOrder(recordType);
  const sections: DetailSection[] = [];

  order.forEach((sectionName) => {
    const items = grouped.get(sectionName);
    if (items && items.length > 0) {
      sections.push({ title: sectionName, items });
    }
  });

  grouped.forEach((items, sectionName) => {
    if (!order.includes(sectionName) && items.length > 0) {
      sections.push({ title: sectionName, items });
    }
  });

  return sections;
};

const shouldRenderAsList = (label: string) => /symptom|gum issues|observations?/i.test(label);

const parseListValue = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const escapeHtml = (text: string) =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, "<br>");

const formatDateSafe = (value: string, dateFormat: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, dateFormat);
};

const generateStyles = () => `
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      color: #1f2937;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f8fafc;
      font-size: 12px;
      line-height: 1.5;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      min-height: 100vh;
    }

    .header {
      border-bottom: 3px solid #f59e0b;
      padding: 28px 32px 20px;
      background: #ffffff;
    }

    .brand {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #6b7280;
      margin-bottom: 10px;
    }

    .title {
      margin: 0 0 6px;
      font-size: 26px;
      line-height: 1.2;
      font-weight: 700;
      color: #111827;
    }

    .subtitle {
      margin: 0;
      color: #4b5563;
      font-size: 13px;
    }

    .meta {
      padding: 14px 32px;
      border-bottom: 1px solid #e5e7eb;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 18px;
      background: #fafafa;
    }

    .meta-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }

    .meta-label {
      min-width: 120px;
      color: #6b7280;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      font-weight: 600;
    }

    .meta-value {
      color: #111827;
      font-size: 12px;
      font-weight: 600;
    }

    .summary {
      padding: 18px 32px 8px;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }

    .summary-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
      background: #ffffff;
    }

    .summary-value {
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      line-height: 1.1;
      margin-bottom: 6px;
    }

    .summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6b7280;
      font-weight: 600;
    }

    .content {
      padding: 8px 32px 28px;
    }

    .type-block {
      margin-top: 20px;
    }

    .type-heading {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #b45309;
      margin: 0 0 10px;
      border-bottom: 1px solid #fcd34d;
      padding-bottom: 6px;
    }

    .record-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
      background: #ffffff;
    }

    .record-head {
      padding: 12px 14px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }

    .record-head-left {
      flex: 1;
    }

    .record-date {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 700;
      color: #111827;
    }

    .record-sub {
      margin: 0;
      font-size: 11px;
      color: #6b7280;
    }

    .record-type-tag {
      margin-top: 6px;
      display: inline-block;
      padding: 4px 8px;
      border-radius: 999px;
      background: #f3f4f6;
      color: #374151;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .status {
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      white-space: nowrap;
    }

    .status.normal {
      color: #166534;
      background: #dcfce7;
      border: 1px solid #86efac;
    }

    .status.abnormal {
      color: #991b1b;
      background: #fee2e2;
      border: 1px solid #fca5a5;
    }

    .record-body {
      padding: 12px 14px;
    }

    .section {
      margin-bottom: 14px;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    .section-title {
      margin: 0 0 8px;
      color: #4b5563;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
    }

    .field-row {
      border: 1px solid #f3f4f6;
      border-radius: 6px;
      padding: 8px 10px;
      margin-bottom: 6px;
      background: #ffffff;
    }

    .field-row:last-child {
      margin-bottom: 0;
    }

    .field-label {
      color: #6b7280;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .field-value {
      color: #111827;
      font-size: 12px;
      font-weight: 600;
    }

    .list {
      margin: 0;
      padding-left: 16px;
      color: #374151;
      font-size: 12px;
    }

    .list li {
      margin-bottom: 4px;
    }

    .list li:last-child {
      margin-bottom: 0;
    }

    .text-block {
      border: 1px solid #f3f4f6;
      border-radius: 6px;
      padding: 10px;
      background: #ffffff;
      font-size: 12px;
      color: #374151;
      line-height: 1.6;
    }

    .foot-note {
      margin-top: 18px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 10px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .empty {
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      padding: 18px;
      text-align: center;
      color: #6b7280;
      background: #fafafa;
    }
  </style>
`;

const flattenRecords = (history: HistoryEntry[] | ScreeningHistory): RecordWithType[] => {
  if (Array.isArray(history)) {
    return [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const allRecords: RecordWithType[] = [];
  Object.entries(history).forEach(([screeningType, records]) => {
    records.forEach((record) => {
      allRecords.push({ ...record, screeningType });
    });
  });

  return allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const groupRecordsByType = (history: ScreeningHistory) => {
  const grouped: { [key: string]: HistoryEntry[] } = {};
  Object.entries(history).forEach(([screeningType, records]) => {
    if (records.length > 0) {
      grouped[screeningType] = [...records].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }
  });
  return grouped;
};

const renderStructuredObject = (value: unknown): string => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "object") {
    return `<div class="text-block">${escapeHtml(String(value))}</div>`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    return `
      <ul class="list">
        ${value.map((item) => `<li>${escapeHtml(String(item))}</li>`).join("")}
      </ul>
    `;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([key, entryValue]) =>
      !["id", "date", "createdAt", "wasNormal"].includes(key) &&
      entryValue !== null &&
      entryValue !== undefined &&
      entryValue !== "",
  );

  if (entries.length === 0) return "";

  return entries
    .map(([key, entryValue]) => {
      const label = normalizeLabel(key);
      if (typeof entryValue === "object") {
        return `
          <div class="field-row">
            <div class="field-label">${escapeHtml(label)}</div>
            ${renderStructuredObject(entryValue)}
          </div>
        `;
      }

      return `
        <div class="field-row">
          <div class="field-label">${escapeHtml(label)}</div>
          <div class="field-value">${escapeHtml(String(entryValue))}</div>
        </div>
      `;
    })
    .join("");
};

const renderSection = (section: DetailSection) => `
  <div class="section">
    <h4 class="section-title">${escapeHtml(section.title)}</h4>
    ${section.items
      .map((field) => {
        if (shouldRenderAsList(field.label)) {
          const values = parseListValue(field.value);
          if (values.length > 0) {
            return `
              <div class="field-row">
                <div class="field-label">${escapeHtml(field.label)}</div>
                <ul class="list">
                  ${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}
                </ul>
              </div>
            `;
          }
        }

        return `
          <div class="field-row">
            <div class="field-label">${escapeHtml(field.label)}</div>
            <div class="field-value">${escapeHtml(field.value)}</div>
          </div>
        `;
      })
      .join("")}
  </div>
`;

const renderRecord = (
  entry: RecordWithType,
  index: number,
  screeningName: string,
  showScreeningType = false,
) => {
  const parsedData = parseResultData(entry.result);
  const recordType = resolveRecordType(entry, screeningName);
  const parsedNotes =
    parsedData.type === "fields"
      ? parsedData.fields
          .filter((field) => field.label.toLowerCase() === "notes")
          .map((field) => field.value)
      : [];

  const allNotes = [...parsedNotes, entry.notes]
    .map((note) => String(note ?? "").trim())
    .filter(Boolean)
    .filter((note, noteIndex, noteList) => noteList.indexOf(note) === noteIndex);

  const canonicalResult = String(entry.result ?? "").trim().toLowerCase();
  const filteredNotes = allNotes.filter((note) => {
    const normalized = note.toLowerCase();
    if (!normalized) return false;
    if (normalized === canonicalResult) return false;
    if (normalized.startsWith("result value:")) {
      const withoutPrefix = normalized.replace(/^result value:\s*/, "");
      if (withoutPrefix === canonicalResult) return false;
    }
    return true;
  });

  const parsedNoteDetails = parseAdditionalNotes(filteredNotes);

  const mergedDetailFields =
    parsedData.type === "fields"
      ? [
          ...parsedData.fields.filter((field) => field.label.toLowerCase() !== "notes"),
          ...parsedNoteDetails.facts,
        ]
      : parsedNoteDetails.facts;

  const uniqueMergedFields = mergedDetailFields.filter((field, fieldIndex, list) => {
    const key = `${field.label}::${field.value}`.toLowerCase();
    return (
      list.findIndex(
        (candidate) => `${candidate.label}::${candidate.value}`.toLowerCase() === key,
      ) === fieldIndex
    );
  });

  const detailSections = buildDetailSections(uniqueMergedFields, recordType);

  const createdAtDisplay = formatDateSafe(entry.createdAt, "MMM dd, yyyy 'at' h:mm a");
  const dateDisplay = formatDateSafe(entry.date, "MMMM dd, yyyy");
  const timeDisplay = formatDateSafe(entry.date, "h:mm a");

  const primaryContent =
    parsedData.type === "structured"
      ? renderStructuredObject(parsedData.data)
      : detailSections.length > 0
      ? detailSections.map(renderSection).join("")
      : `
          <div class="section">
            <h4 class="section-title">Result Details</h4>
            <div class="text-block">${
              parsedData.type === "text"
                ? escapeHtml(parsedData.text)
                : escapeHtml(parsedData.rawText)
            }</div>
          </div>
        `;

  const observations =
    parsedData.type === "fields" && parsedData.flags.length > 0
      ? `
          <div class="section">
            <h4 class="section-title">Observations</h4>
            <ul class="list">
              ${parsedData.flags.map((flag) => `<li>${escapeHtml(flag)}</li>`).join("")}
            </ul>
          </div>
        `
      : "";

  const additionalNotes =
    parsedNoteDetails.bullets.length > 0
      ? `
          <div class="section">
            <h4 class="section-title">Additional Notes</h4>
            <ul class="list">
              ${parsedNoteDetails.bullets
                .map((note) => `<li>${escapeHtml(note)}</li>`)
                .join("")}
            </ul>
          </div>
        `
      : "";

  return `
    <article class="record-card">
      <header class="record-head">
        <div class="record-head-left">
          <h3 class="record-date">${escapeHtml(dateDisplay)}</h3>
          <p class="record-sub">Recorded at ${escapeHtml(timeDisplay)} • Entry #${index + 1}</p>
          ${
            showScreeningType && entry.screeningType
              ? `<span class="record-type-tag">${escapeHtml(entry.screeningType)}</span>`
              : ""
          }
        </div>
        <span class="status ${entry.wasNormal ? "normal" : "abnormal"}">
          ${entry.wasNormal ? "Normal" : "Abnormal"}
        </span>
      </header>
      <div class="record-body">
        ${primaryContent}
        ${observations}
        ${additionalNotes}
      </div>
      <div class="foot-note">
        <span>Captured: ${escapeHtml(createdAtDisplay)}</span>
        <span>Source: CheckUpp Mobile</span>
      </div>
    </article>
  `;
};

const generatePDFHTML = ({
  screeningName,
  history,
  isFullHistory = false,
  user,
}: ExportPDFOptions) => {
  const allRecords = flattenRecords(history);
  const groupedRecords =
    isFullHistory && !Array.isArray(history) ? groupRecordsByType(history) : null;

  const totalRecords = allRecords.length;
  const normalRecords = allRecords.filter((record) => record.wasNormal).length;
  const abnormalRecords = totalRecords - normalRecords;
  const generatedAt = format(new Date(), "MMMM dd, yyyy 'at' h:mm a");
  const rangeStart =
    totalRecords > 0 ? formatDateSafe(allRecords[totalRecords - 1].date, "MMM dd, yyyy") : "N/A";
  const rangeEnd =
    totalRecords > 0 ? formatDateSafe(allRecords[0].date, "MMM dd, yyyy") : "N/A";

  const recordHTML =
    totalRecords === 0
      ? `
          <div class="empty">
            No records are available for this report yet.
          </div>
        `
      : groupedRecords
      ? Object.entries(groupedRecords)
          .map(
            ([type, records]) => `
              <section class="type-block">
                <h3 class="type-heading">${escapeHtml(type)} (${records.length})</h3>
                ${records
                  .map((record, index) =>
                    renderRecord({ ...record, screeningType: type }, index, screeningName, false),
                  )
                  .join("")}
              </section>
            `,
          )
          .join("")
      : allRecords
          .map((record, index) => renderRecord(record, index, screeningName, isFullHistory))
          .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(
          isFullHistory ? `All ${screeningName}` : screeningName,
        )} History Report</title>
        ${generateStyles()}
      </head>
      <body>
        <main class="page">
          <header class="header">
            <div class="brand">CheckUpp Health Report</div>
            <h1 class="title">${escapeHtml(
              isFullHistory ? `All ${screeningName}` : screeningName,
            )}</h1>
            <p class="subtitle">Clinical history summary prepared from mobile screening records.</p>
          </header>

          <section class="meta">
            <div class="meta-item">
              <span class="meta-label">Generated</span>
              <span class="meta-value">${escapeHtml(generatedAt)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date Range</span>
              <span class="meta-value">${escapeHtml(`${rangeStart} to ${rangeEnd}`)}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Patient Name</span>
              <span class="meta-value">${escapeHtml(user?.name || "Not provided")}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Patient Email</span>
              <span class="meta-value">${escapeHtml(user?.email || "Not provided")}</span>
            </div>
          </section>

          <section class="summary">
            <div class="summary-card">
              <div class="summary-value">${totalRecords}</div>
              <div class="summary-label">Total Records</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${normalRecords}</div>
              <div class="summary-label">Normal</div>
            </div>
            <div class="summary-card">
              <div class="summary-value">${abnormalRecords}</div>
              <div class="summary-label">Abnormal</div>
            </div>
          </section>

          <section class="content">
            ${recordHTML}
          </section>

          <footer class="content" style="padding-top: 0;">
            <div class="foot-note" style="margin-top: 0;">
              <span>
                Confidential medical information. Share only with authorized healthcare providers.
              </span>
              <span>Generated by CheckUpp</span>
            </div>
          </footer>
        </main>
      </body>
    </html>
  `;
};

export const exportToPDF = async (options: ExportPDFOptions): Promise<void> => {
  try {
    const html = generatePDFHTML(options);
    const safeTitle = options.screeningName.replace(/[^A-Za-z0-9_-]/g, "_");
    const fileName = `${options.isFullHistory ? "All_" : ""}${safeTitle}_History_${format(
      new Date(),
      "yyyy-MM-dd",
    )}.pdf`;

    const { uri } = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20,
      },
      base64: false,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
        dialogTitle: fileName,
      });
      return;
    }

    Alert.alert(
      "PDF Generated",
      "Your report has been generated and saved on this device.",
      [{ text: "OK", style: "default" }],
    );
  } catch (error) {
    console.error("Error exporting PDF:", error);
    Alert.alert(
      "Export Failed",
      "There was an error generating the PDF. Please try again.",
      [{ text: "OK", style: "default" }],
    );
  }
};

export const printToPDF = async (options: ExportPDFOptions): Promise<void> => {
  try {
    const html = generatePDFHTML(options);
    await Print.printAsync({
      html,
      width: 612,
      height: 792,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20,
      },
    });
  } catch (error) {
    console.error("Error printing PDF:", error);
    Alert.alert(
      "Print Failed",
      "There was an error printing the PDF. Please try again.",
      [{ text: "OK", style: "default" }],
    );
  }
};
