/**
 * Job Detail Screen — F2.4
 *
 * Full job description with:
 * - Company info, location, salary
 * - Job description
 * - Requirements / skills
 * - Apply CTA button (F3.1)
 * - Back navigation
 */

import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, StatusBar, Platform, Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api } from "../api";
import { useAuth } from "../auth";

interface Job {
  id: string;
  title: string;
  company?: string;
  country?: string;
  city?: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experience?: number;
  experienceMin?: number;
  experienceMax?: number;
  status?: string;
  description?: string;
  requirements?: string | string[];
  skills?: string[];
  benefits?: string;
  contractDuration?: string;
  positions?: number;
  targetHires?: number;
  createdAt?: string;
  closingDate?: string;
  hiringDeadline?: string;
}

interface JobDetailScreenProps {
  job: Job;
  onBack: () => void;
  onApplied: () => void;
  alreadyApplied?: boolean;
}

export default function JobDetailScreen({ job, onBack, onApplied, alreadyApplied }: JobDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(alreadyApplied || false);
  const [eligibilityWarnings, setEligibilityWarnings] = useState<string[]>([]);

  // Check eligibility and applied status on mount
  useEffect(() => {
    const checkEligibilityAndStatus = async () => {
      const warnings: string[] = [];

      // 1. Check deadline
      const deadline = job.closingDate || job.hiringDeadline;
      if (deadline && new Date(deadline) < new Date()) {
        warnings.push("Application deadline has passed");
      }

      // 2. Fetch profile for completeness check
      try {
        const profileRes = await api<any>("/api/v1/mobile/profile");
        if (profileRes.success && profileRes.data) {
          const p = profileRes.data;
          if (!p.fullName) warnings.push("Your profile is missing your full name");
          if (!p.phoneNumber && !p.phone) warnings.push("Add a phone number to your profile");
        }
      } catch (e) { /* ignore */ }

      // 3. Experience check
      const reqExp = job.experienceMin ?? job.experience;
      if (reqExp !== undefined && reqExp !== null && reqExp > 0) {
        // We can't know the user's exact experience without a profile field,
        // but we surface it as informational
        warnings.push(`This role requires ${reqExp}+ years of experience`);
      }

      setEligibilityWarnings(warnings);

      // 4. Check if already applied (cross-job dedupe)
      if (!applied) {
        try {
          const res = await api<any>("/api/v1/candidates/applications");
          if (res.success && Array.isArray(res.data)) {
            const jobId = job.id || (job as any)._id;
            const match = res.data.find((a: any) => {
              const appJobId = a.jobId || a.job_id || a.job?.id || a.job?._id;
              if (appJobId === jobId) return true;
              if (a.jobTitle && job.title && a.company && job.company) {
                return a.jobTitle === job.title && a.company === job.company;
              }
              return false;
            });
            if (match) setApplied(true);
          }
        } catch (e) { /* ignore */ }
      }
    };

    checkEligibilityAndStatus();
  }, [job.id]);

  const handleApply = async () => {
    Alert.alert(
      "Apply for this position?",
      `You are applying for "${job.title}" at ${job.company || "this company"}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Apply Now",
          onPress: async () => {
            setApplying(true);
            const res = await api(`/api/v1/jobs/${job.id}/apply`, {
              method: "POST",
            });
            setApplying(false);

            if (res.success) {
              setApplied(true);
              onApplied();
              Alert.alert("Application Submitted! 🎉", "Your application has been submitted successfully. You can track its progress in My Applications.");
            } else {
              // Handle "already applied" error gracefully
              const msg = res.error?.message || "";
              if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("applied") || msg.toLowerCase().includes("existing")) {
                setApplied(true);
                Alert.alert("Already Applied", "You have already applied for this position. Track it in My Applications.");
              } else {
                Alert.alert("Application Failed", msg || "Could not submit application. Please try again.");
              }
            }
          },
        },
      ],
    );
  };

  const formatSalary = () => {
    // API returns salary as a pre-formatted string
    if (job.salary) return job.salary;
    if (!job.salaryMin) return null;
    const currency = job.salaryCurrency || "USD";
    const min = job.salaryMin.toLocaleString();
    const max = job.salaryMax ? job.salaryMax.toLocaleString() : null;
    return max ? `${currency} ${min} – ${max}` : `${currency} ${min}+`;
  };

  const isOpen = job.status === "open" || job.status === "active";
  const locationStr = job.location || (job.city ? `${job.city}, ${job.country}` : job.country);

  const InfoRow = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.primary} style={styles.infoIcon} />
      <View>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Job Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title Card */}
        <View style={styles.titleCard}>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle}>{job.title || "Untitled Position"}</Text>
            <View style={[styles.statusBadge, isOpen ? styles.statusOpen : styles.statusClosed]}>
              <Text style={[styles.statusText, isOpen ? styles.statusOpenText : styles.statusClosedText]}>
                {isOpen ? "Open" : (job.status || "draft")}
              </Text>
            </View>
          </View>

          {job.company && (
            <View style={styles.companyRow}>
              <Ionicons name="business" size={16} color={colors.textSecondary} />
              <Text style={styles.companyName}>{job.company}</Text>
            </View>
          )}

          {job.createdAt && (
            <Text style={styles.postedDate}>
              Posted {new Date(job.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {job.closingDate && ` · Closes ${new Date(job.closingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
            </Text>
          )}
        </View>

        {/* Quick Info Grid */}
        <View style={styles.infoGrid}>
          {locationStr && <InfoRow icon="location" label="Location" value={locationStr} />}
          {formatSalary() && <InfoRow icon="cash" label="Salary" value={formatSalary()!} />}
          {(job.experience !== undefined || job.experienceMin !== undefined) && (
            <InfoRow icon="time" label="Experience" value={
              job.experience !== undefined ? `${job.experience}+ years` :
              `${job.experienceMin}–${job.experienceMax || "10+"} years`
            } />
          )}
          {job.contractDuration && <InfoRow icon="calendar" label="Duration" value={job.contractDuration} />}
          {(job.positions || job.targetHires) && (
            <InfoRow icon="people" label="Positions" value={`${job.positions || job.targetHires} opening${(job.positions || job.targetHires || 0) > 1 ? "s" : ""}`} />
          )}
          {(job.closingDate || job.hiringDeadline) && (
            <InfoRow icon="calendar" label="Deadline" value={new Date(job.closingDate || job.hiringDeadline!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
          )}
        </View>

        {/* Skills */}
        {job.skills && job.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Skills</Text>
            <View style={styles.skillsRow}>
              {job.skills.map((skill, i) => (
                <View key={i} style={styles.skillChip}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Description</Text>
            <Text style={styles.bodyText}>{job.description}</Text>
          </View>
        )}

        {/* Requirements */}
        {job.requirements && (Array.isArray(job.requirements) ? job.requirements.length > 0 : job.requirements.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            <Text style={styles.bodyText}>
              {Array.isArray(job.requirements) ? job.requirements.join("\n• ") : job.requirements}
            </Text>
          </View>
        )}

        {/* Benefits */}
        {job.benefits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Benefits</Text>
            <Text style={styles.bodyText}>{job.benefits}</Text>
          </View>
        )}

        {/* Eligibility Check — F3.2 */}
        {eligibilityWarnings.length > 0 && !applied && (
          <View style={styles.eligibilityCard}>
            <View style={styles.eligibilityHeader}>
              <Ionicons name="information-circle" size={20} color={colors.warning} />
              <Text style={styles.eligibilityTitle}>Before You Apply</Text>
            </View>
            {eligibilityWarnings.map((warning, i) => (
              <View key={i} style={styles.eligibilityItem}>
                <Ionicons
                  name={
                    warning.includes("deadline") ? "time-outline" :
                    warning.includes("profile") || warning.includes("phone") || warning.includes("name") ? "person-outline" :
                    warning.includes("experience") ? "trending-up-outline" : "alert-circle-outline"
                  }
                  size={16}
                  color={warning.includes("deadline") ? colors.error : colors.warning}
                />
                <Text style={[
                  styles.eligibilityText,
                  warning.includes("deadline") && { color: colors.error },
                ]}>
                  {warning}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Spacer for bottom button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Apply Bar */}
      <View style={styles.bottomBar}>
        {applied ? (
          <View style={styles.appliedButton}>
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text style={styles.appliedText}>Application Submitted</Text>
          </View>
        ) : !isOpen ? (
          <View style={styles.closedButton}>
            <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
            <Text style={styles.closedText}>Applications Closed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.applyButton}
            onPress={handleApply}
            disabled={applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <>
                <Ionicons name="paper-plane" size={20} color={colors.textInverse} />
                <Text style={styles.applyText}>Apply Now</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    backgroundColor: colors.primaryDark,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: "#ffffff" },
  content: { padding: spacing.xl },
  titleCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, flex: 1, marginRight: spacing.sm, lineHeight: 30 },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full },
  statusOpen: { backgroundColor: colors.successBg },
  statusClosed: { backgroundColor: colors.errorBg },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: "capitalize" },
  statusOpenText: { color: colors.success },
  statusClosedText: { color: colors.error },
  companyRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md },
  companyName: { fontSize: fontSize.md, color: colors.textSecondary, marginLeft: spacing.sm },
  postedDate: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.sm },
  infoGrid: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, gap: spacing.lg,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoIcon: { marginRight: spacing.md, width: 24 },
  infoLabel: { fontSize: fontSize.xs, color: colors.textTertiary },
  infoValue: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text, marginTop: 1 },
  section: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.md },
  bodyText: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 24 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  skillChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.primaryFaded, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, gap: 6,
  },
  skillText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.xxl,
    borderTopWidth: 1, borderTopColor: colors.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  applyButton: {
    backgroundColor: colors.primary, height: 54, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  applyText: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.textInverse },
  appliedButton: {
    height: 54, borderRadius: radius.md, borderWidth: 2, borderColor: colors.success,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    backgroundColor: colors.successBg,
  },
  appliedText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.success },
  closedButton: {
    height: 54, borderRadius: radius.md, backgroundColor: colors.background,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm,
  },
  closedText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.textTertiary },
  eligibilityCard: {
    backgroundColor: colors.warningBg, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: "#fbbf2440",
  },
  eligibilityHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eligibilityTitle: {
    fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.warning,
  },
  eligibilityItem: {
    flexDirection: "row", alignItems: "flex-start", gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  eligibilityText: {
    fontSize: fontSize.sm, color: colors.text, flex: 1, lineHeight: 20,
  },
});
