/**
 * Filter Bar Component — F2.2
 *
 * Horizontal scrollable filter chips for job listing.
 * Supports:
 * - Country (dropdown)
 * - Skill/category (dropdown)
 * - Salary range (dropdown)
 * - Experience level (dropdown)
 *
 * Active filters show as highlighted chips with a clear (×) button.
 * Tapping a chip opens a bottom sheet modal with options.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";

// ── Filter Config ────────────────────────────────────────────────────
export interface Filters {
  country?: string;
  skill?: string;
  salaryRange?: string;
  experience?: string;
}

interface FilterOption {
  label: string;
  value: string;
}

interface FilterDef {
  key: keyof Filters;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  options: FilterOption[];
}

const FILTER_DEFS: FilterDef[] = [
  {
    key: "country",
    label: "Country",
    icon: "globe-outline",
    options: [
      { label: "All Countries", value: "" },
      { label: "Australia", value: "Australia" },
      { label: "Canada", value: "Canada" },
      { label: "Germany", value: "Germany" },
      { label: "UAE", value: "UAE" },
      { label: "Saudi Arabia", value: "Saudi Arabia" },
      { label: "Qatar", value: "Qatar" },
      { label: "United Kingdom", value: "United Kingdom" },
      { label: "Singapore", value: "Singapore" },
      { label: "New Zealand", value: "New Zealand" },
      { label: "India", value: "India" },
    ],
  },
  {
    key: "skill",
    label: "Category",
    icon: "briefcase-outline",
    options: [
      { label: "All Categories", value: "" },
      { label: "IT & Software", value: "IT" },
      { label: "Healthcare", value: "Healthcare" },
      { label: "Engineering", value: "Engineering" },
      { label: "Construction", value: "Construction" },
      { label: "Hospitality", value: "Hospitality" },
      { label: "Teaching", value: "Teaching" },
      { label: "Finance", value: "Finance" },
      { label: "Logistics", value: "Logistics" },
    ],
  },
  {
    key: "salaryRange",
    label: "Salary",
    icon: "cash-outline",
    options: [
      { label: "Any Salary", value: "" },
      { label: "₹5L – ₹10L", value: "5-10" },
      { label: "₹10L – ₹20L", value: "10-20" },
      { label: "₹20L – ₹30L", value: "20-30" },
      { label: "₹30L – ₹50L", value: "30-50" },
      { label: "₹50L+", value: "50+" },
    ],
  },
  {
    key: "experience",
    label: "Experience",
    icon: "time-outline",
    options: [
      { label: "Any Experience", value: "" },
      { label: "Fresher (0–1 yr)", value: "0-1" },
      { label: "1–3 years", value: "1-3" },
      { label: "3–5 years", value: "3-5" },
      { label: "5–10 years", value: "5-10" },
      { label: "10+ years", value: "10+" },
    ],
  },
];

// ── FilterBar Component ──────────────────────────────────────────────
interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, onFiltersChange }: FilterBarProps) {
  const [activeModal, setActiveModal] = useState<FilterDef | null>(null);

  const activeCount = Object.values(filters).filter(Boolean).length;

  const handleSelect = (key: keyof Filters, value: string) => {
    onFiltersChange({ ...filters, [key]: value || undefined });
    setActiveModal(null);
  };

  const handleClearAll = () => {
    onFiltersChange({});
  };

  return (
    <>
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Filter icon */}
          <View style={styles.filterIconWrap}>
            <Ionicons name="options-outline" size={18} color={colors.primary} />
            {activeCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{activeCount}</Text>
              </View>
            )}
          </View>

          {/* Filter chips */}
          {FILTER_DEFS.map((def) => {
            const isActive = !!filters[def.key];
            const activeOption = def.options.find(
              (o) => o.value === filters[def.key]
            );

            return (
              <TouchableOpacity
                key={def.key}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveModal(def)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={def.icon}
                  size={14}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.chipText,
                    isActive && styles.chipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {isActive ? activeOption?.label || def.label : def.label}
                </Text>
                {isActive ? (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation?.();
                      handleSelect(def.key, "");
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={colors.textTertiary}
                  />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Clear all */}
          {activeCount > 0 && (
            <TouchableOpacity
              style={styles.clearChip}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={14} color={colors.error} />
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Bottom sheet modal */}
      {activeModal && (
        <Modal
          visible
          transparent
          animationType="slide"
          onRequestClose={() => setActiveModal(null)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setActiveModal(null)}
          >
            <Pressable style={styles.modalContent} onPress={() => {}}>
              {/* Handle */}
              <View style={styles.modalHandle} />

              {/* Title */}
              <Text style={styles.modalTitle}>
                Select {activeModal.label}
              </Text>

              {/* Options */}
              <FlatList
                data={activeModal.options}
                keyExtractor={(item) => item.value || "all"}
                renderItem={({ item }) => {
                  const isSelected =
                    (filters[activeModal.key] || "") === item.value;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.optionRow,
                        isSelected && styles.optionRowSelected,
                      ]}
                      onPress={() =>
                        handleSelect(activeModal.key, item.value)
                      }
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.optionList}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
  },

  // Filter icon
  filterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.xs,
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 10,
    fontWeight: "700" as any,
    color: "#fff",
  },

  // Chips
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    maxWidth: 180,
  },
  chipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // Clear
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  clearText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.error,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 34,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.lg,
  },

  // Options
  optionList: {
    paddingHorizontal: spacing.lg,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
  },
  optionRowSelected: {
    backgroundColor: colors.primaryFaded,
  },
  optionText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  optionTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
