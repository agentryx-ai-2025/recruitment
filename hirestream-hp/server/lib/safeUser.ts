/**
 * security 2026-07-07 (A02-2/A02-3): single safe-user serializer.
 *
 * Several routes serialised `users` rows with only `password` stripped, which
 * leaked the TOTP seed (`twoFactorSecret`), the 2FA recovery codes, and the
 * raw Aadhaar number (DPDP) — in the admin users.csv export, the superadmin
 * user list/lookup, and even the login/`/me` responses (self-leak, but an XSS
 * or shoulder-surf away from defeating 2FA).
 *
 * Rule: NO response may ever emit `password`, `twoFactorSecret`, or
 * `twoFactorRecoveryCodes`; `aadhaarNumber` is masked to its last 4 digits.
 * Use `sanitizeUser()` on every users-row serialisation instead of the old
 * `const { password, ...rest } = user` pattern.
 */

/** Mask an Aadhaar (or any ID) number down to its last 4 digits: XXXX-XXXX-1234. */
export function maskAadhaar(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  const last4 = digits.slice(-4) || String(value).slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/** Strip credential/2FA secrets and mask Aadhaar on a users row. */
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<T, "password" | "twoFactorSecret" | "twoFactorRecoveryCodes"> {
  const { password: _pw, twoFactorSecret: _tfs, twoFactorRecoveryCodes: _tfr, ...rest } = user as Record<string, any>;
  if ("aadhaarNumber" in rest) rest.aadhaarNumber = maskAadhaar(rest.aadhaarNumber);
  return rest as Omit<T, "password" | "twoFactorSecret" | "twoFactorRecoveryCodes">;
}
