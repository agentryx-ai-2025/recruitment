/**
 * Bottom Tab Bar — Shared navigation component
 *
 * Renders the 4-tab navigation bar used on all main screens.
 * Highlights the active tab and fires navigation callbacks.
 */

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, fontWeight } from "../theme";

export type TabName = "jobs" | "applications" | "notifications" | "profile";

interface BottomTabBarProps {
  activeTab: TabName;
  onNavigate: (tab: TabName) => void;
}

const tabs: { key: TabName; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "jobs", label: "Jobs", icon: "briefcase-outline", activeIcon: "briefcase" },
  { key: "applications", label: "Applications", icon: "document-text-outline", activeIcon: "document-text" },
  { key: "notifications", label: "Alerts", icon: "notifications-outline", activeIcon: "notifications" },
  { key: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

export default function BottomTabBar({ activeTab, onNavigate }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onNavigate(tab.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={`${tab.label} tab${isActive ? ", selected" : ""}`}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={26}
              color={isActive ? colors.primary : colors.textTertiary}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    position: "relative",
  },
  label: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  activeIndicator: {
    position: "absolute",
    top: -spacing.sm - 1,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
});
