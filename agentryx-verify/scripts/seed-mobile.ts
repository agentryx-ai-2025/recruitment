import "dotenv/config";
import { db, pool } from "../server/config/db";
import { projects, requirements, reviewers, projectReviewers } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

type Status = "delivered" | "partial" | "not_delivered" | "deferred" | "n_a";

interface Row {
  itemRef: string;
  section: number;
  sectionTitle: string;
  description: string;
  status: Status;
  evidence: string | null;
  testSteps: string;
  expectedResult: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Mobile app roles map to Verify sections:
//   Section 1 → "Candidate" role card (all candidate-facing features)
//   Section 5 → "Cross-cutting" role card (UX polish + general)
//   Section 6 → "Cross-cutting" role card (backend API)
//
// Sections 2, 3, 4 are intentionally empty — no Agent/Employer/Officer
// features in the mobile app. The ProjectView hides empty role cards.
// ────────────────────────────────────────────────────────────────────────────

const MOBILE_REQUIREMENTS: Row[] = [
  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — CANDIDATE FEATURES (maps to "Candidate" role card)
  // Sub-grouped by sectionTitle for section tabs within the role detail view
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1A: Authentication ──
  { itemRef: "M1.1", section: 1, sectionTitle: "Authentication", description: "Login screen — email/username + password with validation and loading states", status: "delivered", evidence: "LoginScreen.tsx — form validation, loading states, branded design", testSteps: "Open app → enter mobiletest / Mobile@123 → tap Sign In", expectedResult: "Home screen loads with job listings" },
  { itemRef: "M1.2", section: 1, sectionTitle: "Authentication", description: "Login with incorrect password shows error message", status: "delivered", evidence: "LoginScreen.tsx error state handling", testSteps: "Enter mobiletest / wrongpass → Sign In", expectedResult: "Error message displayed, no crash" },
  { itemRef: "M1.3", section: 1, sectionTitle: "Authentication", description: "Register — full name, email, phone, password + client-side validation + auto-login", status: "delivered", evidence: "RegisterScreen.tsx", testSteps: "Tap 'Create Account' → fill all fields → submit", expectedResult: "Auto-login to home screen after registration" },
  { itemRef: "M1.4", section: 1, sectionTitle: "Authentication", description: "Forgot password — sends reset email, anti-enumeration", status: "delivered", evidence: "ForgotPasswordScreen.tsx", testSteps: "Tap 'Forgot Password?' → enter email → submit", expectedResult: "Success confirmation shown regardless of email existence" },
  { itemRef: "M1.5", section: 1, sectionTitle: "Authentication", description: "Secure token storage (Android Keystore via expo-secure-store)", status: "delivered", evidence: "storage.ts wraps SecureStore", testSteps: "Login → close app completely → reopen", expectedResult: "User remains logged in (tokens persisted securely)" },
  { itemRef: "M1.6", section: 1, sectionTitle: "Authentication", description: "Logout — revoke refresh token, clear keystore, navigate to login", status: "delivered", evidence: "auth.tsx logout()", testSteps: "Profile tab → Settings → Logout", expectedResult: "Returns to login screen, tokens cleared" },

  // ── 1B: Job Browsing ──
  { itemRef: "M2.1", section: 1, sectionTitle: "Job Browsing", description: "Home screen — job list with FlatList, stats bar, welcome header", status: "delivered", evidence: "HomeScreen.tsx", testSteps: "Login → land on Jobs tab", expectedResult: "List of jobs with cards showing title, company, salary, location, skills" },
  { itemRef: "M2.2", section: 1, sectionTitle: "Job Browsing", description: "Filter bar — country, category, salary range, experience level", status: "delivered", evidence: "FilterBar.tsx — horizontal chips + bottom-sheet modal", testSteps: "Tap filter chips → select a country or category", expectedResult: "Job list filters to matching results" },
  { itemRef: "M2.3", section: 1, sectionTitle: "Job Browsing", description: "Search bar with debounced query", status: "delivered", evidence: "Local text filter on HomeScreen", testSteps: "Type keyword in search bar (e.g. 'nurse')", expectedResult: "List filters in real-time to matching jobs" },
  { itemRef: "M2.4", section: 1, sectionTitle: "Job Browsing", description: "Job detail screen — info grid, skills, description, requirements, benefits, sticky apply bar", status: "delivered", evidence: "JobDetailScreen.tsx", testSteps: "Tap any job card from the list", expectedResult: "Full detail screen with all job information and Apply button" },
  { itemRef: "M2.5", section: 1, sectionTitle: "Job Browsing", description: "Skeleton loaders + empty states on all screens", status: "delivered", evidence: "SkeletonLoader.tsx with shimmer animation", testSteps: "Navigate between tabs and observe loading states", expectedResult: "Animated shimmer placeholders while data loads" },
  { itemRef: "M2.6", section: 1, sectionTitle: "Job Browsing", description: "Pull-to-refresh on job list", status: "delivered", evidence: "RefreshControl on FlatList", testSteps: "Pull down on job list", expectedResult: "Loading indicator appears, list refreshes with fresh data" },
  { itemRef: "M2.7", section: 1, sectionTitle: "Job Browsing", description: "'Already applied' badge on job cards and detail", status: "delivered", evidence: "Green 'Applied ✓' badge via title+company cross-matching", testSteps: "Apply to a job → return to job list", expectedResult: "Green 'Applied ✓' badge on that job card" },

  // ── 1C: Apply & Tracking ──
  { itemRef: "M3.1", section: 1, sectionTitle: "Apply & Tracking", description: "Apply CTA on job detail with confirmation dialog", status: "delivered", evidence: "One-tap apply with confirmation", testSteps: "Open a job → tap 'Apply Now' → confirm", expectedResult: "Success message, button changes to 'Applied'" },
  { itemRef: "M3.2", section: 1, sectionTitle: "Apply & Tracking", description: "Eligibility check — deadline, profile completeness, experience warnings", status: "delivered", evidence: "Inline checks in JobDetailScreen", testSteps: "Try applying to a job with past deadline or incomplete profile", expectedResult: "Inline reasons explaining why you can't apply" },
  { itemRef: "M3.3", section: 1, sectionTitle: "Apply & Tracking", description: "Duplicate apply blocked", status: "delivered", evidence: "Apply button disabled after application", testSteps: "Try applying to a job you've already applied to", expectedResult: "Button shows 'Applied', no duplicate submission possible" },
  { itemRef: "M3.4", section: 1, sectionTitle: "Apply & Tracking", description: "My Applications screen — Active / Offers / Closed tabs with badge counts", status: "delivered", evidence: "MyApplicationsScreen.tsx", testSteps: "Tap Applications tab", expectedResult: "Applications organized by status tabs with counts" },
  { itemRef: "M3.5", section: 1, sectionTitle: "Apply & Tracking", description: "Application detail with stage timeline", status: "delivered", evidence: "ApplicationDetailScreen.tsx", testSteps: "Tap an application from the list", expectedResult: "Detail view showing status timeline with all stages" },
  { itemRef: "M3.6", section: 1, sectionTitle: "Apply & Tracking", description: "Aging badges — 7-day amber, 14-day red on stale applications", status: "delivered", evidence: "In ApplicationDetailScreen", testSteps: "View applications older than 7 days", expectedResult: "Amber badge at 7 days, red badge at 14 days" },
  { itemRef: "M3.7", section: 1, sectionTitle: "Apply & Tracking", description: "Withdraw application with confirmation dialog", status: "delivered", evidence: "Confirmation dialog in ApplicationDetailScreen", testSteps: "Open an active application → tap Withdraw → confirm", expectedResult: "Application status changes to Withdrawn" },

  // ── 1D: Notifications ──
  { itemRef: "M4.1", section: 1, sectionTitle: "Notifications", description: "Notification inbox with read/unread state and type-based icons", status: "delivered", evidence: "NotificationsScreen.tsx", testSteps: "Tap Alerts tab", expectedResult: "Notification list with icons and read/unread visual states" },
  { itemRef: "M4.2", section: 1, sectionTitle: "Notifications", description: "Mark-as-read + bulk clear", status: "delivered", evidence: "Actions in NotificationsScreen", testSteps: "Tap an unread notification", expectedResult: "Notification marked as read with visual change" },
  { itemRef: "M4.3", section: 1, sectionTitle: "Notifications", description: "Deep-link from notification to relevant job/application", status: "delivered", evidence: "onNavigateToApplication/Job callbacks", testSteps: "Tap a job or application notification", expectedResult: "Navigates directly to the referenced job or application" },
  { itemRef: "M4.4", section: 1, sectionTitle: "Notifications", description: "Notification preferences — toggle per category", status: "delivered", evidence: "Toggle switches in SettingsScreen", testSteps: "Profile → Settings → Notification preferences", expectedResult: "Per-category toggle switches shown" },

  // ── 1E: Profile & Documents ──
  { itemRef: "M5.1", section: 1, sectionTitle: "Profile & Documents", description: "Profile view — Personal / Education / Work / Preferences / Documents sections", status: "delivered", evidence: "ProfileScreen.tsx", testSteps: "Tap Profile tab", expectedResult: "Sectioned profile with avatar, personal info, quick actions" },
  { itemRef: "M5.2", section: 1, sectionTitle: "Profile & Documents", description: "Profile edit — full name, phone, language preferences", status: "delivered", evidence: "ProfileEditScreen.tsx", testSteps: "Profile → Edit → change phone number → save", expectedResult: "Change persists after reloading profile" },
  { itemRef: "M5.3", section: 1, sectionTitle: "Profile & Documents", description: "Document upload via gallery picker (PDF/JPG/PNG, 5MB max)", status: "delivered", evidence: "expo-document-picker + multipart upload", testSteps: "Profile → Documents → Upload → pick from gallery", expectedResult: "Document appears in the documents list" },
  { itemRef: "M5.4", section: 1, sectionTitle: "Profile & Documents", description: "Document upload via camera capture", status: "delivered", evidence: "expo-image-picker — camera capture", testSteps: "Profile → Documents → Upload → take photo", expectedResult: "Photo document uploaded and listed" },
  { itemRef: "M5.5", section: 1, sectionTitle: "Profile & Documents", description: "Document delete with confirmation", status: "delivered", evidence: "Delete with confirmation in DocumentsScreen", testSteps: "Tap a document → Delete → confirm", expectedResult: "Document removed from list" },
  { itemRef: "M5.6", section: 1, sectionTitle: "Profile & Documents", description: "Profile photo upload", status: "delivered", evidence: "Avatar tap → uploads to /api/v1/candidate-self-service/photo", testSteps: "Profile → tap avatar → select photo", expectedResult: "New profile photo displayed" },
  { itemRef: "M5.7", section: 1, sectionTitle: "Profile & Documents", description: "Preferences — countries + job-role multi-select grid", status: "delivered", evidence: "PreferencesScreen.tsx with grid selection", testSteps: "Profile → Preferences → select countries and roles → save", expectedResult: "Selections persist after reload" },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — CROSS-CUTTING: UX & GENERAL (maps to "Cross-cutting" card)
  // ══════════════════════════════════════════════════════════════════════════
  { itemRef: "M6.1", section: 5, sectionTitle: "UX Polish & General", description: "Onboarding — 3-card first-launch walkthrough with animated dots", status: "delivered", evidence: "OnboardingScreen.tsx", testSteps: "Register a brand new account", expectedResult: "3-card walkthrough shown before home screen" },
  { itemRef: "M6.2", section: 5, sectionTitle: "UX Polish & General", description: "Bottom navigation — 4 tabs: Jobs, Applications, Alerts, Profile", status: "delivered", evidence: "BottomTabBar.tsx — persistent across screens", testSteps: "Tap each tab in the bottom bar", expectedResult: "Each tab loads the correct screen smoothly" },
  { itemRef: "M6.3", section: 5, sectionTitle: "UX Polish & General", description: "Accessibility — TalkBack labels on all interactive elements", status: "delivered", evidence: "accessibilityRole/Label/State on key components", testSteps: "Enable TalkBack → navigate the app", expectedResult: "All buttons and inputs announced correctly" },
  { itemRef: "M6.4", section: 5, sectionTitle: "UX Polish & General", description: "Error boundary + crash reporting", status: "delivered", evidence: "componentDidCatch sends to Sentry; ErrorBoundary wraps app", testSteps: "Use the app normally", expectedResult: "No uncaught crashes; errors handled gracefully" },
  { itemRef: "M6.5", section: 5, sectionTitle: "UX Polish & General", description: "Privacy policy accessible from settings", status: "delivered", evidence: "Linking.openURL in SettingsScreen", testSteps: "Settings → Privacy Policy", expectedResult: "Opens privacy policy page in browser" },
  { itemRef: "M6.6", section: 5, sectionTitle: "UX Polish & General", description: "In-app delete account flow (Play Store requirement)", status: "delivered", evidence: "In SettingsScreen with confirmation", testSteps: "Settings → Delete Account → confirm", expectedResult: "Account deleted, user logged out" },
  { itemRef: "M6.7", section: 5, sectionTitle: "UX Polish & General", description: "Force-update screen blocks app if version too old", status: "delivered", evidence: "ForceUpdateScreen.tsx + version check", testSteps: "App checks version on startup", expectedResult: "If version below minimum, full-screen update prompt shown" },
  { itemRef: "M6.8", section: 5, sectionTitle: "UX Polish & General", description: "Network error handling — offline banner + retry", status: "delivered", evidence: "NetworkBanner.tsx component", testSteps: "Turn off WiFi/data → try to load jobs", expectedResult: "Offline banner shown with retry button" },
  { itemRef: "M6.9", section: 5, sectionTitle: "UX Polish & General", description: "Splash screen + app icon (branded assets)", status: "partial", evidence: "Default Expo icons — awaiting HPSEDC brand assets", testSteps: "Open the app", expectedResult: "Branded splash and icon shown" },
  { itemRef: "M6.10", section: 5, sectionTitle: "UX Polish & General", description: "Settings screen — notifications, privacy, language, app info", status: "delivered", evidence: "SettingsScreen.tsx", testSteps: "Profile → Settings", expectedResult: "All settings options accessible" },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — CROSS-CUTTING: BACKEND API
  // ══════════════════════════════════════════════════════════════════════════
  { itemRef: "M7.1", section: 6, sectionTitle: "Backend Mobile API", description: "POST /mobile/auth/login + /register — JWT signing (HS256)", status: "delivered", evidence: "mobile-auth.routes.ts — 6 integration tests", testSteps: "Login/register via mobile app", expectedResult: "JWT tokens returned, user authenticated" },
  { itemRef: "M7.2", section: 6, sectionTitle: "Backend Mobile API", description: "POST /mobile/auth/refresh — rotation + reuse detection", status: "delivered", evidence: "mobile-auth.routes.ts — 3 tests", testSteps: "Use app for >15 minutes (auto-refresh)", expectedResult: "New tokens issued silently, old token revoked" },
  { itemRef: "M7.3", section: 6, sectionTitle: "Backend Mobile API", description: "mobileBearer middleware coexisting with passport sessions", status: "delivered", evidence: "mobileBearer.middleware.ts — 3 tests", testSteps: "Use both mobile and web portal simultaneously", expectedResult: "Both work independently without interference" },
  { itemRef: "M7.4", section: 6, sectionTitle: "Backend Mobile API", description: "POST /mobile/push/register — device token management", status: "delivered", evidence: "mobile-push.routes.ts — 3 tests", testSteps: "Login to mobile → check token registered", expectedResult: "Token stored in mobile_push_tokens table" },
  { itemRef: "M7.5", section: 6, sectionTitle: "Backend Mobile API", description: "GET /mobile/version + /config — force-update + feature flags", status: "delivered", evidence: "mobile-config.routes.ts — 2 tests", testSteps: "App calls /version on startup", expectedResult: "JSON with version info and feature flags" },
  { itemRef: "M7.6", section: 6, sectionTitle: "Backend Mobile API", description: "FCM delivery worker — send push via Firebase", status: "not_delivered", evidence: "Needs Firebase/GCP project setup", testSteps: "Trigger notification event (e.g. status change)", expectedResult: "Push notification delivered to device" },
];

async function main() {
  const slug = "hirestream-mobile-v1.0";

  // Clean existing mobile requirements (preserve project row)
  let [project] = await db.select().from(projects).where(eq(projects.slug, slug));

  if (project) {
    // Delete old requirements for this project (cascades signoffs)
    await db.delete(requirements).where(eq(requirements.projectId, project.id));
    console.log("Cleared old mobile requirements.");
    await db.update(projects).set({
      buildRef: "dev-0.4.1",
      name: "HireStream Mobile — Android/iOS App v1.0",
    }).where(eq(projects.id, project.id));
  } else {
    [project] = await db.insert(projects).values({
      slug,
      name: "HireStream Mobile — Android/iOS App v1.0",
      buildRef: "dev-0.4.1",
      contractor: "Agentryx",
      client: "HPSEDC",
      description: "Android/iOS mobile application for the HPSEDC Overseas Placement Portal. Candidate-facing features + cross-cutting UX and backend API.",
      matrixSourcePath: "/home/subhash.thakur.india/Projects/Recruitment/PMD-Final wrapup/MobileApps/Android/01_ROADMAP.md",
    }).returning();
    console.log("Created mobile project:", project.id);
  }

  // Insert fresh requirements
  let order = 0;
  const batch = MOBILE_REQUIREMENTS.map((r) => ({
    projectId: project.id,
    itemRef: r.itemRef,
    section: r.section,
    sectionTitle: r.sectionTitle,
    description: r.description,
    status: r.status,
    evidence: r.evidence,
    testSteps: r.testSteps,
    expectedResult: r.expectedResult,
    sortOrder: order++,
  }));

  for (let i = 0; i < batch.length; i += 50) {
    await db.insert(requirements).values(batch.slice(i, i + 50));
  }
  console.log(`Inserted ${batch.length} mobile requirements.`);

  // Assign all reviewers
  const allReviewers = await db.select().from(reviewers);
  for (const r of allReviewers) {
    await db.insert(projectReviewers)
      .values({ projectId: project.id, reviewerId: r.id })
      .onConflictDoNothing();
  }
  console.log(`Assigned ${allReviewers.length} reviewers.`);

  // Summary
  const sec1 = MOBILE_REQUIREMENTS.filter(r => r.section === 1).length;
  const sec5 = MOBILE_REQUIREMENTS.filter(r => r.section === 5).length;
  const sec6 = MOBILE_REQUIREMENTS.filter(r => r.section === 6).length;
  console.log(`\nSection breakdown:`);
  console.log(`  §1 Candidate features: ${sec1} items`);
  console.log(`  §5 UX & General:       ${sec5} items`);
  console.log(`  §6 Backend API:        ${sec6} items`);
  console.log(`  Total:                 ${batch.length} items`);

  console.log("\nMobile seed complete.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
