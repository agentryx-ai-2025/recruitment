/**
 * Register Screen — F1.3
 *
 * New candidate registration form.
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
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radius, fontSize, fontWeight } from "../theme";
import { useAuth } from "../auth";

interface RegisterScreenProps {
  onNavigateLogin: () => void;
}

export default function RegisterScreen({ onNavigateLogin }: RegisterScreenProps) {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email format";
    // Match the server-side rules in shared/validators.ts so the user gets
    // immediate, specific feedback instead of a generic 400 from the API.
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password)) e.password = "Password must contain at least one uppercase letter";
    else if (!/[a-z]/.test(password)) e.password = "Password must contain at least one lowercase letter";
    else if (!/[0-9]/.test(password)) e.password = "Password must contain at least one digit";
    else if (!/[^A-Za-z0-9]/.test(password)) e.password = "Password must contain at least one special character (e.g. ! @ # $)";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const result = await register({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      role: "candidate",
    });

    setLoading(false);
    if (!result.success) {
      Alert.alert("Registration Failed", result.error || "Could not create account. Please try again.");
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    icon: keyof typeof Ionicons.glyphMap,
    options: {
      placeholder: string;
      error?: string;
      secure?: boolean;
      keyboardType?: "default" | "email-address" | "phone-pad";
      autoCapitalize?: "none" | "words";
    },
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, options.error && styles.inputError]}>
        <Ionicons name={icon} size={20} color={colors.textTertiary} style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder={options.placeholder}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChange}
          secureTextEntry={options.secure && !showPassword}
          keyboardType={options.keyboardType || "default"}
          autoCapitalize={options.autoCapitalize || "none"}
          autoCorrect={false}
        />
        {options.secure && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {options.error && <Text style={styles.errorText}>{options.error}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, keyboardVisible && styles.headerCompact, { paddingTop: insets.top + (keyboardVisible ? 4 : spacing.md) }]}>
          {!keyboardVisible && (
            <Image
              source={require("../../assets/hpsedc-logo.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          )}
          <Text style={styles.title}>Create Account</Text>
          {!keyboardVisible && <Text style={styles.subtitle}>Join HPSEDC Overseas Placement</Text>}
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {renderInput("Full Name", fullName, setFullName, "person-outline", {
            placeholder: "Enter your full name",
            error: errors.fullName,
            autoCapitalize: "words",
          })}
          {renderInput("Email", email, setEmail, "mail-outline", {
            placeholder: "your.email@example.com",
            error: errors.email,
            keyboardType: "email-address",
          })}
          {renderInput("Phone (optional)", phone, setPhone, "call-outline", {
            placeholder: "+91 9876543210",
            keyboardType: "phone-pad",
          })}
          {renderInput("Password", password, setPassword, "lock-closed-outline", {
            placeholder: "At least 8 characters",
            error: errors.password,
            secure: true,
          })}
          {/* Policy hint — visible to the user before they hit submit so we
           *  don't end up with the "Validation Error" pop-up after the fact. */}
          <Text style={styles.passwordHint}>
            Must include: 8+ chars · uppercase · lowercase · digit · special character (e.g. ! @ # $)
          </Text>
          {renderInput("Confirm Password", confirmPassword, setConfirmPassword, "lock-closed-outline", {
            placeholder: "Re-enter password",
            error: errors.confirmPassword,
            secure: true,
          })}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.textInverse} />
            ) : (
              <Text style={styles.submitText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Login link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={onNavigateLogin}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
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
  headerCompact: {
    paddingBottom: spacing.sm,
  },
  backButton: {
    flexDirection: "row", alignItems: "center", alignSelf: "flex-start", marginBottom: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.4)",
  },
  backText: { fontSize: fontSize.sm, color: "#ffffff", marginLeft: spacing.sm, fontWeight: fontWeight.semibold },
  headerLogo: { width: 100, height: 100, borderRadius: 50, marginBottom: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: "#ffffff" },
  subtitle: { fontSize: fontSize.sm, color: "rgba(255,255,255,0.75)", marginTop: spacing.xs },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.xl,
    shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 12, elevation: 4,
  },
  inputGroup: { marginBottom: spacing.lg },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text, marginBottom: spacing.sm },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.border,
    borderRadius: radius.md, backgroundColor: colors.background, height: 52, paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.error },
  inputIcon: { marginRight: spacing.sm },
  input: { flex: 1, fontSize: fontSize.md, color: colors.text, height: "100%" },
  eyeButton: { padding: spacing.sm },
  errorText: { fontSize: fontSize.xs, color: colors.error, marginTop: spacing.xs },
  passwordHint: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: -spacing.sm, marginBottom: spacing.sm, lineHeight: 16 },
  submitButton: {
    backgroundColor: colors.primary, height: 52, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center", marginTop: spacing.sm,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textInverse },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing.xl, marginBottom: spacing.lg },
  footerText: { fontSize: fontSize.lg, color: "rgba(255,255,255,0.8)" },
  footerLink: { fontSize: fontSize.lg, color: "#ffffff", fontWeight: fontWeight.bold, textDecorationLine: "underline" as const },
});
