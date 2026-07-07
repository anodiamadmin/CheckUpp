import { useState, useCallback } from "react";
import * as DocumentPicker from "expo-document-picker";
import { useUploadDocumentMutation } from "@/lib/features/documents/mutations";
import { UploadDocumentForm } from "@/lib/features/documents/types";

const DEFAULT_FORM: UploadDocumentForm = {
  title: "",
  file: null,
  documentType: "Other Document",
  fileType: "",
  link: "",
};

export const useDocumentUpload = ({
  userId,
  showToast,
  onSuccess,
}: {
  userId: string | null | undefined;
  showToast: (message: string, type: "error" | "success" | "info") => void;
  onSuccess?: () => void | Promise<void>;
}) => {
  const [visible, setVisible] = useState(false);
  const [form, setForm] = useState<UploadDocumentForm>({ ...DEFAULT_FORM });
  const uploadDocument = useUploadDocumentMutation(userId);

  const resetForm = useCallback(() => {
    setForm({ ...DEFAULT_FORM });
  }, []);

  const open = useCallback(
    (prefillTitle?: string) => {
      resetForm();
      if (prefillTitle) {
        setForm((prev) => ({ ...prev, title: prefillTitle }));
      }
      setVisible(true);
    },
    [resetForm],
  );

  const close = useCallback(() => {
    setVisible(false);
    resetForm();
  }, [resetForm]);

  const pickDocument = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled && result.assets && result.assets[0]?.uri) {
      const selected = result.assets[0];
      setForm((prev) => ({
        ...prev,
        file: {
          uri: selected.uri,
          name: selected.name,
          type: selected.mimeType,
          mimeType: selected.mimeType,
          size: selected.size ?? undefined,
        },
        fileType: "file",
      }));
    }
  }, []);

  const submit = useCallback(async () => {
    if (!userId) {
      return showToast(
        "User session unavailable. Please sign in again.",
        "error",
      );
    }

    if (!form.title || !form.documentType) {
      return showToast("Please fill all fields", "error");
    }

    if (form.documentType === "eScript Link" && !form.link) {
      return showToast("Please provide a link", "error");
    }

    if (form.documentType !== "eScript Link" && !form.file) {
      return showToast("Please select a file", "error");
    }

    try {
      await uploadDocument.mutateAsync({
        userId,
        form,
      });
      close();
      await onSuccess?.();
    } catch (error: any) {
      if (!error?.message) {
        showToast("Upload failed", "error");
      }
    }
  }, [userId, form, showToast, close, onSuccess, uploadDocument]);

  return {
    visible,
    uploading: uploadDocument.isPending,
    form,
    setForm,
    open,
    close,
    pickDocument,
    submit,
  };
};
