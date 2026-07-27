import { Request, Response } from "express";
import { asyncHandler } from "../../middlewares/async-handler";
import { ApiError } from "../../middlewares/error-handler";
import {
  buildAuditContext,
  tryCreateAuditLog,
} from "../../services/audit.service";
import { created, ok, okPaginated } from "../../utils/http";
import {
  createDocument,
  createLink,
  createUploadIntent,
  deleteDocument,
  getDocumentById,
  listDocuments,
  searchDocuments,
  uploadPendingFile,
  updateDocument,
} from "./wallet.service";

export const listDocumentsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const result = await listDocuments(req.auth, req.query as any);
    return okPaginated(
      res,
      result.items,
      result.pagination,
      "Wallet documents fetched",
    );
  },
);

export const searchDocumentsController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const { q, page, pageSize } = req.query as any;
    const result = await searchDocuments(req.auth, String(q), page, pageSize);
    return okPaginated(
      res,
      result.items,
      result.pagination,
      "Wallet search completed",
    );
  },
);

export const getDocumentByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const document = await getDocumentById(req.auth, String(req.params.id));
    if (!document) throw new ApiError(404, "Document not found");

    return ok(res, document, "Document fetched");
  },
);

export const createUploadIntentController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const { fileName, mimeType } = req.body;
    const result = await createUploadIntent(fileName, mimeType);
    return created(res, result, "Upload intent created");
  },
);

export const uploadPendingFileController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const objectKey = String(req.query.objectKey ?? "");
    const mimeType = String(
      req.headers["content-type"] || "application/octet-stream",
    );
    const body = req.body;

    if (!Buffer.isBuffer(body) || body.byteLength === 0) {
      throw new ApiError(400, "Upload payload is empty");
    }

    const uploaded = await uploadPendingFile(objectKey, body, mimeType);
    const host = req.get("host");
    const publicUrl = host
      ? `${req.protocol}://${host}${uploaded.publicPath}`
      : uploaded.publicPath;

    return created(
      res,
      {
        objectKey: uploaded.objectKey,
        mimeType: uploaded.mimeType,
        sizeBytes: uploaded.sizeBytes,
        publicUrl,
        externalUrl: publicUrl,
      },
      "File uploaded",
    );
  },
);

export const createDocumentController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const document = await createDocument(req.auth, req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "wallet.document.create",
      resourceType: "wallet_document",
      resourceId: document.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return created(res, document, "Document created");
  },
);

export const updateDocumentController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const document = await updateDocument(
      req.auth,
      String(req.params.id),
      req.body,
    );
    if (!document) throw new ApiError(404, "Document not found");

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "wallet.document.update",
      resourceType: "wallet_document",
      resourceId: document.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, document, "Document updated");
  },
);

export const createLinkController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const document = await createLink(req.auth, req.body);

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "wallet.link.create",
      resourceType: "wallet_document",
      resourceId: document.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return created(res, document, "Link saved");
  },
);

export const deleteDocumentController = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.auth) throw new ApiError(401, "Unauthorized");

    const deleted = await deleteDocument(req.auth, String(req.params.id));
    if (!deleted) throw new ApiError(404, "Document not found");

    await tryCreateAuditLog({
      actorUserId: req.auth.userId,
      action: "wallet.document.delete",
      resourceType: "wallet_document",
      resourceId: deleted.id,
      status: "success",
      ...buildAuditContext(req),
    });

    return ok(res, { id: deleted.id }, "Document deleted");
  },
);
