/**
 * Notifications Screen — F4
 *
 * Live notification inbox wired to the backend:
 *   GET  /api/v1/mobile/notifications           — fetch all
 *   PATCH /api/v1/mobile/notifications/:id/read — mark one read
 *   PATCH /api/v1/mobile/notifications/read-all — mark all read
 *
 * Shows:
 * - Application status updates
 * - Interview invitations
 * - System announcements
 * - Read/unread state with blue accent
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { api } from "../api";
import { SkeletonNotification } from "../components/SkeletonLoader";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  severity?: string;
  metadata?: any;
  createdAt: string;
}

interface NotificationsScreenProps {
  onBack?: () => void;
}

export default function NotificationsScreen({ onBack }: NotificationsScreenProps) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    const res = await api<any>("/api/v1/mobile/notifications");
    if (res.success && res.data) {
      const items = Array.isArray(res.data)
        ? res.data
        : res.data.notifications || [];
      setNotifications(items);
    } else {
      // API error — show empty, don't fake data
      setNotifications([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, [fetchNotifications]);

  // ── Mark single notification as read ──────────────────────────────
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    api(`/api/v1/mobile/notifications/${id}/read`, { method: "PATCH" }).catch(() => {});
  };

  // ── Mark all as read ──────────────────────────────────────────────
  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const res = await api("/api/v1/mobile/notifications/read-all", { method: "PATCH" });
    if (!res.success) {
      // If no bulk endpoint, mark individually
      const unread = notifications.filter((n) => !n.isRead);
      for (const n of unread) {
        api(`/api/v1/mobile/notifications/${n.id}/read`, { method: "PATCH" }).catch(() => {});
      }
    }
  };

  // ── Icon / color helpers ──────────────────────────────────────────
  const getIcon = (type: string, severity?: string): keyof typeof Ionicons.glyphMap => {
    if (type === "application_update" || type === "application") return "document-text";
    if (type === "interview") return "calendar";
    if (type === "system" || type === "announcement") return "megaphone";
    if (severity === "positive") return "checkmark-circle";
    if (severity === "warning") return "alert-circle";
    return "notifications";
  };

  const getIconColor = (type: string, severity?: string): string => {
    if (severity === "positive") return colors.success;
    if (severity === "warning") return colors.warning;
    if (type === "application_update" || type === "application") return colors.primary;
    if (type === "interview") return "#7c3aed";
    if (type === "system" || type === "announcement") return colors.warning;
    return colors.info;
  };

  const getTimeAgo = (dateStr: string): string => {
    if (!dateStr) return "";
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return "";
    const diffMs = now - then;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconColor = getIconColor(item.type, item.severity);
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.isRead && styles.notifUnread]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: iconColor + "14" }]}>
          <Ionicons name={getIcon(item.type, item.severity)} size={22} color={iconColor} />
        </View>
        <View style={styles.notifContent}>
          <View style={styles.notifHeader}>
            <Text
              style={[styles.notifTitle, !item.isRead && styles.notifTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifMessage} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.notifTime}>{getTimeAgo(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Ionicons name="checkmark-done" size={18} color="#ffffff" />
            </TouchableOpacity>
          )}
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.listContent}>
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
          <SkeletonNotification />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! New updates about your applications and jobs will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primaryDark,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  markAllBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  badge: {
    backgroundColor: colors.error,
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
    maxWidth: 300,
  },

  // List
  listContent: {
    padding: spacing.xl,
    paddingTop: spacing.lg,
  },

  // Notification card
  notifCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    backgroundColor: colors.primaryFaded || "#f0f4ff",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  notifContent: { flex: 1 },
  notifHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  notifTitleUnread: { fontWeight: fontWeight.bold, color: colors.primaryDark },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  notifMessage: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
  },
  notifTime: {
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
