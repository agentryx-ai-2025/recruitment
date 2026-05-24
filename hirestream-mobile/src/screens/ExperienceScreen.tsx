/**
 * Experience Screen — F5.7
 *
 * Manage work experience records:
 * - List existing experience entries
 * - Add new experience
 * - Delete entries
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api } from "../api";

interface ExperienceScreenProps {
  onBack: () => void;
}

interface ExperienceRecord {
  id: string;
  company: string;
  role: string;
  years?: number;
  country?: string;
  description?: string;
}

export default function ExperienceScreen({ onBack }: ExperienceScreenProps) {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<ExperienceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [years, setYears] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");

  const fetchExperience = useCallback(async () => {
    const res = await api("/api/v1/candidates/experience");
    if (res.success && res.data) {
      setRecords(Array.isArray(res.data) ? res.data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExperience();
  }, [fetchExperience]);

  const resetForm = () => {
    setCompany("");
    setRole("");
    setYears("");
    setCountry("");
    setDescription("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!company.trim()) {
      Alert.alert("Required", "Please enter the company name.");
      return;
    }
    if (!role.trim()) {
      Alert.alert("Required", "Please enter your role/position.");
      return;
    }

    setSaving(true);
    const body: any = {
      company: company.trim(),
      role: role.trim(),
    };
    if (years.trim()) body.years = parseInt(years.trim(), 10);
    if (country.trim()) body.country = country.trim();
    if (description.trim()) body.description = description.trim();

    const res = await api("/api/v1/candidates/experience", {
      method: "POST",
      body,
    });

    setSaving(false);
    if (res.success) {
      Alert.alert("Added", "Experience record added successfully.");
      resetForm();
      fetchExperience();
    } else {
      Alert.alert("Error", res.error?.message || res.message || "Failed to add experience record.");
    }
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert("Delete", `Remove "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api(`/api/v1/candidates/experience/${id}`, { method: "DELETE" });
          if (res.success) {
            setRecords((prev) => prev.filter((r) => r.id !== id));
          } else {
            Alert.alert("Error", "Failed to delete record.");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Experience</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={styles.addButton}
        >
          <Ionicons name={showForm ? "close" : "add"} size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Add Form */}
          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add Experience</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Company *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Tata Consultancy Services"
                  placeholderTextColor={colors.textTertiary}
                  value={company}
                  onChangeText={setCompany}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role / Position *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Software Engineer"
                  placeholderTextColor={colors.textTertiary}
                  value={role}
                  onChangeText={setRole}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Years</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="3"
                    placeholderTextColor={colors.textTertiary}
                    value={years}
                    onChangeText={setYears}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Country</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="India"
                    placeholderTextColor={colors.textTertiary}
                    value={country}
                    onChangeText={setCountry}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Brief description of your responsibilities..."
                  placeholderTextColor={colors.textTertiary}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={resetForm}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleAdd}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* List */}
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
          ) : records.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No experience records</Text>
              <Text style={styles.emptySub}>
                Tap the + button to add your work experience.
              </Text>
            </View>
          ) : (
            records.map((rec) => (
              <View key={rec.id} style={styles.expCard}>
                <View style={styles.expIconWrap}>
                  <Ionicons name="briefcase" size={22} color="#7c3aed" />
                </View>
                <View style={styles.expInfo}>
                  <Text style={styles.expRole} numberOfLines={2}>
                    {rec.role}
                  </Text>
                  <Text style={styles.expCompany} numberOfLines={1}>
                    {rec.company}
                  </Text>
                  <View style={styles.expMeta}>
                    {rec.years !== undefined && rec.years !== null && (
                      <Text style={styles.expMetaText}>
                        {rec.years} yr{rec.years !== 1 ? "s" : ""}
                      </Text>
                    )}
                    {rec.country && (
                      <Text style={styles.expMetaText}>
                        📍 {rec.country}
                      </Text>
                    )}
                  </View>
                  {rec.description && (
                    <Text style={styles.expDesc} numberOfLines={2}>
                      {rec.description}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(rec.id, rec.role)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Form
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: "#7c3aed30",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: { marginBottom: spacing.md },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
    height: 48,
  },
  textArea: {
    height: 80,
    paddingTop: spacing.sm,
  },
  rowInputs: { flexDirection: "row" },
  formActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: "#ffffff",
  },

  // Cards
  expCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  expIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: "#7c3aed12",
    alignItems: "center",
    justifyContent: "center",
  },
  expInfo: { flex: 1, marginLeft: spacing.md },
  expRole: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  expCompany: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  expMeta: { flexDirection: "row", gap: spacing.md },
  expMetaText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
  },
  expDesc: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  deleteBtn: { padding: spacing.sm },

  // Empty
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  emptySub: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
});
