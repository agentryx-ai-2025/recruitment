/**
 * Forgot Password Screen — F1.4
 */

import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
  Image, StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { useAuth } from "../auth";

interface ForgotPasswordScreenProps {
  onNavigateLogin: () => void;
}

export default function ForgotPasswordScreen({ onNavigateLogin }: ForgotPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    await forgotPassword(email.trim().toLowerCase());
    setLoading(false);
    setSent(true);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Image
            source={require("../../assets/hpsedc-logo.png")}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.title}>{sent ? "Email Sent!" : "Reset Password"}</Text>
          <Text style={styles.subtitle}>
            {sent
              ? "If an account exists with that email, you'll receive a reset link shortly."
              : "Enter your email to receive a password reset link."}
          </Text>
        </View>

        {!sent && (
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <Text style={styles.submitText}>Send Reset Link</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Back to login link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={onNavigateLogin}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {sent && (
          <TouchableOpacity style={styles.backToLoginButton} onPress={onNavigateLogin} activeOpacity={0.85}>
            <Text style={styles.submitText}>Back to Sign In</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl },
  header: {
    alignItems: "center",
    paddingBottom: spacing.xl,
  },
  headerLogo: { width: 100, height: 100, borderRadius: 50, marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: "#ffffff" },
  subtitle: { fontSize: fontSize.md, color: "rgba(255,255,255,0.75)", marginTop: spacing.sm, textAlign: "center", lineHeight: 22 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  inputGroup: { marginBottom: spacing.xl },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.sm },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.background, height: 52, paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text, height: "100%" },
  submitButton: {
    backgroundColor: colors.primary, height: 52, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textInverse },
  backToLoginButton: {
    backgroundColor: colors.primary, height: 52, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", marginTop: spacing.lg,
  },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg },
  footerText: { fontSize: fontSize.lg, color: "rgba(255,255,255,0.8)" },
  footerLink: { fontSize: fontSize.lg, color: "#ffffff", fontWeight: fontWeight.bold, textDecorationLine: "underline" as const },
});
