/**
 * Network Status Banner — F6.10
 *
 * Shows a persistent banner when the device is offline.
 * Animates in/out smoothly with a retry action.
 */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, fontSize, fontWeight } from "../theme";

export default function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    // Periodic connectivity check (every 10s)
    let interval: ReturnType<typeof setInterval>;

    const checkConnection = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("https://hirestream-stg.agentryx.dev/api/v1/mobile/version", {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (isOffline) setIsOffline(false);
      } catch {
        if (!isOffline) setIsOffline(true);
      }
    };

    checkConnection();
    interval = setInterval(checkConnection, 15000);

    return () => clearInterval(interval);
  }, [isOffline]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOffline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOffline]);

  const handleRetry = async () => {
    try {
      const res = await fetch("https://hirestream-stg.agentryx.dev/api/v1/mobile/version", {
        method: "HEAD",
      });
      setIsOffline(false);
    } catch {
      // Still offline
    }
  };

  return (
    <Animated.View
      style={[
        styles.banner,
        { transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents={isOffline ? "auto" : "none"}
    >
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={18} color="#ffffff" />
        <Text style={styles.text}>No internet connection</Text>
      </View>
      <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#e53e3e",
    paddingTop: Platform.OS === "ios" ? 48 : 28,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 9999,
    elevation: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  text: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: "#ffffff",
    marginLeft: spacing.sm,
  },
  retryBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 4,
  },
  retryText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
});
