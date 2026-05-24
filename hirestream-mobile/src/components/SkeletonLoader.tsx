/**
 * Skeleton Loader Component — F2.5
 *
 * Animated placeholder content that shows while data is loading.
 * Uses a shimmer effect (left-to-right gradient sweep) to indicate
 * activity. Much more premium than a simple spinner.
 *
 * Usage:
 *   <SkeletonLoader width={200} height={20} />
 *   <SkeletonJobCard />
 *   <SkeletonProfileCard />
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { colors, spacing, radius } from "../theme";

// ── Base Skeleton Block ──────────────────────────────────────────────
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.7,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: "#e2e8f0",
          opacity: pulse,
        },
        style,
      ]}
    />
  );
}

// ── Job Card Skeleton ────────────────────────────────────────────────
export function SkeletonJobCard() {
  return (
    <View style={skeletonStyles.jobCard}>
      {/* Company badge */}
      <View style={skeletonStyles.rowBetween}>
        <SkeletonLoader width={100} height={14} />
        <SkeletonLoader width={60} height={22} borderRadius={11} />
      </View>

      {/* Title */}
      <SkeletonLoader width="80%" height={20} style={{ marginTop: 14 }} />

      {/* Meta rows */}
      <View style={[skeletonStyles.row, { marginTop: 12 }]}>
        <SkeletonLoader width={16} height={16} borderRadius={4} />
        <SkeletonLoader width={120} height={14} style={{ marginLeft: 8 }} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 8 }]}>
        <SkeletonLoader width={16} height={16} borderRadius={4} />
        <SkeletonLoader width={90} height={14} style={{ marginLeft: 8 }} />
      </View>

      {/* Skills chips */}
      <View style={[skeletonStyles.row, { marginTop: 14 }]}>
        <SkeletonLoader width={60} height={26} borderRadius={13} />
        <SkeletonLoader width={80} height={26} borderRadius={13} style={{ marginLeft: 8 }} />
        <SkeletonLoader width={50} height={26} borderRadius={13} style={{ marginLeft: 8 }} />
      </View>

      {/* Footer */}
      <View style={[skeletonStyles.rowBetween, { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9" }]}>
        <SkeletonLoader width={100} height={14} />
        <SkeletonLoader width={80} height={32} borderRadius={8} />
      </View>
    </View>
  );
}

// ── Application Card Skeleton ────────────────────────────────────────
export function SkeletonApplicationCard() {
  return (
    <View style={skeletonStyles.appCard}>
      <View style={skeletonStyles.rowBetween}>
        <SkeletonLoader width="60%" height={18} />
        <SkeletonLoader width={70} height={22} borderRadius={11} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 10 }]}>
        <SkeletonLoader width={16} height={16} borderRadius={4} />
        <SkeletonLoader width={130} height={14} style={{ marginLeft: 8 }} />
      </View>
      <View style={[skeletonStyles.row, { marginTop: 6 }]}>
        <SkeletonLoader width={16} height={16} borderRadius={4} />
        <SkeletonLoader width={100} height={14} style={{ marginLeft: 8 }} />
      </View>
    </View>
  );
}

// ── Profile Skeleton ─────────────────────────────────────────────────
export function SkeletonProfile() {
  return (
    <View>
      {/* Avatar */}
      <View style={skeletonStyles.avatarCard}>
        <SkeletonLoader width={80} height={80} borderRadius={40} />
        <SkeletonLoader width={180} height={22} style={{ marginTop: 14 }} />
        <SkeletonLoader width={80} height={14} style={{ marginTop: 8 }} />
        <SkeletonLoader width={120} height={28} borderRadius={14} style={{ marginTop: 12 }} />
      </View>

      {/* Info section */}
      <View style={skeletonStyles.sectionCard}>
        <SkeletonLoader width={160} height={18} style={{ marginBottom: 16 }} />
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[skeletonStyles.rowBetween, { marginBottom: 16 }]}>
            <View style={skeletonStyles.row}>
              <SkeletonLoader width={20} height={20} borderRadius={4} />
              <SkeletonLoader width={70} height={14} style={{ marginLeft: 12 }} />
            </View>
            <SkeletonLoader width={100} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Notification Skeleton ────────────────────────────────────────────
export function SkeletonNotification() {
  return (
    <View style={skeletonStyles.notifCard}>
      <SkeletonLoader width={44} height={44} borderRadius={12} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <SkeletonLoader width="70%" height={16} />
        <SkeletonLoader width="100%" height={14} style={{ marginTop: 6 }} />
        <SkeletonLoader width={60} height={12} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const skeletonStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  jobCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  appCard: {
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
  avatarCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionCard: {
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
});
