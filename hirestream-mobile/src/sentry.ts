/**
 * Sentry integration — F0.4, F6.4
 *
 * Wraps @sentry/react-native with a safe fallback.
 * If the SDK isn't installed (e.g. in Expo Go), all calls become no-ops.
 *
 * Usage:
 *   import { initSentry, captureException } from "./sentry";
 *   initSentry();   // call once in App.tsx
 *   captureException(error); // call from ErrorBoundary
 */

import Constants from "expo-constants";

const SENTRY_DSN = "https://placeholder@sentry.io/0"; // Replace with actual DSN

// Detect if running in Expo Go (where native error handlers cause red overlays)
const isExpoGo = Constants.appOwnership === "expo";

let Sentry: any = null;
let initialized = false;

// Try to import Sentry — silently fall back if unavailable
try {
  Sentry = require("@sentry/react-native");
} catch {
  // @sentry/react-native not installed — all calls will be no-ops
}

/**
 * Initialize Sentry. Call once in App.tsx before rendering.
 *
 * In Expo Go we disable ReactNativeErrorHandlers because it wraps
 * the global error handler, causing console warnings to surface as
 * red error overlays (the persistent red border on iOS/Android).
 */
export function initSentry(): void {
  if (!Sentry || initialized) return;

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      tracesSampleRate: 0.2,
      environment: __DEV__ ? "development" : "production",
      debug: false, // disable Sentry's own console logging in dev
      enableAutoSessionTracking: !isExpoGo,
      sessionTrackingIntervalMillis: 30000,
      // In Expo Go, filter out integrations that wrap the global error
      // handler — they cause red overlays for harmless console warnings
      integrations: isExpoGo
        ? (integrations: any[]) =>
            integrations.filter(
              (i: any) =>
                i.name !== "ReactNativeErrorHandlers" &&
                i.name !== "ExpoErrorHandlers"
            )
        : undefined,
    });
    initialized = true;
  } catch (e) {
    // Sentry init failed — swallow silently
  }
}

/**
 * Capture an exception. Safe to call even if Sentry isn't loaded.
 */
export function captureException(error: Error | unknown, context?: Record<string, any>): void {
  if (Sentry && initialized) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
  // Always log to console in dev
  if (__DEV__) {
    console.error("[Sentry]", error);
  }
}

/**
 * Set the current user for Sentry tracking.
 */
export function setUser(user: { id: string; email?: string } | null): void {
  if (Sentry && initialized) {
    Sentry.setUser(user);
  }
}

/**
 * Add a breadcrumb for debugging.
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void {
  if (Sentry && initialized) {
    Sentry.addBreadcrumb({
      message,
      category: category || "app",
      data,
      level: "info",
    });
  }
}
