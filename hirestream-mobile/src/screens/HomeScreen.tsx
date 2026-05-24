/**
 * Home Screen — F2.1
 *
 * Main dashboard after login. Shows:
 * - Welcome header with user info + logout
 * - Quick stats bar
 * - Job listing with search/filter
 * - Pull-to-refresh
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, StatusBar, Alert, Image, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { useAuth } from "../auth";
import { api } from "../api";
import FilterBar, { Filters } from "../components/FilterBar";
import { SkeletonJobCard } from "../components/SkeletonLoader";

interface Job {
  id: string;
  title: string;
  company?: string;
  country?: string;
  location?: string;
  salary?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  experience?: number;
  experienceMin?: number;
  experienceMax?: number;
  status?: string;
  createdAt?: string;
  skills?: string[];
}

interface HomeScreenProps {
  onSelectJob?: (job: Job, isApplied: boolean) => void;
  onNavigateTab?: (tab: string) => void;
}

export default function HomeScreen({ onSelectJob, onNavigateTab }: HomeScreenProps) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({});

  const fetchJobs = useCallback(async () => {
    // Fetch jobs and user's applications in parallel
    const [jobsRes, appsRes] = await Promise.all([
      api<{ jobs: Job[] }>("/api/v1/jobs"),
      api<any>("/api/v1/candidates/applications"),
    ]);
    let jobList: Job[] = [];
    if (jobsRes.success && jobsRes.data) {
      jobList = Array.isArray(jobsRes.data) ? jobsRes.data : jobsRes.data.jobs || [];
      setJobs(jobList);
    }
    if (appsRes.success && appsRes.data) {
      const appsList = Array.isArray(appsRes.data) ? appsRes.data : [];
      // Build IDs directly from applications
      const ids = new Set<string>(appsList.map((a: any) => a.jobId));
      // Cross-job dedupe: also match by title+company (same logic as backend)
      const appliedKeys = new Set<string>(
        appsList.map((a: any) => `${a.jobTitle}|${a.company}`.toLowerCase())
      );
      // Add job IDs that match by title+company even if jobId differs
      for (const j of jobList) {
        if (j.title && j.company) {
          const key = `${j.title}|${j.company}`.toLowerCase();
          if (appliedKeys.has(key)) ids.add(j.id);
        }
      }
      setAppliedJobIds(ids);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  }, [fetchJobs]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const filteredJobs = jobs.filter((j) => {
    // Text search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matches =
        j.title?.toLowerCase().includes(q) ||
        j.company?.toLowerCase().includes(q) ||
        j.country?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    // Country filter
    if (filters.country && j.country !== filters.country) return false;
    // Skill/category filter
    if (filters.skill) {
      const hasSkill = j.skills?.some((s) =>
        s.toLowerCase().includes(filters.skill!.toLowerCase())
      );
      const categoryMatch = j.title?.toLowerCase().includes(filters.skill.toLowerCase());
      if (!hasSkill && !categoryMatch) return false;
    }
    // Salary filter
    if (filters.salaryRange) {
      const min = j.salaryMin || 0;
      const minLakhs = min / 100000;
      const [lo, hi] = filters.salaryRange.includes("+")
        ? [parseInt(filters.salaryRange), Infinity]
        : filters.salaryRange.split("-").map(Number);
      if (minLakhs < lo || (hi !== Infinity && minLakhs > hi)) return false;
    }
    // Experience filter
    if (filters.experience) {
      const exp = j.experience ?? j.experienceMin ?? 0;
      const [lo, hi] = filters.experience.includes("+")
        ? [parseInt(filters.experience), Infinity]
        : filters.experience.split("-").map(Number);
      if (exp < lo || (hi !== Infinity && exp > hi)) return false;
    }
    return true;
  });

  const formatSalary = (job: Job) => {
    if (job.salary) return job.salary;
    if (!job.salaryMin) return null;
    const currency = job.salaryCurrency || "USD";
    const min = (job.salaryMin / 1000).toFixed(0);
    const max = job.salaryMax ? (job.salaryMax / 1000).toFixed(0) : null;
    return max ? `${currency} ${min}K – ${max}K` : `${currency} ${min}K+`;
  };

  const renderJobCard = ({ item: job }: { item: Job }) => {
    const isApplied = appliedJobIds.has(job.id);
    return (
    <TouchableOpacity style={[styles.jobCard, isApplied && styles.jobCardApplied]} activeOpacity={0.7} onPress={() => onSelectJob?.(job, isApplied)}>
      <View style={styles.jobHeader}>
        <View style={styles.jobTitleRow}>
          <Text style={styles.jobTitle} numberOfLines={2}>{job.title || "Untitled Position"}</Text>
          {isApplied ? (
            <View style={styles.appliedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#7c3aed" />
              <Text style={styles.appliedBadgeText}>Applied</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, (job.status === "open" || job.status === "active") ? styles.statusOpen : styles.statusOther]}>
              <Text style={styles.statusText}>{(job.status === "active" || job.status === "open") ? "Open" : (job.status || "draft")}</Text>
            </View>
          )}
        </View>
        {job.company && (
          <View style={styles.companyRow}>
            <Ionicons name="business-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.companyText}>{job.company}</Text>
          </View>
        )}
      </View>

      <View style={styles.jobDetails}>
        {(job.country || job.location) && (
          <View style={styles.detailChip}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.detailText}>{job.location || job.country}</Text>
          </View>
        )}
        {formatSalary(job) && (
          <View style={styles.detailChip}>
            <Ionicons name="cash-outline" size={14} color={colors.success} />
            <Text style={styles.detailText}>{formatSalary(job)}</Text>
          </View>
        )}
        {(job.experience !== undefined || (job.experienceMin !== undefined && job.experienceMin !== null)) && (
          <View style={styles.detailChip}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <Text style={styles.detailText}>
              {job.experience !== undefined ? `${job.experience}+ yr exp` : `${job.experienceMin}–${job.experienceMax || "10+"}y exp`}
            </Text>
          </View>
        )}
      </View>

      {job.skills && job.skills.length > 0 && (
        <View style={styles.skillsRow}>
          {job.skills.slice(0, 3).map((skill, i) => (
            <View key={i} style={styles.skillChip}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {job.skills.length > 3 && (
            <Text style={styles.moreSkills}>+{job.skills.length - 3}</Text>
          )}
        </View>
      )}

      <View style={styles.jobFooter}>
        <Text style={styles.postedDate}>
          {job.createdAt ? `Posted ${new Date(job.createdAt).toLocaleDateString()}` : ""}
        </Text>
        <View style={styles.applyHint}>
          <Text style={[styles.applyHintText, isApplied && styles.applyHintApplied]}>
            {isApplied ? "View Application" : "View Details"}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={isApplied ? "#7c3aed" : colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require("../../assets/hpsedc-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.email?.split("@")[0] || "Candidate"}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={22} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <TouchableOpacity style={styles.statItem} activeOpacity={0.7}>
          <Text style={styles.statNumber}>{jobs.length}</Text>
          <Text style={styles.statLabel}>Open Jobs</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => onNavigateTab?.("applications")}>
          <Text style={styles.statNumber}>{appliedJobIds.size}</Text>
          <Text style={styles.statLabel}>Applied</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} activeOpacity={0.7} onPress={() => onNavigateTab?.("applications")}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Interviews</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={20} color={colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, companies, countries..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <FilterBar filters={filters} onFiltersChange={setFilters} />

      {/* Job List */}
      {loading ? (
        <View style={styles.listContent}>
          <SkeletonJobCard />
          <SkeletonJobCard />
          <SkeletonJobCard />
        </View>
      ) : (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="briefcase-outline" size={64} color={colors.textTertiary} />
              <Text style={styles.emptyTitle}>
                {search ? "No matching jobs" : "No jobs available"}
              </Text>
              <Text style={styles.emptyText}>
                {search
                  ? "Try adjusting your search terms"
                  : "New opportunities will appear here. Pull down to refresh."}
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
  headerBar: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    backgroundColor: colors.primaryDark,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 56, height: 56, borderRadius: 28, marginRight: spacing.md },
  greeting: { fontSize: fontSize.sm, color: "rgba(255,255,255,0.7)" },
  userName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: "#ffffff", marginTop: 2 },
  logoutButton: { padding: spacing.sm },
  statsBar: {
    flexDirection: "row", backgroundColor: colors.surface,
    marginHorizontal: spacing.xl, marginTop: spacing.lg,
    borderRadius: radius.lg, padding: spacing.lg,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  searchWrapper: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.surface, marginHorizontal: spacing.xl, marginTop: spacing.lg,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    height: 48, paddingHorizontal: spacing.md,
  },
  searchIcon: { marginRight: spacing.sm },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: spacing.md, fontSize: fontSize.md, color: colors.textSecondary },
  listContent: { padding: spacing.xl, paddingTop: spacing.lg },
  jobCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  jobCardApplied: {
    borderColor: "#7c3aed30",
    backgroundColor: "#f5f3ff",
  },
  jobHeader: { marginBottom: spacing.md },
  jobTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  jobTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, flex: 1, marginRight: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  statusOpen: { backgroundColor: colors.successBg },
  statusOther: { backgroundColor: colors.infoBg },
  statusText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.success, textTransform: "capitalize" },
  companyRow: { flexDirection: "row", alignItems: "center", marginTop: spacing.xs },
  companyText: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: spacing.xs },
  jobDetails: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  detailChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  detailText: { fontSize: fontSize.xs, color: colors.text, marginLeft: 4 },
  skillsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.md },
  skillChip: { backgroundColor: colors.primaryFaded, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  skillText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: fontWeight.medium },
  moreSkills: { fontSize: fontSize.xs, color: colors.textTertiary, alignSelf: "center", marginLeft: spacing.xs },
  jobFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  postedDate: { fontSize: fontSize.xs, color: colors.textTertiary },
  applyHint: { flexDirection: "row", alignItems: "center" },
  applyHintText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium, marginRight: 2 },
  applyHintApplied: { color: "#7c3aed" },
  appliedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f5f3ff", paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm,
    borderWidth: 1, borderColor: "#7c3aed30",
  },
  appliedBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: "#7c3aed" },
  emptyContainer: { alignItems: "center", paddingVertical: spacing.xxxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text, marginTop: spacing.lg },
  emptyText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" },
});
