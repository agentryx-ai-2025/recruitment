/**
 * Force Update Screen — F6.9
 *
 * Shown when the app version is below the minimum supported version.
 * Blocks all navigation until the user updates from the store.
 * Consumes GET /api/v1/mobile/version on app startup.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  Image,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";

interface ForceUpdateScreenProps {
  currentVersion: string;
  requiredVersion: string;
}

export default function ForceUpdateScreen({
  currentVersion,
  requiredVersion,
}: ForceUpdateScreenProps) {
  const storeUrl = Platform.select({
    ios: "https://apps.apple.com/app/hirestream/id000000000", // Replace with actual App Store ID
    android:
      "https://play.google.com/store/apps/details?id=dev.agentryx.hirestream",
    default: "",
  });

  const handleUpdate = () => {
    if (storeUrl) {
      Linking.openURL(storeUrl);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="arrow-up-circle" size={80} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Update Required</Text>
        <Text style={styles.subtitle}>
          A new version of HireStream is available. Please update to continue
          using the app.
        </Text>

        {/* Version info */}
        <View style={styles.versionBox}>
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Your version</Text>
            <Text style={styles.versionValueOld}>{currentVersion}</Text>
          </View>
          <View style={styles.versionDivider} />
          <View style={styles.versionRow}>
            <Text style={styles.versionLabel}>Required version</Text>
            <Text style={styles.versionValueNew}>{requiredVersion}</Text>
          </View>
        </View>

        {/* What's new */}
        <View style={styles.whatsNewBox}>
          <Text style={styles.whatsNewTitle}>Why update?</Text>
          <View style={styles.whatsNewItem}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={colors.success}
            />
            <Text style={styles.whatsNewText}>
              Critical security improvements
            </Text>
          </View>
          <View style={styles.whatsNewItem}>
            <Ionicons name="bug" size={16} color={colors.warning} />
            <Text style={styles.whatsNewText}>Important bug fixes</Text>
          </View>
          <View style={styles.whatsNewItem}>
            <Ionicons name="sparkles" size={16} color={colors.primary} />
            <Text style={styles.whatsNewText}>New features and enhancements</Text>
          </View>
        </View>
      </View>

      {/* Update button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdate}
          activeOpacity={0.85}
        >
          <Ionicons name="download-outline" size={20} color="#ffffff" />
          <Text style={styles.updateButtonText}>Update Now</Text>
        </TouchableOpacity>
        <Text style={styles.footerNote}>
          © 2026 HPSEDC, Shimla · HireStream Mobile
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryFaded,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  versionBox: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  versionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  versionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  versionValueOld: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.error,
  },
  versionValueNew: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  versionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  whatsNewBox: {
    width: "100%",
    padding: spacing.lg,
  },
  whatsNewTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  whatsNewItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  whatsNewText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  footer: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  updateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    width: "100%",
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  updateButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
  footerNote: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
});
