/**
 * Profile Edit Screen — F5.2
 *
 * Editable form for candidate profile fields:
 * - Full name
 * - Phone number
 * - Preferred language
 *
 * Uses PATCH /api/v1/mobile/profile to save changes.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api } from "../api";

interface ProfileEditScreenProps {
  profile: any;
  onBack: () => void;
  onSaved: (updated: any) => void;
}

export default function ProfileEditScreen({
  profile,
  onBack,
  onSaved,
}: ProfileEditScreenProps) {
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState(profile?.fullName || "");
  const [phone, setPhone] = useState(profile?.phoneNumber || profile?.phone || "");
  const [language, setLanguage] = useState(profile?.preferredLanguage || "en");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Please enter your full name.");
      return;
    }

    setSaving(true);
    const res = await api("/api/v1/mobile/profile", {
      method: "PATCH",
      body: {
        fullName: fullName.trim(),
        phoneNumber: phone.trim() || undefined,
        preferredLanguage: language,
      },
    });
    setSaving(false);

    if (res.success) {
      Alert.alert("Saved ✓", "Your profile has been updated.");
      onSaved(res.data);
    } else {
      Alert.alert("Error", res.error?.message || "Could not save profile. Try again.");
    }
  };

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Full Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name *</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Phone */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={18} color={colors.primary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Language */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Preferred Language</Text>
          <View style={styles.languageRow}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageChip,
                  language === lang.code && styles.languageChipActive,
                ]}
                onPress={() => setLanguage(lang.code)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={language === lang.code ? "radio-button-on" : "radio-button-off"}
                  size={18}
                  color={language === lang.code ? colors.primary : colors.textTertiary}
                />
                <Text
                  style={[
                    styles.languageChipText,
                    language === lang.code && styles.languageChipTextActive,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={colors.info} />
          <Text style={styles.infoText}>
            To update your email, education, work experience, or documents, please use the web portal at hirestream.agentryx.dev
          </Text>
        </View>

        {/* Bottom Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
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
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: "#ffffff" },
  saveButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  saveText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: "#fff" },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Fields
  fieldGroup: { marginBottom: spacing.xl },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  inputIcon: { marginRight: spacing.md },
  textInput: {
    flex: 1,
    height: 50,
    fontSize: fontSize.md,
    color: colors.text,
  },

  // Language
  languageRow: { flexDirection: "row", gap: spacing.md },
  languageChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
  },
  languageChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryFaded },
  languageChipText: { fontSize: fontSize.md, color: colors.textSecondary },
  languageChipTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },

  // Info
  infoCard: {
    flexDirection: "row",
    backgroundColor: colors.infoBg,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.info + "20",
  },
  infoText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 54,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: "#fff" },
});
