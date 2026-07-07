import { File } from "expo-file-system";
import { apiConfig, apiRequest, getApiAuthHeaders } from "@/lib/api/client";

const MAX_API_PAGE_SIZE = 100;
const API_PREFIX = "/api/v1";

type UploadableFile = {
  uri: string;
  name?: string;
  type?: string;
  mimeType?: string;
  size?: number | null;
  fileSize?: number | null;
};

interface UploadIntent {
  objectKey: string;
  uploadUrl: string;
  mimeType?: string;
  expiresInSeconds?: number;
}

interface UploadBinaryResult {
  objectKey: string;
  publicUrl?: string | null;
  externalUrl?: string | null;
  sizeBytes?: number;
}

const normalizeApiRoot = () => {
  const base = apiConfig.baseUrl.replace(/\/+$/, "");
  if (base.endsWith(API_PREFIX)) {
    return base.slice(0, -API_PREFIX.length);
  }

  return base;
};

const toAbsoluteApiUrl = (pathOrUrl: string) => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${normalizeApiRoot()}${normalized}`;
};

const sanitizeFileName = (fileName: string) =>
  fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 180) || `document-${Date.now()}`;

const inferFileName = (file: UploadableFile) => {
  if (file.name?.trim()) {
    return sanitizeFileName(file.name);
  }

  const fromUri = file.uri.split("?")[0]?.split("/").pop();
  if (fromUri?.trim()) {
    return sanitizeFileName(fromUri);
  }

  return `document-${Date.now()}.bin`;
};

const inferMimeType = (file: UploadableFile, fileType: string) => {
  if (file.type?.trim()) return file.type;
  if (file.mimeType?.trim()) return file.mimeType;

  if (fileType === "image") return "image/jpeg";
  if (fileType === "link") return "text/plain";
  return "application/octet-stream";
};

const inferFileSize = (file: UploadableFile, fallback?: number) => {
  if (typeof file.size === "number" && Number.isFinite(file.size)) return file.size;
  if (typeof file.fileSize === "number" && Number.isFinite(file.fileSize)) return file.fileSize;
  return fallback;
};

const parseResponse = async (response: Response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const searchUserFiles = async (query: any, _userId: string) => {
  try {
    const response = await apiRequest<any[]>("/me/wallet/documents/search", {
      query: {
        q: String(query ?? ""),
        page: 1,
        pageSize: MAX_API_PAGE_SIZE,
      },
    });

    return response.data ?? [];
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const uploadFile = async (file: UploadableFile, fileType: string) => {
  if (!file?.uri) {
    throw new Error("Please select a file to upload.");
  }

  const fileName = inferFileName(file);
  const mimeType = inferMimeType(file, fileType);

  try {
    const intentResponse = await apiRequest<UploadIntent>("/me/wallet/uploads/presign", {
      method: "POST",
      body: {
        fileName,
        mimeType,
        fileSize: inferFileSize(file),
      },
    });

    const uploadIntent = intentResponse.data;
    if (!uploadIntent?.uploadUrl || !uploadIntent?.objectKey) {
      throw new Error("Upload intent response was incomplete.");
    }

    const fileBlob = new File(file.uri);
    const fileBuffer = await fileBlob.arrayBuffer();
    const sizeBytes = inferFileSize(file, fileBuffer.byteLength);

    const uploadUrl = toAbsoluteApiUrl(uploadIntent.uploadUrl);
    const authHeaders = await getApiAuthHeaders();

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        ...authHeaders,
        "Content-Type": mimeType,
      },
      body: fileBuffer,
    });

    const parsedUploadBody = await parseResponse(uploadResponse);

    if (!uploadResponse.ok) {
      const message =
        typeof parsedUploadBody === "object" &&
        parsedUploadBody !== null &&
        "message" in parsedUploadBody &&
        typeof (parsedUploadBody as any).message === "string"
          ? (parsedUploadBody as any).message
          : `Upload failed with status ${uploadResponse.status}`;

      throw new Error(message);
    }

    const uploadData =
      typeof parsedUploadBody === "object" &&
      parsedUploadBody !== null &&
      "data" in parsedUploadBody
        ? ((parsedUploadBody as any).data as UploadBinaryResult)
        : null;

    return {
      objectKey: uploadData?.objectKey ?? uploadIntent.objectKey,
      publicUrl: uploadData?.publicUrl ?? null,
      externalUrl: uploadData?.externalUrl ?? null,
      mimeType,
      sizeBytes,
    };
  } catch (error: any) {
    throw new Error(error.message || "File upload failed.");
  }
};

export const createFile = async (form: any) => {
  try {
    const uploadedFile = await uploadFile(form.file, form.fileType);

    const response = await apiRequest<any>("/me/wallet/documents", {
      method: "POST",
      body: {
        title: form.title,
        description: form.description || null,
        documentType: form.documentType,
        fileType: form.fileType,
        objectKey: uploadedFile?.objectKey,
        externalUrl: uploadedFile?.externalUrl || null,
        publicUrl: uploadedFile?.publicUrl || null,
        mimeType: uploadedFile?.mimeType,
        sizeBytes: uploadedFile?.sizeBytes,
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const saveLink = async (form: any) => {
  try {
    const response = await apiRequest<any>("/me/wallet/links", {
      method: "POST",
      body: {
        title: form.title,
        description: form.description,
        documentType: form.documentType,
        link: form.link,
      },
    });

    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const fetchUserFiles = async (_userId: string) => {
  try {
    const response = await apiRequest<any[]>("/me/wallet/documents", {
      query: {
        page: 1,
        pageSize: MAX_API_PAGE_SIZE,
      },
    });

    return response.data ?? [];
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const deleteFile = async (fileId: string) => {
  try {
    const deleted = await apiRequest<{ id: string }>(`/me/wallet/documents/${fileId}`, {
      method: "DELETE",
    });

    return deleted.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
