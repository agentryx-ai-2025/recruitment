/**
 * Mobile Bearer Token Authentication Middleware
 *
 * Sits before passport.session() in the middleware chain. When a request
 * carries an `Authorization: Bearer <token>` header with a JWT whose `typ`
 * is `mobile_access`, this middleware verifies it and populates `req.user`
 * with the same shape that passport would. All existing route handlers that
 * read `req.user` continue to work — they don't care how the user was
 * authenticated.
 *
 * If the header is absent or not a Bearer token, the middleware calls
 * `next()` silently so the request falls through to passport session auth.
 *
 * See: /PMD-Final wrapup/MobileApps/05_Backend_API_Adaptations.md §3
 */

import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { env } from "../config/env.config";
import { logger } from "../config/logger.config";

export interface MobileAccessPayload {
  sub: string;          // userId
  role: string;
  typ: "mobile_access";
  iat: number;
  exp: number;
}

export async function mobileBearer(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next(); // skip — falls through to session

  // If JWT_SECRET is not configured, bearer tokens can't be verified
  if (!env.JWT_SECRET) return next();

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as MobileAccessPayload;

    // Only process tokens explicitly typed as mobile_access
    if (payload.typ !== "mobile_access") return next();

    const db = storage.db;
    if (!db) return res.status(500).json({ error: "database_unavailable" });

    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user) return res.status(401).json({ error: "user_not_found" });
    if (user.isActive === false) return res.status(401).json({ error: "user_deactivated" });

    // Populate req.user — same shape as passport.session() would
    (req as any).user = user;

    // Mark this request as mobile-authenticated so downstream code can
    // distinguish if needed (e.g. audit log: "source: mobile")
    (req as any).isMobileAuth = true;

    return next();
  } catch (e: any) {
    if (e.name === "TokenExpiredError") {
      return res.status(401).json({ error: "token_expired" });
    }
    if (e.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "invalid_token" });
    }
    logger.error(`mobileBearer: unexpected error: ${e.message}`);
    return res.status(401).json({ error: "invalid_token" });
  }
}
