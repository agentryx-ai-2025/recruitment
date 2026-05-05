import { Request, Response, NextFunction } from "express";

export function protect(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    error: {
      code: 401,
      message: "Authentication required",
    },
  });
}
