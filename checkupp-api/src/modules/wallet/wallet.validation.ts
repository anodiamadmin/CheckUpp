import Joi from "joi";

const fileTypeSchema = Joi.string()
  .valid("FILE", "IMAGE", "LINK", "file", "image", "link")
  .required();

const baseDocumentFields = {
  title: Joi.string().min(1).max(255),
  description: Joi.string().max(2000).allow("", null),
  documentType: Joi.string().min(1).max(120),
  fileType: Joi.string()
    .valid("FILE", "IMAGE", "LINK", "file", "image", "link")
    .optional(),
  objectKey: Joi.string().allow("", null),
  publicUrl: Joi.string().uri().allow("", null),
  externalUrl: Joi.string().uri().allow("", null),
  mimeType: Joi.string().max(120).allow("", null),
  sizeBytes: Joi.number().integer().min(0),
  legacyAppwriteStorageId: Joi.string().allow("", null),
};

export const listDocumentsSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
    documentType: Joi.string().optional(),
    fileType: Joi.string()
      .valid("FILE", "IMAGE", "LINK", "file", "image", "link")
      .optional(),
  }),
};

export const searchDocumentsSchema = {
  query: Joi.object({
    q: Joi.string().min(1).required(),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

export const documentIdParamSchema = {
  params: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const createUploadIntentSchema = {
  body: Joi.object({
    fileName: Joi.string().min(1).required(),
    mimeType: Joi.string().min(1).required(),
    fileSize: Joi.number().integer().min(1).optional(),
  }),
};

export const uploadPendingFileQuerySchema = {
  query: Joi.object({
    objectKey: Joi.string().min(1).max(500).required(),
  }),
};

export const createDocumentSchema = {
  body: Joi.object(baseDocumentFields)
    .keys({
      title: Joi.string().min(1).max(255).required(),
      documentType: Joi.string().min(1).max(120).required(),
      fileType: fileTypeSchema,
    })
    .required(),
};

export const updateDocumentSchema = {
  body: Joi.object(baseDocumentFields).min(1),
};

export const createLinkSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(2000).allow("", null).optional(),
    documentType: Joi.string().min(1).max(120).required(),
    link: Joi.string().uri().required(),
  }),
};
