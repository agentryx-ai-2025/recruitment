/**
 * Preferences Screen — F5.8
 *
 * Country + job-role multi-select preferences.
 * Allows candidates to set their preferred:
 * - Target countries for employment
 * - Job categories / roles
 *
 * These preferences are used for job matching and recommendations.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
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

interface PreferencesScreenProps {
  onBack: () => void;
  onSaved?: () => void;
}

const COUNTRIES = [
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
];

const JOB_ROLES = [
  { id: "it", name: "IT & Software", icon: "code-slash" as const },
  { id: "healthcare", name: "Healthcare", icon: "medical" as const },
  { id: "engineering", name: "Engineering", icon: "construct" as const },
  { id: "construction", name: "Construction", icon: "hammer" as const },
  { id: "hospitality", name: "Hospitality", icon: "restaurant" as const },
  { id: "teaching", name: "Teaching", icon: "school" as const },
  { id: "finance", name: "Finance", icon: "calculator" as const },
  { id: "logistics", name: "Logistics", icon: "cube" as const },
  { id: "manufacturing", name: "Manufacturing", icon: "cog" as const },
  { id: "agriculture", name: "Agriculture", icon: "leaf" as const },
  { id: "retail", name: "Retail", icon: "cart" as const },
  { id: "admin", name: "Administration", icon: "clipboard" as const },
];

export default function PreferencesScreen({ onBack, onSaved }: PreferencesScreenProps) {
  const insets = useSafeAreaInsets();
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing preferences
  useEffect(() => {
    (async () => {
      try {
        const res = await api<any>("/api/v1/candidates/profile");
        if (res.success && res.data) {
          const prefs = res.data.preferences || {};
          if (prefs.countries) setSelectedCountries(new Set(prefs.countries));
          if (prefs.roles) setSelectedRoles(new Set(prefs.roles));
          // Also load from preferredCountries top-level field
          if (res.data.preferredCountries?.length) {
            setSelectedCountries(new Set(res.data.preferredCountries));
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const toggleCountry = (code: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api("/api/v1/candidates/profile", {
        method: "PATCH",
        body: {
          preferredCountries: Array.from(selectedCountries),
        },
      });
      if (res.success) {
        Alert.alert("Saved", "Your preferences have been updated.");
        onSaved?.();
      } else {
        Alert.alert("Error", "Could not save preferences. Please try again.");
      }
    } catch {
      Alert.alert("Error", "Network error. Please check your connection.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preferences</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <Text style={styles.infoText}>
            Set your preferences to get personalized job recommendations matching your interests.
          </Text>
        </View>

        {/* Countries */}
        <Text style={styles.sectionTitle}>
          Target Countries ({selectedCountries.size} selected)
        </Text>
        <View style={styles.grid}>
          {COUNTRIES.map((c) => {
            const isSelected = selectedCountries.has(c.code);
            return (
              <TouchableOpacity
                key={c.code}
                style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                onPress={() => toggleCountry(c.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.flag}>{c.flag}</Text>
                <Text style={[styles.gridLabel, isSelected && styles.gridLabelSelected]}>
                  {c.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkMark}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Job Roles */}
        <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>
          Preferred Job Categories ({selectedRoles.size} selected)
        </Text>
        <View style={styles.grid}>
          {JOB_ROLES.map((r) => {
            const isSelected = selectedRoles.has(r.id);
            return (
              <TouchableOpacity
                key={r.id}
                style={[styles.gridItem, isSelected && styles.gridItemSelected]}
                onPress={() => toggleRole(r.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={r.icon}
                  size={22}
                  color={isSelected ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.gridLabel, isSelected && styles.gridLabelSelected]}>
                  {r.name}
                </Text>
                {isSelected && (
                  <View style={styles.checkMark}>
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Save button at bottom */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Save Preferences</Text>
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
  saveButton: { width: 50, alignItems: "flex-end" },
  saveText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: "#ffffff" },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Info banner
  infoBanner: {
    flexDirection: "row",
    backgroundColor: colors.primaryFaded,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.primary,
    lineHeight: 20,
  },

  // Section
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridItem: {
    width: "47%" as any,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 70,
    position: "relative" as const,
  },
  gridItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  flag: { fontSize: 24, marginBottom: spacing.xs },
  gridLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  gridLabelSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  checkMark: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Save button
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xxl,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
});
