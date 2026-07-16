/**
 * Login Screen — F1.2
 * Portal-matching design with HPSEDC branding.
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../auth";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";

interface Props {
  onNavigateRegister: () => void;
  onNavigateForgot: () => void;
}

export default function LoginScreen({ onNavigateRegister, onNavigateForgot }: Props) {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false)
    );
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const handleLogin = async () => {
    setError("");
    if (!email.trim()) return setError("Username or email is required");
    if (!password) return setError("Password is required");
    if (password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error || "Login failed");
  };

  // One-tap demo logins — reuse the normal login with the seeded demo password.
  const DEMO_CAST = [
    { u: "arjun_thakur", name: "Arjun Thakur", role: "Construction · Placed in Dubai" },
    { u: "priya_verma", name: "Priya Verma", role: "Reg. Nurse · Germany" },
    { u: "vikram_negi", name: "Vikram Negi", role: "Welder · Invited to a drive" },
  ];
  const demoLogin = async (username: string) => {
    setError("");
    setLoading(true);
    const result = await login(username, "test123");
    setLoading(false);
    if (!result.success) setError(result.error || "Login failed");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Top gradient header */}
      <View style={[styles.header, keyboardVisible && styles.headerCompact, { paddingTop: insets.top + (keyboardVisible ? 4 : spacing.md) }]}>
        <Image
          source={require("../../assets/hpsedc-logo.png")}
          style={keyboardVisible ? styles.logoCompact : styles.logo}
          resizeMode="contain"
        />
        {!keyboardVisible && <Text style={styles.brandTitle}>HireStream</Text>}
        {!keyboardVisible && (
          <Text style={styles.brandSubtitle}>
            HP Overseas Employment Portal
          </Text>
        )}
      </View>

      {/* Login form card */}
      <ScrollView
        style={styles.formArea}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign In</Text>
          <Text style={styles.cardSubtitle}>
            Enter your credentials to continue
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Username or Email</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. mobiletest or you@example.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="default"
              autoComplete="username"
              accessibilityLabel="Username or email"
              accessibilityHint="Enter your username or email to sign in"
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textTertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
              accessibilityRole="button"
            >
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onNavigateForgot} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
            accessibilityLabel="Sign in"
            accessibilityRole="button"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={onNavigateRegister}
            activeOpacity={0.8}
          >
            <Text style={styles.registerBtnText}>Create New Account</Text>
          </TouchableOpacity>

          {/* Demo Mode — one-tap logins (testing build) */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>⚡ Demo Mode — tap to sign in</Text>
            {DEMO_CAST.map((c) => (
              <TouchableOpacity
                key={c.u}
                style={styles.demoBtn}
                onPress={() => demoLogin(c.u)}
                disabled={loading}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Demo login as ${c.name}`}
              >
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} style={{ marginRight: spacing.sm }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoName}>{c.name}</Text>
                  <Text style={styles.demoRole}>{c.role}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.footer}>
          Powered by HPSEDC, Shimla
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primaryDark },

  // ── Header ──
  header: {
    alignItems: "center",
    paddingBottom: spacing.xl,
    backgroundColor: colors.primaryDark,
  },
  headerCompact: {
    paddingBottom: spacing.sm,
  },
  logo: {
    width: 110,
    height: 110,
    marginBottom: spacing.md,
    borderRadius: 55,
  },
  logoCompact: {
    width: 48,
    height: 48,
    marginBottom: spacing.xs,
    borderRadius: 24,
  },
  brandTitle: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: fontSize.sm,
    color: "rgba(255,255,255,0.75)",
    marginTop: spacing.xs,
  },

  // ── Form area ──
  formArea: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  formContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: 120,
  },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },

  // ── Error ──
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  errorText: { color: colors.error, fontSize: fontSize.sm },

  // ── Labels ──
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  // ── Inputs ──
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: { marginRight: spacing.sm },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: fontSize.md,
    color: colors.text,
  },
  showHide: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },

  // ── Forgot ──
  forgotLink: { alignSelf: "flex-end", marginTop: spacing.sm, marginBottom: spacing.lg },
  forgotText: { fontSize: fontSize.sm, color: colors.primary, fontWeight: fontWeight.medium },

  // ── Buttons ──
  loginBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },

  // ── Divider ──
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    fontWeight: fontWeight.medium,
  },

  // ── Register ──
  registerBtn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  registerBtnText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },

  // ── Demo box ──
  demoBox: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    letterSpacing: 0.3,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  demoName: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  demoRole: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },

  // ── Footer ──
  footer: {
    textAlign: "center",
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: spacing.xxl,
  },
});
