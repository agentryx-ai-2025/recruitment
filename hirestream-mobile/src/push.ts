/**
 * Push Notification Service — F4.4, F4.5, F4.7
 *
 * Handles:
 * - Requesting notification permissions (Android 13+ POST_NOTIFICATIONS)
 * - Getting Expo push token
 * - Registering device token with backend
 * - Foreground notification handler
 * - Tap-to-open handler
 *
 * NOTE: expo-notifications was removed from Expo Go in SDK 53+.
 * All functions are safe no-ops when running in Expo Go.
 * They activate automatically in development/production builds.
 */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./api";

// Detect if running in Expo Go (where push notifications are unavailable)
const isExpoGo = Constants.appOwnership === "expo";

// Only attempt imports in non-Expo-Go environments (dev builds / production)
let Notifications: any = null;
let Device: any = null;

if (!isExpoGo) {
  try {
    Notifications = require("expo-notifications");
    // Verify the module actually loaded (some builds export an empty shell)
    if (!Notifications?.getPermissionsAsync) Notifications = null;
  } catch {
    // expo-notifications not installed or native module unavailable
    Notifications = null;
  }
  try {
    Device = require("expo-device");
    if (!Device?.isDevice && Device?.isDevice !== false) Device = null;
  } catch {
    // expo-device not installed or native module unavailable
    Device = null;
  }
}

/**
 * Request notification permissions.
 * On Android 13+, this triggers the POST_NOTIFICATIONS runtime dialog.
 */
export async function requestPermissions(): Promise<boolean> {
  if (!Notifications || !Device) return false;

  // Must be a physical device
  if (!Device.isDevice) {
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return false;
    }

    // Android-specific channel setup
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance?.MAX || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563eb",
      });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Get the Expo Push Token and register with backend.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;

  const granted = await requestPermissions();
  if (!granted) return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    const token = tokenData.data;

    // Register token with backend
    await api("/api/v1/mobile/push/register", {
      method: "POST",
      body: JSON.stringify({
        token,
        platform: Platform.OS,
      }),
    });

    return token;
  } catch {
    return null;
  }
}

/**
 * Set up foreground notification handler.
 * Shows the notification even when the app is in the foreground.
 */
export function setupForegroundHandler(): void {
  if (!Notifications) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch {
    // Native module unavailable (e.g. iOS Expo Go) — silently skip
  }
}

/**
 * Set up tap-to-open handler.
 * Returns a cleanup function for useEffect.
 */
export function setupNotificationTapHandler(
  onTap: (data: { jobId?: string; applicationId?: string; screen?: string }) => void
): () => void {
  if (!Notifications) return () => {};

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response: any) => {
      const data = response.notification.request.content.data || {};
      onTap(data);
    }
  );

  return () => subscription.remove();
}

/**
 * Unregister push token (on logout).
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await api("/api/v1/mobile/push/unregister", { method: "POST" });
  } catch {
    // Best-effort
  }
}
