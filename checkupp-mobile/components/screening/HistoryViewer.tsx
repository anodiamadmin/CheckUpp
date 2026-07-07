import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HistoryEntry, ScreeningHistory } from "@/lib/storage/screeningStorage";
import UnifiedActionButton from "@/components/screening/UnifiedActionButton";
import { exportToPDF } from "@/lib/utils/exportPdf";
import {
  shareContent,
  getAvailableShareMethods,
  generateShareableText,
  ShareMethod,
} from "@/lib/utils/shareUtils";
import {
  scale,
  getFontSize,
  getSpacing,
  screenDimensions,
} from "@/lib/utils/responsiveUtils";
import { formatStoredDate } from "@/lib/utils/dateFormatConverter";
import { useGlobalContext } from "@/context/useAuthBootstrap";

const { height } = screenDimensions;

interface HistoryViewerProps {
  visible: boolean;
  onClose: () => void;
  screeningName: string;
  history: HistoryEntry[] | ScreeningHistory;
  onExportPDF?: () => void;
  isFullHistory?: boolean;
}

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

const HistoryViewer: React.FC<HistoryViewerProps> = ({
  visible,
  onClose,
  screeningName,
  history,
  onExportPDF,
  isFullHistory = false,
}) => {
  const { user } = useGlobalContext();
  const [isExporting, setIsExporting] = useState(false);
  const [shareMenuVisible, setShareMenuVisible] = useState(false);
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(
    new Set(),
  );
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "normal" | "abnormal"
  >("all");
  const [availableShareMethods, setAvailableShareMethods] = useState<
    ShareMethod[]
  >([]);

  // Animation for modal entrance
  const slideAnim = useState(new Animated.Value(height))[0];

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      loadShareMethods();
    } else {
      slideAnim.setValue(height);
    }
  }, [visible, slideAnim]);

  const loadShareMethods = async () => {
    const methods = await getAvailableShareMethods();
    setAvailableShareMethods(methods);
  };

  const toggleRecordExpansion = (id: string) => {
    setExpandedRecords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getAllRecords = () => {
    if (Array.isArray(history)) {
      return history.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    } else {
      const allRecords: (HistoryEntry & { screeningType: string })[] = [];

      Object.entries(history).forEach(([screeningType, records]) => {
        records.forEach((record) => {
          allRecords.push({ ...record, screeningType });
        });
      });

      return allRecords.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    }
  };

  const getGroupedRecords = () => {
    if (!isFullHistory || Array.isArray(history)) {
      return null;
    }

    const grouped: {
      [key: string]: (HistoryEntry & { screeningType: string })[];
    } = {};
    Object.entries(history).forEach(([screeningType, records]) => {
      const recordsWithType = records.map((record) => ({
        ...record,
        screeningType,
      }));

      const filteredByStatus =
        selectedFilter === "all"
          ? recordsWithType
          : recordsWithType.filter((record) => {
              const status = getRecordNormalStatus(record);
              return selectedFilter === "normal"
                ? status === true
                : status === false;
            });

      if (filteredByStatus.length === 0) return;

      grouped[screeningType] = filteredByStatus.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );
    });

    return grouped;
  };

  const getRecordNormalStatus = (
    entry: Pick<HistoryEntry, "wasNormal" | "result">,
  ): boolean | null => {
    if (typeof entry.wasNormal === "boolean") {
      return entry.wasNormal;
    }

    const resultText = String(entry.result ?? "")
      .trim()
      .toLowerCase();
    if (!resultText) return null;

    if (
      resultText.includes("abnormal") ||
      resultText.includes("not normal") ||
      resultText.includes("book an appointment") ||
      resultText.includes("discuss testing")
    ) {
      return false;
    }

    if (resultText.includes("normal")) {
      return true;
    }

    return null;
  };

  const getRecordDisplayState = (
    entry: Pick<HistoryEntry, "wasNormal" | "result">,
  ): {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    backgroundColor: string;
    textColor: string;
    tone: "normal" | "attention" | "booked" | "neutral";
  } => {
    const resultText = String(entry.result ?? "")
      .trim()
      .toLowerCase();

    if (resultText.includes("appointment booked")) {
      return {
        label: "Booked",
        icon: "calendar-clear",
        backgroundColor: "#EFF6FF",
        textColor: "#2563EB",
        tone: "booked",
      };
    }

    if (
      resultText.includes("book an appointment") ||
      resultText.includes("discuss testing")
    ) {
      return {
        label: "Follow-up",
        icon: "alert-circle",
        backgroundColor: "#FEF3C7",
        textColor: "#D97706",
        tone: "attention",
      };
    }

    const normalStatus = getRecordNormalStatus(entry);
    if (normalStatus === true) {
      return {
        label: "Normal",
        icon: "checkmark-circle",
        backgroundColor: "#ECFDF5",
        textColor: "#059669",
        tone: "normal",
      };
    }

    if (normalStatus === false) {
      return {
        label: "Abnormal",
        icon: "alert-circle",
        backgroundColor: "#FEF2F2",
        textColor: "#DC2626",
        tone: "attention",
      };
    }

    return {
      label: "Recorded",
      icon: "document-text",
      backgroundColor: "#F3F4F6",
      textColor: "#6B7280",
      tone: "neutral",
    };
  };

  const allRecords = getAllRecords();
  const groupedRecords = getGroupedRecords();

  // Apply filter
  const filteredRecords =
    selectedFilter === "all"
      ? allRecords
      : allRecords.filter((record) => {
          const status = getRecordNormalStatus(record);
          return selectedFilter === "normal"
            ? status === true
            : status === false;
        });

  const totalRecords = allRecords.length;
  const normalCount = allRecords.filter(
    (record) => getRecordNormalStatus(record) === true,
  ).length;
  const abnormalCount = allRecords.filter(
    (record) => getRecordNormalStatus(record) === false,
  ).length;

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

  // Parse result data intelligently
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
      // no-op: fall through to delimited parsing
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

  const getSummaryText = (parsed: ParsedResult) => {
    if (parsed.type === "text") {
      return parsed.text;
    }

    if (parsed.type === "structured") {
      return "Structured result available. Tap to view all details.";
    }

    const summaryFields = parsed.fields.filter(
      (field) => field.label.toLowerCase() !== "notes",
    );

    const fieldSummary = summaryFields
      .slice(0, 2)
      .map((field) => `${field.label}: ${field.value}`)
      .join(" | ");

    if (fieldSummary) {
      const hiddenCount = summaryFields.length + parsed.flags.length - 2;
      return hiddenCount > 0
        ? `${fieldSummary} (+${hiddenCount} more)`
        : fieldSummary;
    }

    return parsed.rawText;
  };

  const renderDataField = (label: string, value: unknown, unit?: string) => {
    if (value === undefined || value === null || value === "") return null;

    const displayValue =
      typeof value === "boolean"
        ? value
          ? "Yes"
          : "No"
        : typeof value === "string"
          ? value
          : String(value);

    return (
      <View
        className="bg-white rounded-lg border border-gray-100"
        style={{
          paddingHorizontal: scale(12),
          paddingVertical: getSpacing(10),
          marginBottom: getSpacing(8),
        }}
      >
        <Text
          className="font-pmedium text-gray-600"
          style={{
            fontSize: getFontSize(11),
            marginBottom: getSpacing(4),
            textTransform: "uppercase",
          }}
        >
          {label}
        </Text>
        <Text
          className="font-psemibold text-gray-900"
          style={{ fontSize: getFontSize(13), lineHeight: getFontSize(19) }}
        >
          {displayValue}
          {unit && (
            <Text
              className="font-pregular text-gray-500"
              style={{ fontSize: getFontSize(11) }}
            >
              {" "}
              {unit}
            </Text>
          )}
        </Text>
      </View>
    );
  };

  const renderStructuredData = (data: any) => {
    if (!data || typeof data !== "object") return null;

    return Object.entries(data).map(([key, value]) => {
      // Skip metadata fields
      if (["id", "date", "createdAt", "wasNormal"].includes(key)) return null;

      // Format the label
      const label = normalizeLabel(key);

      if (Array.isArray(value)) {
        if (value.length === 0) return null;
        return renderDataField(label, value.join(", "));
      }

      // Handle nested objects
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        return (
          <View key={key} style={{ marginBottom: getSpacing(12) }}>
            <Text
              className="font-psemibold text-gray-700"
              style={{
                fontSize: getFontSize(13),
                marginBottom: getSpacing(8),
              }}
            >
              {label}
            </Text>
            <View
              style={{
                paddingLeft: scale(12),
                borderLeftWidth: 2,
                borderLeftColor: "#FF9C01",
              }}
            >
              {renderStructuredData(value)}
            </View>
          </View>
        );
      }

      return renderDataField(label, value);
    });
  };

  const renderFlagBadges = (flags: string[]) => {
    if (flags.length === 0) return null;

    return (
      <View style={{ marginBottom: getSpacing(12) }}>
        <Text
          className="font-psemibold text-gray-700"
          style={{
            fontSize: getFontSize(11),
            marginBottom: getSpacing(8),
            textTransform: "uppercase",
          }}
        >
          Observations
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: scale(6) }}>
          {flags.map((flag, flagIndex) => (
            <View
              key={`${flag}-${flagIndex}`}
              className="rounded-full bg-blue-50 border border-blue-100"
              style={{
                paddingHorizontal: scale(10),
                paddingVertical: getSpacing(5),
              }}
            >
              <Text
                className="font-pmedium text-blue-700"
                style={{ fontSize: getFontSize(11) }}
              >
                {flag}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const resolveRecordType = (
    entry: HistoryEntry & { screeningType?: string },
  ) => {
    const source = entry.screeningType || screeningName || "";
    return source.toLowerCase();
  };

  const classifyFieldSection = (label: string, recordType: string) => {
    const normalized = label.toLowerCase();

    if (normalized.includes("note")) return "Care Notes";

    if (/(symptom|gum issues)/.test(normalized)) {
      return "Symptoms";
    }

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

    if (
      /(fasting|random|post-meal|hba1c|ketones|bmi|glucose)/.test(normalized)
    ) {
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
      return [
        "Screening Results",
        "Risk & Lifestyle",
        "Care Notes",
        "Other Details",
      ];
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

  const buildDetailSections = (
    fields: ParsedField[],
    recordType: string,
  ): DetailSection[] => {
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

  const parseListValue = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  const shouldRenderAsPills = (label: string) =>
    /symptom|gum issues|observations?/i.test(label);

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
            separatorIndex > 0 &&
            separatorIndex < 45 &&
            !line.startsWith("http");

          if (looksLikeField) {
            pushFact(
              line.slice(0, separatorIndex),
              line.slice(separatorIndex + 1),
            );
            return;
          }

          pushBullet(line);
          return;
        }

        chunks.forEach((chunk) => {
          const separatorIndex = chunk.indexOf(":");
          const looksLikeField =
            separatorIndex > 0 &&
            separatorIndex < 45 &&
            !chunk.startsWith("http");

          if (looksLikeField) {
            pushFact(
              chunk.slice(0, separatorIndex),
              chunk.slice(separatorIndex + 1),
            );
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
        list.findIndex(
          (candidate) => candidate.toLowerCase() === bullet.toLowerCase(),
        ) === index,
    );

    return {
      facts: uniqueFacts,
      bullets: uniqueBullets,
    };
  };

  const getScreeningIcon = (screeningType: string) => {
    const type = screeningType.toLowerCase();
    if (type.includes("cancer")) return "medical-outline";
    if (type.includes("cardiovascular") || type.includes("heart"))
      return "heart-outline";
    if (type.includes("diabetes")) return "analytics-outline";
    if (type.includes("vision")) return "eye-outline";
    if (type.includes("dental")) return "flash-outline";
    if (type.includes("mental")) return "heart-circle-outline";
    return "fitness-outline";
  };

  const getScreeningColor = (screeningType: string) => {
    const type = screeningType.toLowerCase();
    if (type.includes("cancer")) return "#EF4444";
    if (type.includes("cardiovascular") || type.includes("heart"))
      return "#FF9C01";
    if (type.includes("diabetes")) return "#3B82F6";
    if (type.includes("vision")) return "#8B5CF6";
    if (type.includes("dental")) return "#10B981";
    if (type.includes("mental")) return "#EC4899";
    return "#FF9C01";
  };

  const handleExportPDF = async () => {
    if (onExportPDF) {
      onExportPDF();
      return;
    }

    setIsExporting(true);
    try {
      await exportToPDF({
        screeningName,
        history,
        isFullHistory,
        user: user
          ? {
              name: user.name,
              email: user.email,
              $id: user.$id,
            }
          : undefined,
      });
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Enhanced share function with multiple options
  const handleShare = async (method?: string) => {
    setShareMenuVisible(false);

    if (!method || method === "pdf") {
      // Generate and share PDF (existing functionality)
      await handleExportPDF();
      return;
    }

    try {
      if (method === "text") {
        // Share as text summary
        const shareableText = generateShareableText(
          screeningName,
          filteredRecords.length,
          isFullHistory,
          filteredRecords,
        );

        await shareContent({
          type: "text",
          title: `${
            isFullHistory ? `All ${screeningName}` : screeningName
          } - Medical History`,
          content: shareableText,
          subject: `My ${screeningName} Health Records (${filteredRecords.length} records)`,
          body: shareableText,
        });
      } else {
        // Use specific sharing method
        const shareableText = generateShareableText(
          screeningName,
          filteredRecords.length,
          isFullHistory,
          filteredRecords,
        );

        await shareContent(
          {
            type: "text",
            title: `${
              isFullHistory ? `All ${screeningName}` : screeningName
            } - Medical History`,
            content: shareableText,
            subject: `My ${screeningName} Health Records (${filteredRecords.length} records)`,
            body: shareableText,
          },
          method,
        );
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Share Failed", "Unable to share content. Please try again.");
    }
  };

  const renderRecord = (
    entry: HistoryEntry & { screeningType?: string },
    index: number,
    showScreeningType: boolean = false,
  ) => {
    const isExpanded = expandedRecords.has(entry.id);
    const parsedData = parseResultData(entry.result);
    const summaryText = getSummaryText(parsedData);
    const recordType = resolveRecordType(entry);
    const parsedNotes =
      parsedData.type === "fields"
        ? parsedData.fields
            .filter((field) => field.label.toLowerCase() === "notes")
            .map((field) => field.value)
        : [];
    const allNotes = [...parsedNotes, entry.notes]
      .map((note) => String(note ?? "").trim())
      .filter(Boolean)
      .filter(
        (note, noteIndex, noteList) => noteList.indexOf(note) === noteIndex,
      );
    const canonicalResult = String(entry.result ?? "")
      .trim()
      .toLowerCase();
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
            ...parsedData.fields.filter(
              (field) => field.label.toLowerCase() !== "notes",
            ),
            ...parsedNoteDetails.facts,
          ]
        : parsedNoteDetails.facts;

    const uniqueMergedFields = mergedDetailFields.filter(
      (field, fieldIndex, list) => {
        const key = `${field.label}::${field.value}`.toLowerCase();
        return (
          list.findIndex(
            (candidate) =>
              `${candidate.label}::${candidate.value}`.toLowerCase() === key,
          ) === fieldIndex
        );
      },
    );

    const detailSections = buildDetailSections(uniqueMergedFields, recordType);
    const screeningColor = entry.screeningType
      ? getScreeningColor(entry.screeningType)
      : "#FF9C01";
    const displayState = getRecordDisplayState(entry);
    const isNormal = displayState.tone === "normal";
    const isAttention = displayState.tone === "attention";

    return (
      <TouchableOpacity
        key={entry.id}
        activeOpacity={0.7}
        onPress={() => toggleRecordExpansion(entry.id)}
        className="rounded-xl overflow-hidden"
        style={{
          marginBottom: getSpacing(12),
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: isNormal
            ? "#E5E7EB"
            : isAttention
              ? "#FEE2E2"
              : "#E5E7EB",
        }}
      >
        {/* Header Section */}
        <View
          style={{
            backgroundColor: isNormal
              ? "#F3FEF5"
              : isAttention
                ? "#FFF5F5"
                : "#FAFAFA",
            borderBottomWidth: 1,
            borderBottomColor: isNormal
              ? "#E5E7EB"
              : isAttention
                ? "#FEE2E2"
                : "#E5E7EB",
            paddingHorizontal: scale(16),
            paddingVertical: getSpacing(12),
          }}
        >
          <View className="flex-row items-center justify-between">
            {/* Left: Type & Date */}
            <View className="flex-1">
              {showScreeningType && entry.screeningType && (
                <View
                  className="flex-row items-center"
                  style={{ marginBottom: getSpacing(4) }}
                >
                  <View
                    className="rounded-full items-center justify-center"
                    style={{
                      width: scale(20),
                      height: scale(20),
                      backgroundColor: `${screeningColor}20`,
                      marginRight: scale(6),
                    }}
                  >
                    <Ionicons
                      name={getScreeningIcon(entry.screeningType) as any}
                      size={scale(11)}
                      color={screeningColor}
                    />
                  </View>
                  <Text
                    className="font-psemibold"
                    style={{
                      fontSize: getFontSize(12),
                      color: screeningColor,
                    }}
                  >
                    {entry.screeningType}
                  </Text>
                </View>
              )}
              <View className="flex-row items-center">
                <Ionicons
                  name="calendar-outline"
                  size={scale(14)}
                  color="#6B7280"
                  style={{ marginRight: scale(6) }}
                />
                <Text
                  className="font-pmedium text-gray-700"
                  style={{ fontSize: getFontSize(13) }}
                >
                  {formatStoredDate(entry.date, "MMM dd, yyyy") || entry.date}
                </Text>
              </View>
            </View>

            {/* Right: Status Badge */}
            <View className="flex-row items-center" style={{ gap: scale(8) }}>
              <View
                className="rounded-full"
                style={{
                  paddingHorizontal: scale(12),
                  paddingVertical: scale(6),
                  backgroundColor: displayState.backgroundColor,
                  borderWidth: 1,
                  borderColor: `${displayState.textColor}22`,
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name={displayState.icon}
                    size={scale(14)}
                    color={displayState.textColor}
                    style={{ marginRight: scale(4) }}
                  />
                  <Text
                    className="font-psemibold"
                    style={{
                      fontSize: getFontSize(11),
                      color: displayState.textColor,
                    }}
                  >
                    {displayState.label}
                  </Text>
                </View>
              </View>

              {/* Expand Icon */}
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={scale(18)}
                color="#9CA3AF"
              />
            </View>
          </View>
        </View>

        {/* Content Section - Always visible summary */}
        <View
          style={{
            paddingHorizontal: scale(16),
            paddingVertical: getSpacing(12),
          }}
        >
          {/* Quick Summary */}
          {!isExpanded && (
            <View>
              <Text
                className="font-pregular text-gray-600"
                style={{
                  fontSize: getFontSize(12),
                  lineHeight: getFontSize(18),
                }}
                numberOfLines={2}
              >
                {summaryText.length > 110
                  ? `${summaryText.substring(0, 110)}...`
                  : summaryText}
              </Text>
              <Text
                className="font-pmedium"
                style={{
                  fontSize: getFontSize(11),
                  color: "#FF9C01",
                  marginTop: getSpacing(6),
                }}
              >
                Tap to see details
              </Text>
            </View>
          )}

          {/* Expanded Details */}
          {isExpanded && (
            <View>
              {/* Structured Data Display */}
              {parsedData.type === "structured" ? (
                <View style={{ marginBottom: getSpacing(12) }}>
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(12) }}
                  >
                    <View className="h-px bg-gray-200 flex-1" />
                    <Text
                      className="font-psemibold text-gray-600 uppercase tracking-wide"
                      style={{
                        fontSize: getFontSize(10),
                        paddingHorizontal: scale(12),
                      }}
                    >
                      Test Results
                    </Text>
                    <View className="h-px bg-gray-200 flex-1" />
                  </View>
                  {renderStructuredData(parsedData.data)}
                </View>
              ) : detailSections.length > 0 ? (
                <View style={{ marginBottom: getSpacing(12) }}>
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(12) }}
                  >
                    <View className="h-px bg-gray-200 flex-1" />
                    <Text
                      className="font-psemibold text-gray-600 uppercase tracking-wide"
                      style={{
                        fontSize: getFontSize(10),
                        paddingHorizontal: scale(12),
                      }}
                    >
                      Clinical Breakdown
                    </Text>
                    <View className="h-px bg-gray-200 flex-1" />
                  </View>
                  {detailSections.map((section) => (
                    <View
                      key={section.title}
                      style={{ marginBottom: getSpacing(12) }}
                    >
                      <Text
                        className="font-psemibold text-gray-700"
                        style={{
                          fontSize: getFontSize(11),
                          marginBottom: getSpacing(8),
                          textTransform: "uppercase",
                        }}
                      >
                        {section.title}
                      </Text>
                      {section.items.map((field, fieldIndex) => {
                        if (shouldRenderAsPills(field.label)) {
                          const values = parseListValue(field.value);
                          return (
                            <View
                              key={`${section.title}-${field.label}-${fieldIndex}`}
                              style={{ marginBottom: getSpacing(8) }}
                            >
                              <Text
                                className="font-pmedium text-gray-600"
                                style={{
                                  fontSize: getFontSize(11),
                                  marginBottom: getSpacing(6),
                                  textTransform: "uppercase",
                                }}
                              >
                                {field.label}
                              </Text>
                              <View
                                className="flex-row flex-wrap"
                                style={{ gap: scale(6) }}
                              >
                                {values.map((value, valueIndex) => (
                                  <View
                                    key={`${field.label}-${value}-${valueIndex}`}
                                    className="rounded-full border border-orange-100 bg-orange-50"
                                    style={{
                                      paddingHorizontal: scale(10),
                                      paddingVertical: getSpacing(5),
                                    }}
                                  >
                                    <Text
                                      className="font-pmedium text-orange-700"
                                      style={{ fontSize: getFontSize(11) }}
                                    >
                                      {value}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            </View>
                          );
                        }

                        return (
                          <View
                            key={`${section.title}-${field.label}-${fieldIndex}`}
                          >
                            {renderDataField(field.label, field.value)}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                  {parsedData.type === "fields" &&
                    renderFlagBadges(parsedData.flags)}
                </View>
              ) : (
                <View
                  className="bg-gray-50 rounded-lg"
                  style={{
                    padding: scale(12),
                    marginBottom: getSpacing(12),
                  }}
                >
                  <Text
                    className="font-psemibold text-gray-700"
                    style={{
                      fontSize: getFontSize(11),
                      marginBottom: getSpacing(6),
                    }}
                  >
                    Result Details
                  </Text>
                  <Text
                    className="font-pregular text-gray-700"
                    style={{
                      fontSize: getFontSize(12),
                      lineHeight: getFontSize(18),
                    }}
                  >
                    {parsedData.type === "text"
                      ? parsedData.text
                      : parsedData.rawText}
                  </Text>
                </View>
              )}

              {/* Notes Section */}
              {parsedNoteDetails.bullets.length > 0 && (
                <View
                  className="bg-orange-50 rounded-lg border border-orange-100"
                  style={{
                    padding: scale(12),
                    marginBottom: getSpacing(12),
                  }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ marginBottom: getSpacing(6) }}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={scale(14)}
                      color="#FF9C01"
                      style={{ marginRight: scale(6) }}
                    />
                    <Text
                      className="font-psemibold"
                      style={{
                        fontSize: getFontSize(11),
                        color: "#FF9C01",
                      }}
                    >
                      Additional Notes
                    </Text>
                  </View>
                  <View>
                    {parsedNoteDetails.bullets.map((bullet, bulletIndex) => (
                      <View
                        key={`${bullet}-${bulletIndex}`}
                        className="flex-row"
                        style={{
                          alignItems: "flex-start",
                          marginBottom: getSpacing(6),
                        }}
                      >
                        <View
                          className="rounded-full bg-orange-400"
                          style={{
                            width: scale(6),
                            height: scale(6),
                            marginTop: getSpacing(6),
                            marginRight: scale(8),
                          }}
                        />
                        <Text
                          className="font-pregular text-gray-700"
                          style={{
                            flex: 1,
                            fontSize: getFontSize(12),
                            lineHeight: getFontSize(18),
                          }}
                        >
                          {bullet}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Metadata Footer */}
              <View
                className="flex-row items-center justify-between bg-gray-50 rounded-lg"
                style={{
                  paddingHorizontal: scale(10),
                  paddingVertical: getSpacing(8),
                }}
              >
                <View className="flex-row items-center">
                  <Ionicons
                    name="time-outline"
                    size={scale(12)}
                    color="#9CA3AF"
                    style={{ marginRight: scale(4) }}
                  />
                  <Text
                    className="font-pregular text-gray-500"
                    style={{ fontSize: getFontSize(10) }}
                  >
                    {formatStoredDate(entry.createdAt, "MMM dd 'at' h:mm a") ||
                      entry.createdAt}
                  </Text>
                </View>
                <View
                  className="rounded-full"
                  style={{
                    paddingHorizontal: scale(8),
                    paddingVertical: scale(3),
                    backgroundColor: "#FFF5E6",
                  }}
                >
                  <Text
                    className="font-pmedium"
                    style={{
                      fontSize: getFontSize(9),
                      color: "#FF9C01",
                    }}
                  >
                    #{index + 1}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50">
        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            className="bg-white rounded-t-3xl shadow-2xl"
            style={{
              marginTop: height * 0.1,
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Modern Header with Gradient Effect */}
            <View
              style={{
                backgroundColor: "#FF9C01",
                paddingTop: getSpacing(20),
                paddingBottom: getSpacing(16),
                paddingHorizontal: scale(20),
                borderBottomLeftRadius: scale(24),
                borderBottomRightRadius: scale(24),
              }}
            >
              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                className="absolute rounded-full bg-white/20 items-center justify-center"
                style={{
                  top: getSpacing(20),
                  right: scale(20),
                  width: scale(36),
                  height: scale(36),
                  zIndex: 10,
                }}
              >
                <Ionicons name="close" size={scale(20)} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Title Section */}
              <View
                className="flex-row items-center"
                style={{ marginBottom: getSpacing(12) }}
              >
                <View
                  className="rounded-full items-center justify-center"
                  style={{
                    width: scale(48),
                    height: scale(48),
                    backgroundColor: "rgba(255,255,255,0.2)",
                    marginRight: scale(12),
                  }}
                >
                  <Ionicons
                    name={isFullHistory ? "library-outline" : "time-outline"}
                    size={scale(24)}
                    color="#FFFFFF"
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className="font-psemibold text-white"
                    style={{ fontSize: getFontSize(20) }}
                  >
                    {isFullHistory ? "All Screenings" : screeningName}
                  </Text>
                  <Text
                    className="font-pregular"
                    style={{ fontSize: getFontSize(13), color: "#FFFFFF90" }}
                  >
                    Medical History Records
                  </Text>
                </View>
              </View>

              {/* Stats Cards */}
              <View className="flex-row" style={{ gap: scale(10) }}>
                <View
                  className="flex-1 bg-white/10 rounded-xl"
                  style={{ padding: scale(12) }}
                >
                  <Text
                    className="font-psemibold text-white"
                    style={{ fontSize: getFontSize(22) }}
                  >
                    {totalRecords}
                  </Text>
                  <Text
                    className="font-pregular"
                    style={{ fontSize: getFontSize(11), color: "#FFFFFF90" }}
                  >
                    Total Records
                  </Text>
                </View>
                <View
                  className="flex-1 bg-white/10 rounded-xl"
                  style={{ padding: scale(12) }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ gap: scale(4) }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={scale(16)}
                      color="#FFFFFF"
                    />
                    <Text
                      className="font-psemibold text-white"
                      style={{ fontSize: getFontSize(18) }}
                    >
                      {normalCount}
                    </Text>
                  </View>
                  <Text
                    className="font-pregular"
                    style={{ fontSize: getFontSize(11), color: "#FFFFFF90" }}
                  >
                    Normal
                  </Text>
                </View>
                <View
                  className="flex-1 bg-white/10 rounded-xl"
                  style={{ padding: scale(12) }}
                >
                  <View
                    className="flex-row items-center"
                    style={{ gap: scale(4) }}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={scale(16)}
                      color="#FFFFFF"
                    />
                    <Text
                      className="font-psemibold text-white"
                      style={{ fontSize: getFontSize(18) }}
                    >
                      {abnormalCount}
                    </Text>
                  </View>
                  <Text
                    className="font-pregular"
                    style={{ fontSize: getFontSize(11), color: "#FFFFFF90" }}
                  >
                    Abnormal
                  </Text>
                </View>
              </View>
            </View>

            {/* Filter Tabs */}
            {totalRecords > 0 && (
              <View
                className="flex-row border-b border-gray-200"
                style={{
                  paddingHorizontal: scale(20),
                  paddingTop: getSpacing(16),
                  gap: scale(8),
                }}
              >
                {[
                  { key: "all", label: "All", count: totalRecords },
                  { key: "normal", label: "Normal", count: normalCount },
                  { key: "abnormal", label: "Abnormal", count: abnormalCount },
                ].map((filter) => (
                  <TouchableOpacity
                    key={filter.key}
                    onPress={() =>
                      setSelectedFilter(filter.key as typeof selectedFilter)
                    }
                    className="items-center"
                    style={{
                      paddingBottom: getSpacing(12),
                      borderBottomWidth: 2,
                      borderBottomColor:
                        selectedFilter === filter.key
                          ? "#FF9C01"
                          : "transparent",
                      flex: 1,
                    }}
                  >
                    <Text
                      className={`font-pmedium ${
                        selectedFilter === filter.key
                          ? "text-gray-900"
                          : "text-gray-500"
                      }`}
                      style={{ fontSize: getFontSize(13) }}
                    >
                      {filter.label}
                    </Text>
                    <Text
                      className={`font-psemibold ${
                        selectedFilter === filter.key
                          ? "text-gray-900"
                          : "text-gray-400"
                      }`}
                      style={{ fontSize: getFontSize(12) }}
                    >
                      ({filter.count})
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* History List */}
            <View className="flex-1" style={{ paddingHorizontal: scale(20) }}>
              {filteredRecords.length === 0 ? (
                <View
                  className="flex-1 justify-center items-center"
                  style={{ paddingVertical: getSpacing(40) }}
                >
                  <View
                    className="rounded-full bg-gray-100 items-center justify-center"
                    style={{
                      width: scale(80),
                      height: scale(80),
                      marginBottom: getSpacing(16),
                    }}
                  >
                    <Ionicons
                      name="document-outline"
                      size={scale(36)}
                      color="#9CA3AF"
                    />
                  </View>
                  <Text
                    className="font-pmedium text-gray-800"
                    style={{ fontSize: getFontSize(15) }}
                  >
                    No Records Found
                  </Text>
                  <Text
                    className="font-pregular text-gray-500 text-center"
                    style={{
                      fontSize: getFontSize(12),
                      marginTop: getSpacing(6),
                      paddingHorizontal: scale(40),
                    }}
                  >
                    {selectedFilter !== "all"
                      ? `No ${selectedFilter} records available`
                      : "No screening records available yet"}
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={{ flex: 1 }}
                  contentContainerStyle={{
                    paddingTop: getSpacing(16),
                    paddingBottom: getSpacing(16),
                  }}
                >
                  {isFullHistory && groupedRecords
                    ? // Show grouped records by screening type
                      Object.entries(groupedRecords).map(
                        ([screeningType, records], groupIndex) => (
                          <View
                            key={screeningType}
                            style={{ marginBottom: getSpacing(20) }}
                          >
                            {/* Section Header */}
                            <View
                              className="flex-row items-center"
                              style={{ marginBottom: getSpacing(12) }}
                            >
                              <View className="h-px bg-gray-200 flex-1" />
                              <View
                                className="flex-row items-center bg-gray-50 rounded-full"
                                style={{
                                  paddingHorizontal: scale(12),
                                  paddingVertical: getSpacing(6),
                                }}
                              >
                                <Ionicons
                                  name={getScreeningIcon(screeningType) as any}
                                  size={scale(14)}
                                  color="#FF9C01"
                                />
                                <Text
                                  className="font-psemibold text-gray-700 uppercase tracking-wide"
                                  style={{
                                    fontSize: getFontSize(11),
                                    marginLeft: scale(6),
                                  }}
                                >
                                  {screeningType}
                                </Text>
                                <Text
                                  className="font-pmedium text-gray-500"
                                  style={{
                                    fontSize: getFontSize(10),
                                    marginLeft: scale(6),
                                  }}
                                >
                                  ({records.length})
                                </Text>
                              </View>
                              <View className="h-px bg-gray-200 flex-1" />
                            </View>

                            {/* Records for this screening type */}
                            {records.map((record, index) =>
                              renderRecord(record, index, false),
                            )}
                          </View>
                        ),
                      )
                    : // Show filtered records chronologically
                      filteredRecords.map((record, index) =>
                        renderRecord(record, index, isFullHistory),
                      )}
                </ScrollView>
              )}
            </View>

            {/* Enhanced Share Section */}
            {totalRecords > 0 && (
              <View
                className="border-t border-gray-200"
                style={{
                  paddingHorizontal: scale(20),
                  paddingTop: getSpacing(16),
                  paddingBottom: getSpacing(16),
                }}
              >
                {/* Share Menu */}
                {shareMenuVisible && (
                  <View
                    className="bg-gray-50 rounded-2xl border border-gray-200"
                    style={{
                      padding: scale(16),
                      marginBottom: getSpacing(12),
                    }}
                  >
                    <Text
                      className="font-psemibold text-gray-800"
                      style={{
                        fontSize: getFontSize(14),
                        marginBottom: getSpacing(12),
                      }}
                    >
                      Export Options
                    </Text>

                    <View
                      className="flex-row flex-wrap"
                      style={{ gap: scale(8) }}
                    >
                      {/* PDF Export */}
                      <TouchableOpacity
                        onPress={() => handleShare("pdf")}
                        className="items-center flex-1"
                        style={{
                          backgroundColor: "#FFF5E6",
                          padding: scale(12),
                          borderRadius: scale(12),
                          minWidth: scale(70),
                        }}
                      >
                        <View
                          className="rounded-full items-center justify-center"
                          style={{
                            width: scale(36),
                            height: scale(36),
                            backgroundColor: "#FF9C01",
                            marginBottom: getSpacing(6),
                          }}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={scale(18)}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text
                          className="font-pmedium text-gray-700 text-center"
                          style={{ fontSize: getFontSize(11) }}
                        >
                          PDF Report
                        </Text>
                      </TouchableOpacity>

                      {/* Text Summary */}
                      <TouchableOpacity
                        onPress={() => handleShare("text")}
                        className="items-center flex-1"
                        style={{
                          backgroundColor: "#EFF6FF",
                          padding: scale(12),
                          borderRadius: scale(12),
                          minWidth: scale(70),
                        }}
                      >
                        <View
                          className="rounded-full items-center justify-center"
                          style={{
                            width: scale(36),
                            height: scale(36),
                            backgroundColor: "#3B82F6",
                            marginBottom: getSpacing(6),
                          }}
                        >
                          <Ionicons
                            name="text-outline"
                            size={scale(18)}
                            color="#FFFFFF"
                          />
                        </View>
                        <Text
                          className="font-pmedium text-gray-700 text-center"
                          style={{ fontSize: getFontSize(11) }}
                        >
                          Summary
                        </Text>
                      </TouchableOpacity>

                      {/* Email */}
                      {availableShareMethods.find((m) => m.id === "email") && (
                        <TouchableOpacity
                          onPress={() => handleShare("email")}
                          className="items-center flex-1"
                          style={{
                            backgroundColor: "#ECFDF5",
                            padding: scale(12),
                            borderRadius: scale(12),
                            minWidth: scale(70),
                          }}
                        >
                          <View
                            className="rounded-full items-center justify-center"
                            style={{
                              width: scale(36),
                              height: scale(36),
                              backgroundColor: "#059669",
                              marginBottom: getSpacing(6),
                            }}
                          >
                            <Ionicons
                              name="mail-outline"
                              size={scale(18)}
                              color="#FFFFFF"
                            />
                          </View>
                          <Text
                            className="font-pmedium text-gray-700 text-center"
                            style={{ fontSize: getFontSize(11) }}
                          >
                            Email
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Main Share Button */}
                <UnifiedActionButton
                  title={shareMenuVisible ? "Close Menu" : "Export & Share"}
                  onPress={() => setShareMenuVisible(!shareMenuVisible)}
                  variant={shareMenuVisible ? "outline" : "primary"}
                  icon={shareMenuVisible ? "close-outline" : "share-outline"}
                  loading={isExporting}
                  disabled={isExporting}
                />
              </View>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default HistoryViewer;
