import express from "express";
import { Router } from "express";
import { env } from "../../config/env";
import { validate } from "../../middlewares/validate";
import {
  createDocumentController,
  createLinkController,
  createUploadIntentController,
  deleteDocumentController,
  getDocumentByIdController,
  listDocumentsController,
  searchDocumentsController,
  uploadPendingFileController,
  updateDocumentController,
} from "./wallet.controller";
import {
  createDocumentSchema,
  createLinkSchema,
  createUploadIntentSchema,
  documentIdParamSchema,
  listDocumentsSchema,
  searchDocumentsSchema,
  uploadPendingFileQuerySchema,
  updateDocumentSchema,
} from "./wallet.validation";

export const walletRouter = Router();

walletRouter.get(
  "/me/wallet/documents",
  validate(listDocumentsSchema),
  listDocumentsController,
);
walletRouter.get(
  "/me/wallet/documents/search",
  validate(searchDocumentsSchema),
  searchDocumentsController,
);
walletRouter.get(
  "/me/wallet/documents/:id",
  validate(documentIdParamSchema),
  getDocumentByIdController,
);
walletRouter.post(
  "/me/wallet/uploads/presign",
  validate(createUploadIntentSchema),
  createUploadIntentController,
);
walletRouter.put(
  "/me/wallet/uploads/pending",
  validate(uploadPendingFileQuerySchema),
  express.raw({ type: "*/*", limit: env.requestBodyLimit }),
  uploadPendingFileController,
);
walletRouter.post(
  "/me/wallet/documents",
  validate(createDocumentSchema),
  createDocumentController,
);
walletRouter.patch(
  "/me/wallet/documents/:id",
  validate(documentIdParamSchema),
  validate(updateDocumentSchema),
  updateDocumentController,
);
walletRouter.post(
  "/me/wallet/links",
  validate(createLinkSchema),
  createLinkController,
);
walletRouter.delete(
  "/me/wallet/documents/:id",
  validate(documentIdParamSchema),
  deleteDocumentController,
);
