/**
 * Profile Screen — F5
 *
 * Shows the current user's profile with:
 * - Profile header with avatar/initials
 * - Personal info display
 * - Quick action cards
 * - Logout button
 */

import React, { useState, useEffect, useCallback } from "react";
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
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { useAuth } from "../auth";
import { api, uploadFile } from "../api";
import { APP_VERSION, APP_BUILD } from "../config";
import { SkeletonProfile } from "../components/SkeletonLoader";

interface ProfileScreenProps {
  onBack?: () => void;
  onNavigateSettings?: () => void;
  onNavigateDocuments?: () => void;
  onNavigatePreferences?: () => void;
  onNavigateEducation?: () => void;
  onNavigateExperience?: () => void;
  onEditProfile?: (profile: any) => void;
}

export default function ProfileScreen({ onBack, onNavigateSettings, onNavigateDocuments, onNavigatePreferences, onNavigateEducation, onNavigateExperience, onEditProfile }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProfile = useCallback(async () => {
    const res = await api<any>("/api/v1/mobile/profile");
    if (res.success && res.data) {
      setProfile(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  }, [fetchProfile]);

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const handleUploadPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Sorry, we need camera roll permissions!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const file = result.assets[0];
      const name = file.fileName || `photo_${Date.now()}.jpg`;
      const type = file.mimeType || "image/jpeg";

      setRefreshing(true);
      const res = await uploadFile("/api/v1/candidate-self-service/photo", file.uri, name, type);
      
      if (res.success) {
        Alert.alert("Success", "Profile photo updated.");
        fetchProfile(); // reload profile
      } else {
        Alert.alert("Error", res.error?.message || "Failed to upload photo.");
        setRefreshing(false);
      }
    } catch (err) {
      Alert.alert("Upload Error", "Failed to pick image.");
      setRefreshing(false);
    }
  };

  const getInitials = () => {
    const name = profile?.fullName || user?.username || user?.email || "U";
    const parts = name.split(/[\s@]+/);
    return parts
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase())
      .join("");
  };

  const infoItems = [
    { icon: "mail-outline" as const, label: "Email", value: user?.email || profile?.email || "—" },
    { icon: "call-outline" as const, label: "Phone", value: profile?.phoneNumber || "Not provided" },
    { icon: "globe-outline" as const, label: "Language", value: (profile?.preferredLanguage || user?.preferredLanguage || "en").toUpperCase() },
    { icon: "shield-checkmark-outline" as const, label: "Aadhaar", value: profile?.aadhaarVerified ? "Verified ✓" : "Not verified" },
    { icon: "finger-print-outline" as const, label: "2FA", value: profile?.twoFactorEnabled ? "Enabled" : "Disabled" },
  ];

  const quickActions = [
    { id: "docs", icon: "cloud-upload-outline" as const, label: "Upload Documents", color: "#7c3aed" },
    { id: "edu", icon: "school-outline" as const, label: "Education", color: colors.primary },
    { id: "exp", icon: "briefcase-outline" as const, label: "Experience", color: "#0891b2" },
    { id: "prefs", icon: "options-outline" as const, label: "Preferences", color: "#0d9488" },
  ];

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
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>
        {onNavigateSettings && (
          <TouchableOpacity onPress={onNavigateSettings} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <SkeletonProfile />
        ) : (
          <>
            {/* Avatar Card */}
            <View style={styles.avatarCard}>
              <TouchableOpacity onPress={handleUploadPhoto} activeOpacity={0.8}>
                {profile?.photoUrl ? (
                  <Image source={{ uri: profile.photoUrl.startsWith('http') ? profile.photoUrl : `https://hirestream-stg.agentryx.dev${profile.photoUrl}` }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                    <View style={styles.editPhotoBadge}>
                      <Ionicons name="camera" size={14} color="#fff" />
                    </View>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.profileName}>
                {profile?.fullName || user?.email?.split("@")[0] || "Candidate"}
              </Text>
              <Text style={styles.profileRole}>
                {(user?.role || "candidate").charAt(0).toUpperCase() + (user?.role || "candidate").slice(1)}
              </Text>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active Account</Text>
              </View>
              {onEditProfile && (
                <TouchableOpacity
                  style={styles.editProfileBtn}
                  onPress={() => onEditProfile(profile)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="create-outline" size={16} color={colors.primary} />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Personal Info */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              {infoItems.map((item, i) => (
                <View
                  key={i}
                  style={[styles.infoRow, i < infoItems.length - 1 && styles.infoRowBorder]}
                >
                  <View style={styles.infoLeft}>
                    <Ionicons name={item.icon} size={20} color={colors.primary} />
                    <Text style={styles.infoLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.infoValue} numberOfLines={1}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actionsGrid}>
                {quickActions.map((action, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.actionItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (action.id === "docs" && onNavigateDocuments) {
                        onNavigateDocuments();
                      } else if (action.id === "prefs" && onNavigatePreferences) {
                        onNavigatePreferences();
                      } else if (action.id === "edu" && onNavigateEducation) {
                        onNavigateEducation();
                      } else if (action.id === "exp" && onNavigateExperience) {
                        onNavigateExperience();
                      }
                    }}
                  >
                    <View style={[styles.actionIconWrap, { backgroundColor: action.color + "12" }]}>
                      <Ionicons name={action.icon} size={24} color={action.color} />
                    </View>
                    <Text style={styles.actionLabel} numberOfLines={2}>
                      {action.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* App Info */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>App Information</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>{APP_VERSION} (build {APP_BUILD})</Text>
              </View>
              <View style={[styles.infoRow, styles.infoRowBorder]}>
                <Text style={styles.infoLabel}>Platform</Text>
                <Text style={styles.infoValue}>{Platform.OS === "ios" ? "iOS" : "Android"}</Text>
              </View>
            </View>

            {/* Logout */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color={colors.error} />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>Powered by HPSEDC, Shimla</Text>
          </>
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
  headerLeft: { flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.md },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
  settingsBtn: { padding: spacing.sm },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },

  // Loading
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxxl * 2,
  },

  // Avatar card
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
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  editPhotoBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
  },
  profileName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  profileRole: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.success,
  },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryFaded,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  editProfileText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },

  // Section card
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
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
  },

  // Info rows
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLeft: { flexDirection: "row", alignItems: "center" },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    maxWidth: "50%",
  },

  // Actions grid
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.sm,
  },
  actionItem: {
    width: "50%",
    padding: spacing.sm,
    alignItems: "center",
  },
  actionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: "center",
  },

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.errorBg,
    borderRadius: radius.md,
    paddingVertical: 14,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.error + "30",
  },
  logoutText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.error,
    marginLeft: spacing.sm,
  },

  // Footer
  footer: {
    textAlign: "center",
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginBottom: spacing.xl,
  },
});
