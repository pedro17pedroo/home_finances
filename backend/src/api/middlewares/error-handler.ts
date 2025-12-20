import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { AppError } from "../../core/errors/app-error.js";
import { logger } from "../../core/utils/logger.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error("Error occurred:", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors.map((error) => ({
        field: error.path.join("."),
        message: error.message,
      })),
    });
  }

  // Application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Default error
  res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};