/**
 * Design system — colors, typography, spacing.
 * Matches the HireStream web palette for brand consistency.
 */

export const colors = {
  // Primary brand
  primary: "#1a56db",
  primaryLight: "#3b82f6",
  primaryDark: "#1e40af",
  primaryFaded: "rgba(26, 86, 219, 0.08)",

  // Backgrounds
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceElevated: "#ffffff",

  // Text
  text: "#0f172a",
  textSecondary: "#64748b",
  textTertiary: "#94a3b8",
  textInverse: "#ffffff",

  // Borders
  border: "#e2e8f0",
  borderFocus: "#3b82f6",

  // Status
  success: "#10b981",
  successBg: "#ecfdf5",
  warning: "#f59e0b",
  warningBg: "#fffbeb",
  error: "#ef4444",
  errorBg: "#fef2f2",
  info: "#3b82f6",
  infoBg: "#eff6ff",

  // Misc
  skeleton: "#e2e8f0",
  overlay: "rgba(0, 0, 0, 0.5)",
  shadow: "rgba(0, 0, 0, 0.08)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  xxxl: 34,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};
