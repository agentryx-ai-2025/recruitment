import type { Request, Response, NextFunction } from "express";

declare module "express-session" {
  interface SessionData {
    reviewerId?: string;
    projectId?: string;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.reviewerId) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}
