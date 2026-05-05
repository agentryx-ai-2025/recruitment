import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger.config";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const code = err.code || "INTERNAL_ERROR";

  // Log the error securely
  if (status >= 500) {
    logger.error(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`, {
      stack: err.stack,
      requestId: (req as any).id || "NO-ID",
    });
  } else {
    logger.warn(`[${req.method}] ${req.path} >> StatusCode:: ${status}, Message:: ${message}`);
  }

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
}
