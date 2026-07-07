import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import * as Clipboard from "expo-clipboard";
import { Alert, Platform, Share } from "react-native";
import { format } from "date-fns";
import { HistoryEntry, ScreeningHistory } from "@/lib/storage/screeningStorage";

export interface ShareOptions {
  type: "pdf" | "text" | "link";
  title: string;
  content?: string;
  fileUri?: string;
  filename?: string;
  subject?: string;
  body?: string;
  recipients?: string[];
}

export interface ShareMethod {
  id: string;
  name: string;
  icon: string;
  available: boolean;
}

// Get available sharing methods
export const getAvailableShareMethods = async (): Promise<ShareMethod[]> => {
  const methods: ShareMethod[] = [
    {
      id: "native",
      name: "Share Menu",
      icon: "share-outline",
      available: await Sharing.isAvailableAsync(),
    },
    {
      id: "email",
      name: "Email",
      icon: "mail-outline",
      available: await MailComposer.isAvailableAsync(),
    },
    {
      id: "copy",
      name: "Copy Link",
      icon: "copy-outline",
      available: true,
    },
    {
      id: "save",
      name: "Save to Files",
      icon: "download-outline",
      available: Platform.OS === "ios",
    },
  ];

  return methods.filter((method) => method.available);
};

// Enhanced sharing function
export const shareContent = async (
  options: ShareOptions,
  method?: string
): Promise<void> => {
  try {
    switch (method || "native") {
      case "email":
        await shareViaEmail(options);
        break;

      case "copy":
        await shareCopyToClipboard(options);
        break;

      case "save":
        await saveToFiles(options);
        break;

      case "native":
      default:
        await shareViaNativeMenu(options);
        break;
    }
  } catch (error) {
    console.error("Share error:", error);
    Alert.alert(
      "Share Failed",
      "Unable to share content. Please try a different method.",
      [{ text: "OK" }]
    );
  }
};

// Share via native sharing menu
const shareViaNativeMenu = async (options: ShareOptions): Promise<void> => {
  const { type, title, content, fileUri } = options;

  if (type === "pdf" && fileUri) {
    await Sharing.shareAsync(fileUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: title,
    });
  } else if (type === "text" && content) {
    await Share.share({
      title,
      message: content,
    });
  } else if (type === "link" && content) {
    await Share.share({
      title,
      message: content,
      url: content,
    });
  }
};

// Share via email
const shareViaEmail = async (options: ShareOptions): Promise<void> => {
  const { type, title, content, fileUri, subject, body, recipients } = options;

  const emailOptions: MailComposer.MailComposerOptions = {
    subject: subject || title,
    body: body || content || "",
    isHtml: false,
    recipients,
  };

  if (type === "pdf" && fileUri) {
    emailOptions.attachments = [fileUri];
  }

  const result = await MailComposer.composeAsync(emailOptions);

  if (result.status === MailComposer.MailComposerStatus.SENT) {
    Alert.alert("Success", "Email sent successfully!");
  }
};

// Copy to clipboard
const shareCopyToClipboard = async (options: ShareOptions): Promise<void> => {
  const { content } = options;

  if (content) {
    await Clipboard.setStringAsync(content);
    Alert.alert("Copied", "Content copied to clipboard!");
  }
};

// Save to files (iOS) - Simplified version using native sharing
const saveToFiles = async (options: ShareOptions): Promise<void> => {
  const { fileUri, title } = options;

  if (fileUri) {
    // Use native sharing instead of trying to save to specific directory
    // This will show iOS Files app as an option
    await Sharing.shareAsync(fileUri, {
      UTI: ".pdf",
      mimeType: "application/pdf",
      dialogTitle: `Save ${title}`,
    });
  }
};

// Generate shareable summary text
export const generateShareableText = (
  screeningName: string,
  totalRecords: number,
  isFullHistory: boolean = false,
  history?: HistoryEntry[] | ScreeningHistory
): string => {
  const flattenRecords = (
    source?: HistoryEntry[] | ScreeningHistory
  ): (HistoryEntry & { screeningType?: string })[] => {
    if (!source) return [];

    if (Array.isArray(source)) {
      return [...source].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    const records: (HistoryEntry & { screeningType?: string })[] = [];
    Object.entries(source).forEach(([screeningType, entries]) => {
      entries.forEach((entry) => records.push({ ...entry, screeningType }));
    });

    return records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  };

  const toSafeDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return format(date, "MMM dd, yyyy");
  };

  const cleanText = (value: string, maxLength: number) => {
    const trimmed = value.replace(/\s+/g, " ").trim();
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.slice(0, maxLength)}...`;
  };

  const records = flattenRecords(history);
  const effectiveTotal = records.length > 0 ? records.length : totalRecords;
  const normalCount =
    records.length > 0
      ? records.filter((record) => record.wasNormal).length
      : 0;
  const abnormalCount = records.length > 0 ? effectiveTotal - normalCount : 0;

  const timestamp = format(new Date(), "MMMM dd, yyyy 'at' h:mm a");
  const reportType = isFullHistory ? `All ${screeningName}` : screeningName;
  const latestRecords =
    records.length > 0
      ? records.slice(0, 8).map((record, index) => {
          const typePrefix = record.screeningType
            ? `[${record.screeningType}] `
            : "";
          const status = record.wasNormal ? "Normal" : "Abnormal";
          const result = cleanText(record.result, 160);
          return `${index + 1}. ${toSafeDate(record.date)} | ${typePrefix}${status} | ${result}`;
        })
      : [];

  const perTypeBreakdown =
    records.length > 0
      ? Object.entries(
          records.reduce<Record<string, number>>((acc, record) => {
            const key = record.screeningType || screeningName;
            acc[key] = (acc[key] ?? 0) + 1;
            return acc;
          }, {})
        )
          .map(([type, count]) => `- ${type}: ${count}`)
          .join("\n")
      : "";

  return `
${reportType} - Medical History Report

SUMMARY:
- Total Records: ${effectiveTotal}
- Normal: ${normalCount}
- Abnormal: ${abnormalCount}
- Report Generated: ${timestamp}
- Source: CheckUpp Health Application

${perTypeBreakdown ? `BREAKDOWN BY SCREENING:\n${perTypeBreakdown}\n` : ""}${
    latestRecords.length > 0
      ? `LATEST RECORDS:\n${latestRecords.join("\n")}\n`
      : "LATEST RECORDS:\n- No record details available in this export.\n"
  }

DESCRIPTION:
This report contains personal health screening records and medical history data generated from CheckUpp.

IMPORTANT NOTICE:
This medical information is confidential and should only be shared with authorized healthcare providers. Please ensure secure handling and storage of this data in accordance with applicable privacy regulations.

For questions about this report or the CheckUpp application, please consult with your healthcare provider.

---
Generated by CheckUpp - Personal Health Management System
`.trim();
};

// Generate shareable link (if you have a web version)
// Currently commented out - uncomment and update when web app is available
/*
export const generateShareableLink = (
  screeningType: string,
  recordId?: string
): string => {
  // Replace with your actual web app URL when available
  const baseUrl = 'https://checkupp.app';
  const params = new URLSearchParams({
    type: screeningType,
    ...(recordId && { record: recordId }),
    source: 'mobile_app',
  });
  
  return `${baseUrl}/shared-record?${params.toString()}`;
};
*/
