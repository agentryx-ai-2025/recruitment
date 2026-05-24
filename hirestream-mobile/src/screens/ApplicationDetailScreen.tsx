/**
 * Application Detail Screen — F3.4, F3.5
 *
 * Shows a single application with:
 * - Stage timeline with current status highlighted
 * - Aging indicators (7d amber, 14d red)
 * - Job info summary
 * - Withdraw action
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api } from "../api";

interface ApplicationDetailProps {
  application: any;
  onBack: () => void;
  onWithdrawn?: () => void;
}

const STAGES = [
  { key: "applied", label: "Applied", icon: "paper-plane" as const },
  { key: "screening", label: "Under Review", icon: "eye" as const },
  { key: "shortlisted", label: "Shortlisted", icon: "star" as const },
  { key: "interviewing", label: "Interview", icon: "chatbubbles" as const },
  { key: "offered", label: "Offered", icon: "gift" as const },
  { key: "accepted", label: "Accepted", icon: "checkmark-circle" as const },
];

const TERMINAL_STAGES = ["rejected", "withdrawn", "completed"];

export default function ApplicationDetailScreen({
  application,
  onBack,
  onWithdrawn,
}: ApplicationDetailProps) {
  const insets = useSafeAreaInsets();
  const app = application;
  const currentStageIndex = STAGES.findIndex((s) => s.key === app.status);
  const isTerminal = TERMINAL_STAGES.includes(app.status);

  const getAgingDays = () => {
    const dateStr = app.appliedAt || app.createdAt;
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const ageDays = getAgingDays();
  const isStale = ageDays >= 14;
  const isAging = ageDays >= 7 && ageDays < 14;

  const handleWithdraw = () => {
    Alert.alert(
      "Withdraw Application",
      "Are you sure you want to withdraw this application? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            const res = await api(`/api/v1/applications/${app.id}/withdraw`, { method: "POST" });
            if (res.success) {
              Alert.alert("Withdrawn", "Your application has been withdrawn.");
              onWithdrawn?.();
            } else {
              Alert.alert("Error", "Could not withdraw application. Please try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Info Card */}
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{app.job?.title || "Position"}</Text>
          {app.job?.company && (
            <View style={styles.jobMeta}>
              <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.jobMetaText}>{app.job.company}</Text>
            </View>
          )}
          {app.job?.country && (
            <View style={styles.jobMeta}>
              <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.jobMetaText}>{app.job.country}</Text>
            </View>
          )}
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.dateText}>
              Applied {app.appliedAt || app.createdAt
                ? new Date(app.appliedAt || app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                : "recently"}
            </Text>
            {(isStale || isAging) && (
              <View style={[styles.ageBadge, isStale ? styles.ageBadgeRed : styles.ageBadgeAmber]}>
                <Text style={[styles.ageBadgeText, isStale ? styles.ageBadgeTextRed : styles.ageBadgeTextAmber]}>
                  {ageDays}d ago
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stage Timeline */}
        <View style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Application Timeline</Text>
          {STAGES.map((stage, index) => {
            const isPast = index <= currentStageIndex && !isTerminal;
            const isCurrent = index === currentStageIndex && !isTerminal;
            const isFuture = index > currentStageIndex || isTerminal;

            return (
              <View key={stage.key} style={styles.timelineRow}>
                {/* Connector line */}
                <View style={styles.connectorCol}>
                  {index > 0 && (
                    <View style={[styles.lineSegment, isPast && styles.lineActive]} />
                  )}
                  <View
                    style={[
                      styles.dot,
                      isPast && styles.dotActive,
                      isCurrent && styles.dotCurrent,
                    ]}
                  >
                    {isCurrent && (
                      <Ionicons name={stage.icon} size={14} color="#fff" />
                    )}
                    {isPast && !isCurrent && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                  </View>
                  {index < STAGES.length - 1 && (
                    <View style={[styles.lineSegment, isPast && index < currentStageIndex && styles.lineActive]} />
                  )}
                </View>

                {/* Label */}
                <View style={styles.stageLabel}>
                  <Text
                    style={[
                      styles.stageText,
                      isPast && styles.stageTextActive,
                      isCurrent && styles.stageTextCurrent,
                      isFuture && styles.stageTextFuture,
                    ]}
                  >
                    {stage.label}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Current Stage</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Terminal state */}
          {isTerminal && (
            <View style={styles.terminalRow}>
              <View style={[styles.terminalDot, app.status === "rejected" ? styles.terminalRejected : styles.terminalWithdrawn]}>
                <Ionicons
                  name={app.status === "rejected" ? "close" : "exit-outline"}
                  size={16}
                  color="#fff"
                />
              </View>
              <Text style={styles.terminalText}>
                {app.status === "rejected" ? "Application Rejected" :
                 app.status === "withdrawn" ? "Application Withdrawn" : "Completed"}
              </Text>
            </View>
          )}
        </View>

        {/* Offer action */}
        {app.status === "offered" && (
          <View style={styles.offerCard}>
            <Ionicons name="flash" size={24} color={colors.warning} />
            <Text style={styles.offerTitle}>⚡ Awaiting Your Action</Text>
            <Text style={styles.offerText}>
              You have received an offer for this position. Please review and respond on the web portal.
            </Text>
          </View>
        )}

        {/* Withdraw */}
        {!isTerminal && app.status !== "offered" && (
          <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdraw} activeOpacity={0.8}>
            <Ionicons name="exit-outline" size={18} color={colors.error} />
            <Text style={styles.withdrawText}>Withdraw Application</Text>
          </TouchableOpacity>
        )}
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

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Job Card
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  jobTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md },
  jobMeta: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  jobMetaText: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.sm },
  dateRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  dateText: { fontSize: fontSize.sm, color: colors.textTertiary, marginLeft: spacing.sm, flex: 1 },
  ageBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  ageBadgeAmber: { backgroundColor: colors.warningBg },
  ageBadgeRed: { backgroundColor: colors.errorBg },
  ageBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  ageBadgeTextAmber: { color: colors.warning },
  ageBadgeTextRed: { color: colors.error },

  // Timeline card
  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.lg },

  // Timeline
  timelineRow: { flexDirection: "row", minHeight: 48 },
  connectorCol: { width: 32, alignItems: "center" },
  lineSegment: { width: 2, flex: 1, backgroundColor: colors.border },
  lineActive: { backgroundColor: colors.primary },
  dot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  dotActive: { backgroundColor: colors.primary },
  dotCurrent: { backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: colors.primaryFaded },
  stageLabel: { flex: 1, justifyContent: "center", marginLeft: spacing.md },
  stageText: { fontSize: fontSize.sm },
  stageTextActive: { color: colors.text, fontWeight: fontWeight.medium },
  stageTextCurrent: { color: colors.primary, fontWeight: fontWeight.bold },
  stageTextFuture: { color: colors.textTertiary },
  currentBadge: {
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
    marginTop: spacing.xs,
  },
  currentBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.primary },

  // Terminal
  terminalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  terminalDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  terminalRejected: { backgroundColor: colors.error },
  terminalWithdrawn: { backgroundColor: colors.textTertiary },
  terminalText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text, marginLeft: spacing.md },

  // Offer
  offerCard: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warning + "30",
    alignItems: "center",
  },
  offerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text, marginTop: spacing.sm },
  offerText: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm, lineHeight: 20 },

  // Withdraw
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  withdrawText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.error, marginLeft: spacing.sm },
});
