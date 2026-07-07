import { createFile, deleteFile, saveLink } from "@/lib/appwrite/userFiles";
import { queryKeys } from "@/lib/query/keys";
import useApiMutation from "@/lib/query/useApiMutation";
import { UploadDocumentForm } from "./types";

type WalletDocument = Record<string, any>;

type UploadDocumentVariables = {
  userId: string;
  form: UploadDocumentForm;
};

const getDocumentId = (document: WalletDocument | null | undefined) =>
  document?.$id || document?.id || null;

const prependWalletDocument = (
  currentDocuments: WalletDocument[] | undefined,
  nextDocument: WalletDocument,
) => {
  if (!Array.isArray(currentDocuments)) {
    return [nextDocument];
  }

  const nextId = getDocumentId(nextDocument);
  if (!nextId) {
    return [nextDocument, ...currentDocuments];
  }

  const withoutDuplicate = currentDocuments.filter(
    (document) => getDocumentId(document) !== nextId,
  );
  return [nextDocument, ...withoutDuplicate];
};

const removeWalletDocument = (
  currentDocuments: WalletDocument[] | undefined,
  documentId: string,
) => {
  if (!Array.isArray(currentDocuments)) {
    return currentDocuments ?? [];
  }

  return currentDocuments.filter(
    (document) => getDocumentId(document) !== documentId,
  );
};

const submitDocumentUpload = async ({
  form,
}: UploadDocumentVariables): Promise<WalletDocument> => {
  if (form.documentType === "eScript Link") {
    return saveLink(form);
  }

  return createFile(form);
};

export const useUploadDocumentMutation = (userId?: string | null) =>
  useApiMutation<WalletDocument, UploadDocumentVariables>({
    mutationKey: ["wallet", "documents", "upload"],
    mutationFn: submitDocumentUpload,
    showSuccessToast: true,
    getSuccessMessage: () => "Document uploaded successfully",
    invalidateQueries: [
      queryKeys.wallet.files(userId),
      { queryKey: queryKeys.wallet.searchAll(userId), exact: false },
    ],
    updateQueryData: ({ data, variables, queryClient }) => {
      queryClient.setQueryData<WalletDocument[]>(
        queryKeys.wallet.files(variables.userId),
        (currentDocuments) => prependWalletDocument(currentDocuments, data),
      );
    },
  });

export const useDeleteDocumentMutation = (userId?: string | null) =>
  useApiMutation<any, string>({
    mutationKey: ["wallet", "documents", "delete"],
    mutationFn: (documentId) => deleteFile(documentId),
    showSuccessToast: true,
    getSuccessMessage: () => "File deleted successfully",
    invalidateQueries: [
      queryKeys.wallet.files(userId),
      { queryKey: queryKeys.wallet.searchAll(userId), exact: false },
    ],
    updateQueryData: ({ variables: documentId, queryClient }) => {
      queryClient.setQueryData<WalletDocument[]>(
        queryKeys.wallet.files(userId),
        (currentDocuments) => removeWalletDocument(currentDocuments, documentId),
      );
      queryClient.setQueriesData<WalletDocument[]>(
        { queryKey: queryKeys.wallet.searchAll(userId), exact: false },
        (currentDocuments) => removeWalletDocument(currentDocuments, documentId),
      );
    },
  });
