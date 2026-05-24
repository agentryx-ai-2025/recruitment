/**
 * App configuration — single source for all config values.
 * In production, these would come from env vars via expo-constants.
 */

// The backend URL — change this to your machine's IP for emulator testing.
// Emulators can't use localhost (that's the emulator's own loopback).
// Android emulator: use 10.0.2.2 to reach the host machine.
// Physical device on same WiFi: use your machine's LAN IP.
// Backend is served via nginx + SSL at this public URL.
// Works from any phone — no same-network requirement.
export const API_BASE_URL = "https://hirestream-stg.agentryx.dev";

export const APP_NAME = "HireStream";
export const APP_VERSION = "1.0.0";

// Token storage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "hs_access_token",
  REFRESH_TOKEN: "hs_refresh_token",
  USER_DATA: "hs_user_data",
} as const;
