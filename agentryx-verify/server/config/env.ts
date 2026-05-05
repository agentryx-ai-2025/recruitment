import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform(Number).default("5002"),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(16).default("change-me-in-production-please-1234567890"),
  APP_URL: z.string().url().default("http://localhost:5002"),
  COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Allow password-less email login for seeded reviewers (low-stakes UAT portal).
  // Set "true" in production until proper SMTP/OTP flow is wired.
  ALLOW_EMAIL_LOGIN: z.enum(["true", "false"]).default("false"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Bad env:", parsed.error.format());
  process.exit(1);
}
export const env = parsed.data;
export const cookieSecure =
  env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE === "true" : env.NODE_ENV === "production";
