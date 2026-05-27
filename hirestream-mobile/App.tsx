/**
 * HireStream Mobile — Root App Component
 *
 * Full navigation architecture:
 * - Auth flow: Login / Register / Forgot Password
 * - Main flow: 4-tab layout (Jobs / Applications / Alerts / Profile)
 * - Drilldowns: Job Detail, Application Detail, Settings
 *
 * The BottomTabBar renders on every main screen, ensuring
 * the user can always navigate between sections.
 */

import React, { useState, useCallback, useEffect } from "react";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  LogBox,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import HomeScreen from "./src/screens/HomeScreen";
import JobDetailScreen from "./src/screens/JobDetailScreen";
import MyApplicationsScreen from "./src/screens/MyApplicationsScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ApplicationDetailScreen from "./src/screens/ApplicationDetailScreen";
import ProfileEditScreen from "./src/screens/ProfileEditScreen";
import DocumentsScreen from "./src/screens/DocumentsScreen";
import PreferencesScreen from "./src/screens/PreferencesScreen";
import EducationScreen from "./src/screens/EducationScreen";
import ExperienceScreen from "./src/screens/ExperienceScreen";
import BottomTabBar, { TabName } from "./src/components/BottomTabBar";
import ForceUpdateScreen from "./src/screens/ForceUpdateScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import NetworkBanner from "./src/components/NetworkBanner";
import { colors } from "./src/theme";
import { API_BASE_URL, STORAGE_KEYS, APP_VERSION } from "./src/config";
import { getItem, setItem } from "./src/storage";
import { initSentry, captureException } from "./src/sentry";
import { setupForegroundHandler } from "./src/push";

// Set up push notification foreground handler immediately (safe no-op in Expo Go)
try { setupForegroundHandler(); } catch { /* swallow — Expo Go or missing native module */ }

// Suppress noisy warnings that show as red/yellow badges on screen
LogBox.ignoreLogs([
  "expo-notifications",
  "Notifications.setNotificationHandler",
  "Cannot find native module",
  "Calling getExpoPushTokenAsync",
  "newArchEnabled",
  "New Architecture",
  "Sentry Logger",
]);

// v0.4.17: APP_VERSION imported from ./src/config above. Previously a
// hardcoded "1.0.0" shadowed the real version, so the force-update
// check on line ~270 always compared against "1.0.0" instead of the
// actual deployed version — force-update was silently broken.

// ── Error Boundary ──────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    captureException(error, { componentStack: errorInfo.componentStack });
  }
  render() {
    if (this.state.error) {
      return (
        <SafeAreaView style={errorStyles.container}>
          <Text style={errorStyles.title}>⚠️ Something went wrong</Text>
          <Text style={errorStyles.msg}>
            {String(this.state.error?.message || this.state.error)}
          </Text>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

// ── Screen Types ────────────────────────────────────────────────────
type AuthScreen = "login" | "register" | "forgot";

// ── Inner App (uses auth context) ───────────────────────────────────
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const [activeTab, setActiveTab] = useState<TabName>("jobs");

  // Drilldown state
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedJobApplied, setSelectedJobApplied] = useState(false);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showEducation, setShowEducation] = useState(false);
  const [showExperience, setShowExperience] = useState(false);
  const [editProfile, setEditProfile] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Loading spinner while restoring session
  if (isLoading) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={loadingStyles.text}>Loading…</Text>
      </View>
    );
  }

  // ── Authenticated ─────────────────────────────────────────────────
  if (isAuthenticated) {
    // Full-screen drilldowns (no tab bar)
    if (selectedJob) {
      return (
        <JobDetailScreen
          job={selectedJob}
          onBack={() => { setSelectedJob(null); setSelectedJobApplied(false); setRefreshKey(k => k + 1); }}
          onApplied={() => setSelectedJobApplied(true)}
          alreadyApplied={selectedJobApplied}
        />
      );
    }
    if (selectedApp) {
      return (
        <ApplicationDetailScreen
          application={selectedApp}
          onBack={() => setSelectedApp(null)}
          onWithdrawn={() => {
            setSelectedApp(null);
            setActiveTab("applications");
          }}
        />
      );
    }
    if (showSettings) {
      return <SettingsScreen onBack={() => setShowSettings(false)} />;
    }
    if (editProfile) {
      return (
        <ProfileEditScreen
          profile={editProfile}
          onBack={() => setEditProfile(null)}
          onSaved={() => setEditProfile(null)}
        />
      );
    }
    if (showDocuments) {
      return <DocumentsScreen onBack={() => setShowDocuments(false)} />;
    }
    if (showPreferences) {
      return <PreferencesScreen onBack={() => setShowPreferences(false)} onSaved={() => setShowPreferences(false)} />;
    }
    if (showEducation) {
      return <EducationScreen onBack={() => setShowEducation(false)} />;
    }
    if (showExperience) {
      return <ExperienceScreen onBack={() => setShowExperience(false)} />;
    }

    // Tab-based main screens with persistent bottom nav
    return (
      <View style={{ flex: 1 }}>
        {/* Active tab content */}
        <View style={{ flex: 1 }}>
          {activeTab === "jobs" && (
            <HomeScreen
              key={refreshKey}
              onSelectJob={(job: any, isApplied: boolean) => {
                setSelectedJob(job);
                setSelectedJobApplied(isApplied);
              }}
              onNavigateTab={(tab: string) => setActiveTab(tab as TabName)}
            />
          )}
          {activeTab === "applications" && (
            <MyApplicationsScreen
              onSelectApplication={(app: any) => setSelectedApp(app)}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsScreen />
          )}
          {activeTab === "profile" && (
            <ProfileScreen
              onNavigateSettings={() => setShowSettings(true)}
              onNavigateDocuments={() => setShowDocuments(true)}
              onNavigatePreferences={() => setShowPreferences(true)}
              onEditProfile={(profileData: any) => setEditProfile(profileData)}
              onNavigateEducation={() => setShowEducation(true)}
              onNavigateExperience={() => setShowExperience(true)}
            />
          )}
        </View>

        {/* Persistent bottom tab bar */}
        <BottomTabBar activeTab={activeTab} onNavigate={setActiveTab} />
      </View>
    );
  }

  // ── Not authenticated ─────────────────────────────────────────────
  switch (authScreen) {
    case "register":
      return (
        <RegisterScreen onNavigateLogin={() => setAuthScreen("login")} />
      );
    case "forgot":
      return (
        <ForgotPasswordScreen
          onNavigateLogin={() => setAuthScreen("login")}
        />
      );
    default:
      return (
        <LoginScreen
          onNavigateRegister={() => setAuthScreen("register")}
          onNavigateForgot={() => setAuthScreen("forgot")}
        />
      );
  }
}

// ── Version comparison helper ───────────────────────────────────────
function isVersionBelow(current: string, minimum: string): boolean {
  const c = current.split(".").map(Number);
  const m = minimum.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((c[i] || 0) < (m[i] || 0)) return true;
    if ((c[i] || 0) > (m[i] || 0)) return false;
  }
  return false;
}

// ── Root Export ──────────────────────────────────────────────────────
export default function App() {
  // Initialize Sentry on first render
  useEffect(() => { initSentry(); }, []);
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });
  const [forceUpdate, setForceUpdate] = useState<{ required: boolean; minVersion: string } | null>(null);

  // Check version on startup
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/mobile/version`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json;
          if (data.minSupported && isVersionBelow(APP_VERSION, data.minSupported)) {
            setForceUpdate({ required: true, minVersion: data.minSupported });
          } else {
            setForceUpdate({ required: false, minVersion: "" });
          }
        }
      } catch {
        // Network error — don't block the app
        setForceUpdate({ required: false, minVersion: "" });
      }
    })();
  }, []);

  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  // Check onboarding status
  useEffect(() => {
    (async () => {
      const seen = await getItem("hs_onboarding_seen");
      setOnboardingSeen(seen === "true");
    })();
  }, []);

  if (!fontsLoaded || onboardingSeen === null) {
    return (
      <View style={loadingStyles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={loadingStyles.text}>Loading…</Text>
      </View>
    );
  }

  // Block app if force update is required
  if (forceUpdate?.required) {
    return (
      <ForceUpdateScreen
        currentVersion={APP_VERSION}
        requiredVersion={forceUpdate.minVersion}
      />
    );
  }

  // Show onboarding on first launch
  if (!onboardingSeen) {
    return (
      <OnboardingScreen
        onComplete={async () => {
          await setItem("hs_onboarding_seen", "true");
          setOnboardingSeen(true);
        }}
      />
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar barStyle="dark-content" />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
        <NetworkBanner />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

// ── Styles ──────────────────────────────────────────────────────────
const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
});

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#e53e3e",
    marginBottom: 16,
  },
  msg: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
  },
});
