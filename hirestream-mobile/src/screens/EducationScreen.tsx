/**
 * Education Screen — F5.6
 *
 * Manage education records:
 * - List existing education entries
 * - Add new education
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

interface EducationScreenProps {
  onBack: () => void;
}

interface EducationRecord {
  id: string;
  degree: string;
  institution: string;
  year?: number;
  percentage?: number;
}

export default function EducationScreen({ onBack }: EducationScreenProps) {
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<EducationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [year, setYear] = useState("");
  const [percentage, setPercentage] = useState("");

  const fetchEducation = useCallback(async () => {
    const res = await api("/api/v1/candidates/education");
    if (res.success && res.data) {
      setRecords(Array.isArray(res.data) ? res.data : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEducation();
  }, [fetchEducation]);

  const resetForm = () => {
    setDegree("");
    setInstitution("");
    setYear("");
    setPercentage("");
    setShowForm(false);
  };

  const handleAdd = async () => {
    if (!degree.trim()) {
      Alert.alert("Required", "Please enter your degree/qualification.");
      return;
    }
    if (!institution.trim()) {
      Alert.alert("Required", "Please enter your institution name.");
      return;
    }

    setSaving(true);
    const body: any = {
      degree: degree.trim(),
      institution: institution.trim(),
    };
    if (year.trim()) body.year = parseInt(year.trim(), 10);
    if (percentage.trim()) body.percentage = parseFloat(percentage.trim());

    const res = await api("/api/v1/candidates/education", {
      method: "POST",
      body,
    });

    setSaving(false);
    if (res.success) {
      Alert.alert("Added", "Education record added successfully.");
      resetForm();
      fetchEducation();
    } else {
      Alert.alert("Error", res.error?.message || res.message || "Failed to add education record.");
    }
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert("Delete", `Remove "${label}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api(`/api/v1/candidates/education/${id}`, { method: "DELETE" });
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
        <Text style={styles.headerTitle}>Education</Text>
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
              <Text style={styles.formTitle}>Add Education</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Degree / Qualification *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. B.Tech Computer Science"
                  placeholderTextColor={colors.textTertiary}
                  value={degree}
                  onChangeText={setDegree}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Institution *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. IIT Delhi"
                  placeholderTextColor={colors.textTertiary}
                  value={institution}
                  onChangeText={setInstitution}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Year</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2024"
                    placeholderTextColor={colors.textTertiary}
                    value={year}
                    onChangeText={setYear}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Percentage</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="85"
                    placeholderTextColor={colors.textTertiary}
                    value={percentage}
                    onChangeText={setPercentage}
                    keyboardType="decimal-pad"
                    maxLength={5}
                  />
                </View>
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
              <Ionicons name="school-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>No education records</Text>
              <Text style={styles.emptySub}>
                Tap the + button to add your qualifications.
              </Text>
            </View>
          ) : (
            records.map((rec) => (
              <View key={rec.id} style={styles.eduCard}>
                <View style={styles.eduIconWrap}>
                  <Ionicons name="school" size={22} color={colors.primary} />
                </View>
                <View style={styles.eduInfo}>
                  <Text style={styles.eduDegree} numberOfLines={2}>
                    {rec.degree}
                  </Text>
                  <Text style={styles.eduInstitution} numberOfLines={1}>
                    {rec.institution}
                  </Text>
                  <View style={styles.eduMeta}>
                    {rec.year && (
                      <Text style={styles.eduMetaText}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} /> {rec.year}
                      </Text>
                    )}
                    {rec.percentage !== undefined && rec.percentage !== null && (
                      <Text style={styles.eduMetaText}>
                        <Ionicons name="trending-up-outline" size={12} color={colors.textTertiary} /> {rec.percentage}%
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(rec.id, rec.degree)}
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
    borderColor: colors.primary + "30",
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
    backgroundColor: colors.primary,
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
  eduCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  eduIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFaded,
    alignItems: "center",
    justifyContent: "center",
  },
  eduInfo: { flex: 1, marginLeft: spacing.md },
  eduDegree: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },
  eduInstitution: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  eduMeta: { flexDirection: "row", gap: spacing.md },
  eduMetaText: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
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
