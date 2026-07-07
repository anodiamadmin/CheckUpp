export type UploadDocumentFile = {
  uri: string;
  name?: string;
  type?: string;
  mimeType?: string;
  size?: number;
};

export type UploadDocumentForm = {
  title: string;
  file: UploadDocumentFile | null;
  documentType: string;
  fileType: string;
  link?: string;
  description?: string;
};
