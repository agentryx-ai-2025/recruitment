/**
 * Safe storage wrapper — falls back to in-memory if SecureStore isn't available
 * (e.g. in Expo Go with version mismatches or on web).
 */

import { Platform } from "react-native";

let SecureStore: any = null;
const memoryStore: Record<string, string> = {};

// Try to import SecureStore — if it fails, use in-memory fallback
try {
  SecureStore = require("expo-secure-store");
} catch {
  console.warn("expo-secure-store not available, using in-memory storage");
}

export async function getItem(key: string): Promise<string | null> {
  try {
    if (SecureStore) {
      return await SecureStore.getItemAsync(key);
    }
  } catch (e) {
    console.warn(`SecureStore.getItemAsync failed for ${key}:`, e);
  }
  return memoryStore[key] || null;
}

export async function setItem(key: string, value: string): Promise<void> {
  try {
    if (SecureStore) {
      await SecureStore.setItemAsync(key, value);
      return;
    }
  } catch (e) {
    console.warn(`SecureStore.setItemAsync failed for ${key}:`, e);
  }
  memoryStore[key] = value;
}

export async function deleteItem(key: string): Promise<void> {
  try {
    if (SecureStore) {
      await SecureStore.deleteItemAsync(key);
    }
  } catch (e) {
    console.warn(`SecureStore.deleteItemAsync failed for ${key}:`, e);
  }
  delete memoryStore[key];
}
