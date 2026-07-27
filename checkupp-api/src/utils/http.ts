import { Response } from "express";
import { PaginationResult } from "./pagination";

export const ok = <T>(res: Response, data: T, message = "OK") => {
  return res.status(200).json({
    success: true,
    message,
    data,
  });
};

export const created = <T>(res: Response, data: T, message = "Created") => {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
};

export const accepted = <T>(res: Response, data: T, message = "Accepted") => {
  return res.status(202).json({
    success: true,
    message,
    data,
  });
};

export const noContent = (res: Response) => res.status(204).send();

export const okPaginated = <T>(
  res: Response,
  items: T[],
  pagination: PaginationResult,
  message = "OK"
) => {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination,
  });
};
