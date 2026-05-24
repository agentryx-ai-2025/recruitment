/**
 * Settings Screen — F6.5, F6.6, F6.7
 *
 * App settings including:
 * - Language toggle (English only in v1.0)
 * - Notification preferences
 * - Privacy policy link
 * - Delete account (Play Store requirement)
 * - About & version info
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Platform,
  Image,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { useAuth } from "../auth";
import { api } from "../api";

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyPush, setNotifyPush] = useState(true);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This action is permanent and cannot be undone. All your data, applications, and documents will be permanently deleted.\n\nAre you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: async () => {
            const result = await api("/api/v1/me", { method: "DELETE" });
            if (result.success) {
              Alert.alert("Account Deleted", "Your account has been permanently deleted.");
              logout();
            } else {
              Alert.alert("Error", "Could not delete account. Please contact support.");
            }
          },
        },
      ]
    );
  };

  const openPrivacyPolicy = () => {
    Linking.openURL("https://hirestream.agentryx.dev/privacy");
  };

  const openTerms = () => {
    Linking.openURL("https://hirestream.agentryx.dev/terms");
  };

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const renderRow = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    right?: React.ReactNode,
    onPress?: () => void,
    danger?: boolean
  ) => (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.rowLeft}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? colors.error : colors.primary}
        />
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>
          {label}
        </Text>
      </View>
      {right || (onPress && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />)}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Preferences */}
        {renderSection("Notification Preferences", <>
          {renderRow("mail-outline", "Email Notifications", (
            <Switch
              value={notifyEmail}
              onValueChange={setNotifyEmail}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifyEmail ? colors.primary : "#f4f4f5"}
            />
          ))}
          <View style={styles.rowDivider} />
          {renderRow("chatbox-outline", "SMS Notifications", (
            <Switch
              value={notifySms}
              onValueChange={setNotifySms}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifySms ? colors.primary : "#f4f4f5"}
            />
          ))}
          <View style={styles.rowDivider} />
          {renderRow("notifications-outline", "Push Notifications", (
            <Switch
              value={notifyPush}
              onValueChange={setNotifyPush}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={notifyPush ? colors.primary : "#f4f4f5"}
            />
          ))}
        </>)}

        {/* Language */}
        {renderSection("Language", <>
          {renderRow("globe-outline", "App Language", (
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>English</Text>
            </View>
          ))}
          <Text style={styles.languageNote}>
            Hindi and other languages coming in v2.0
          </Text>
        </>)}

        {/* Legal */}
        {renderSection("Legal & Support", <>
          {renderRow("document-text-outline", "Privacy Policy", undefined, openPrivacyPolicy)}
          <View style={styles.rowDivider} />
          {renderRow("newspaper-outline", "Terms of Service", undefined, openTerms)}
          <View style={styles.rowDivider} />
          {renderRow("help-circle-outline", "Help & Support", undefined, () => {
            Linking.openURL("mailto:support@agentryx.dev?subject=HireStream%20Mobile%20Support");
          })}
        </>)}

        {/* Account Actions */}
        {renderSection("Account", <>
          {renderRow("log-out-outline", "Sign Out", undefined, handleLogout)}
          <View style={styles.rowDivider} />
          {renderRow("trash-outline", "Delete Account", undefined, handleDeleteAccount, true)}
        </>)}

        {/* App Info */}
        <View style={styles.appInfo}>
          <Image
            source={require("../../assets/hpsedc-logo.png")}
            style={styles.footerLogo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>HireStream Mobile</Text>
          <Text style={styles.appVersion}>Version 1.0.0 · Build 1</Text>
          <Text style={styles.appCopyright}>
            © 2026 HPSEDC, Shimla. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primaryDark,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Sections
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  // Rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  rowLeft: { flexDirection: "row", alignItems: "center" },
  rowLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    marginLeft: spacing.md,
  },
  rowLabelDanger: { color: colors.error },
  rowDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.xl + spacing.lg,
  },

  // Language
  languageBadge: {
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  languageText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  languageNote: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontStyle: "italic",
  },

  // Footer
  appInfo: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
  },
  footerLogo: { width: 48, height: 48, borderRadius: 24, marginBottom: spacing.md },
  appName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  appVersion: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  appCopyright: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
