/**
 * My Applications Screen — F3.3
 *
 * Shows all applications by the current user, grouped by status:
 * - Active   (submitted, reviewed, shortlisted, interview_scheduled)
 * - Offers   (selected — offer issued, awaiting candidate response)
 * - Closed   (placed, rejected, withdrawn, completed)
 *
 * Features:
 * - Pull-to-refresh
 * - Aging badges (7d amber, 14d red) — F3.5
 * - "Awaiting your action" pill for offers — F3.6
 * - Tap to view detail
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Image, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api } from "../api";
import { SkeletonApplicationCard } from "../components/SkeletonLoader";

interface Application {
  id: string;
  jobId: string;
  status: string;
  matchScore?: number;
  appliedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // API returns flat fields, not nested job object
  jobTitle?: string;
  company?: string;
  country?: string;
  location?: string;
  salary?: string;
  job?: {
    id: string;
    title: string;
    company?: string;
    country?: string;
  };
}

interface MyApplicationsScreenProps {
  onBack?: () => void;
  onSelectApplication?: (app: any) => void;
}

// Keys MUST match server application.status values (see STATUS_ORDER in
// server/routes/application.routes.ts). Drift caused the v0.4.13 UAT
// "milestone lock" defect — interview_scheduled rows showed no chip
// because the map didn't list that key.
const STATUS_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; label: string }> = {
  submitted:           { icon: "paper-plane",      color: colors.info,         bg: colors.infoBg,       label: "Applied" },
  reviewed:            { icon: "eye",              color: colors.info,         bg: colors.infoBg,       label: "Under Review" },
  shortlisted:         { icon: "star",             color: colors.primary,      bg: colors.primaryFaded, label: "Shortlisted" },
  interview_scheduled: { icon: "chatbubbles",      color: colors.warning,      bg: colors.warningBg,    label: "Interview" },
  selected:            { icon: "gift",             color: colors.success,      bg: colors.successBg,    label: "Offer" },
  placed:              { icon: "checkmark-circle", color: colors.success,      bg: colors.successBg,    label: "Placed" },
  rejected:            { icon: "close-circle",     color: colors.error,        bg: colors.errorBg,      label: "Rejected" },
  withdrawn:           { icon: "exit",             color: colors.textTertiary, bg: colors.background,   label: "Withdrawn" },
  completed:           { icon: "checkmark-done",   color: colors.textTertiary, bg: colors.background,   label: "Completed" },
};

export default function MyApplicationsScreen({ onBack, onSelectApplication }: MyApplicationsScreenProps) {
  const insets = useSafeAreaInsets();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "offers" | "closed">("active");

  const fetchApplications = useCallback(async () => {
    const res = await api<any>("/api/v1/candidates/applications");
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : res.data.applications || [];
      setApplications(list);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchApplications();
    setRefreshing(false);
  }, [fetchApplications]);

  // Tab buckets. Every server-emitted status MUST land in exactly one
  // bucket — otherwise rows silently vanish from the screen (the v0.4.13
  // defect where interview_scheduled rows were nowhere).
  // submitted/reviewed/shortlisted/interview_scheduled → still working through pipeline
  // selected → offer issued, awaiting candidate accept/decline
  // placed/rejected/withdrawn/completed → closed
  const activeStatuses = ["submitted", "reviewed", "shortlisted", "interview_scheduled"];
  const offerStatuses = ["selected"];
  const closedStatuses = ["placed", "rejected", "withdrawn", "completed"];

  const filtered = applications.filter((a) => {
    if (activeTab === "active") return activeStatuses.includes(a.status);
    if (activeTab === "offers") return offerStatuses.includes(a.status);
    return closedStatuses.includes(a.status);
  });

  const getAgingDays = (dateStr?: string) => {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderApplicationCard = ({ item: app }: { item: Application }) => {
    const config = STATUS_CONFIG[app.status] || STATUS_CONFIG.submitted;
    const ageDays = getAgingDays(app.appliedAt || app.createdAt);
    const isStale = ageDays >= 14;
    const isAging = ageDays >= 7 && ageDays < 14;

    return (
      <TouchableOpacity style={styles.appCard} activeOpacity={0.7} onPress={() => onSelectApplication?.(app)}>
        {/* Status + Aging */}
        <View style={styles.appTopRow}>
          <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={14} color={config.color} />
            <Text style={[styles.statusChipText, { color: config.color }]}>{config.label}</Text>
          </View>
          <View style={styles.agingRow}>
            {app.status === "selected" && (
              <View style={styles.actionPill}>
                <Ionicons name="flash" size={12} color={colors.warning} />
                <Text style={styles.actionPillText}>Awaiting your action</Text>
              </View>
            )}
            {isStale && (
              <View style={[styles.ageBadge, styles.ageBadgeRed]}>
                <Text style={styles.ageBadgeText}>{ageDays}d</Text>
              </View>
            )}
            {isAging && !isStale && (
              <View style={[styles.ageBadge, styles.ageBadgeAmber]}>
                <Text style={styles.ageBadgeText}>{ageDays}d</Text>
              </View>
            )}
          </View>
        </View>

        {/* Job Info */}
        <Text style={styles.appJobTitle} numberOfLines={2}>
          {app.jobTitle || app.job?.title || "Position"}
        </Text>
        {(app.company || app.job?.company) && (
          <View style={styles.appCompanyRow}>
            <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.appCompanyText}>{app.company || app.job?.company}</Text>
            {(app.country || app.job?.country) && (
              <>
                <Text style={styles.dotSeparator}>·</Text>
                <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.appCompanyText}>{app.country || app.job?.country}</Text>
              </>
            )}
          </View>
        )}

        {/* Date */}
        <Text style={styles.appDate}>
          Applied {app.appliedAt || app.createdAt
            ? new Date(app.appliedAt || app.createdAt!).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
            : "recently"}
        </Text>
      </TouchableOpacity>
    );
  };

  const tabCounts = {
    active: applications.filter((a) => activeStatuses.includes(a.status)).length,
    offers: applications.filter((a) => offerStatuses.includes(a.status)).length,
    closed: applications.filter((a) => closedStatuses.includes(a.status)).length,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../assets/hpsedc-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>My Applications</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(["active", "offers", "closed"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === "active" ? "Active" : tab === "offers" ? "Offers" : "Closed"}
            </Text>
            {tabCounts[tab] > 0 && (
              <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                  {tabCounts[tab]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.listContent}>
          <SkeletonApplicationCard />
          <SkeletonApplicationCard />
          <SkeletonApplicationCard />
          <SkeletonApplicationCard />
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderApplicationCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === "offers" ? "gift-outline" : activeTab === "closed" ? "archive-outline" : "document-outline"}
                size={64}
                color={colors.textTertiary}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "active" ? "No active applications" : activeTab === "offers" ? "No offers yet" : "No closed applications"}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === "active"
                  ? "Browse jobs and apply to get started!"
                  : activeTab === "offers"
                  ? "Keep applying — offers will appear here."
                  : "Your completed applications will show here."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    backgroundColor: colors.primaryDark,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: "#ffffff" },
  tabBar: {
    flexDirection: "row", backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg, paddingBottom: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: spacing.md, gap: spacing.xs,
    borderBottomWidth: 2.5, borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.textTertiary },
  tabTextActive: { color: colors.primary, fontWeight: fontWeight.semibold },
  tabBadge: {
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.border, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  tabBadgeActive: { backgroundColor: colors.primaryFaded },
  tabBadgeText: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.textTertiary },
  tabBadgeTextActive: { color: colors.primary },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.textSecondary },
  listContent: { padding: spacing.xl },
  appCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  appTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  statusChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full,
  },
  statusChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  agingRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  actionPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.warningBg, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full,
  },
  actionPillText: { fontSize: 11, fontWeight: fontWeight.semibold, color: colors.warning },
  ageBadge: { width: 28, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ageBadgeAmber: { backgroundColor: colors.warningBg },
  ageBadgeRed: { backgroundColor: colors.errorBg },
  ageBadgeText: { fontSize: 10, fontWeight: fontWeight.bold, color: colors.error },
  appJobTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  appCompanyRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm },
  appCompanyText: { fontSize: fontSize.sm, color: colors.textSecondary },
  dotSeparator: { color: colors.textTertiary, marginHorizontal: 2 },
  appDate: { fontSize: fontSize.xs, color: colors.textTertiary },
  emptyContainer: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.xl },
});
