import Joi from "joi";
import { NextFunction, Request, Response } from "express";

export interface ValidationSchema {
  body?: Joi.Schema;
  query?: Joi.Schema;
  params?: Joi.Schema;
}

const formatErrors = (details: Joi.ValidationErrorItem[]) =>
  details.map((detail) => detail.message);

export const validate = (schema: ValidationSchema) => {
  const patchRequestSegment = (
    req: Request,
    key: keyof ValidationSchema,
    value: unknown
  ) => {
    if (key === "body") {
      req.body = value;
      return;
    }

    Object.defineProperty(req, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  };

  return (req: Request, res: Response, next: NextFunction) => {
    const options = {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
      convert: true,
    };

    const payloads: Array<keyof ValidationSchema> = ["params", "query", "body"];

    for (const key of payloads) {
      const validator = schema[key];
      if (!validator) continue;

      const { error, value } = validator.validate(req[key], options);
      if (error) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formatErrors(error.details),
        });
      }

      patchRequestSegment(req, key, value);
    }

    return next();
  };
};
