/**
 * Auth Context — manages authentication state across the app.
 *
 * Provides:
 * - login / register / logout functions
 * - Current user state
 * - Loading state (for splash screen)
 * - Auto-restore from secure storage on app launch
 *
 * Maps to: F1.1, F1.5, F1.7
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getItem, setItem, deleteItem } from "./storage";
import { API_BASE_URL, STORAGE_KEYS } from "./config";
import { registerForPushNotifications, unregisterPushToken } from "./push";

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  phoneNumber?: string | null;
  preferredLanguage?: string;
  isActive?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  role?: string;
  fullName?: string;
  phone?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore auth state from secure storage on app launch
  useEffect(() => {
    (async () => {
      try {
        const userData = await getItem(STORAGE_KEYS.USER_DATA);
        const accessToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);

        if (userData && accessToken) {
          const user = JSON.parse(userData);
          setState({ user, isLoading: false, isAuthenticated: true });
        } else {
          setState({ user: null, isLoading: false, isAuthenticated: false });
        }
      } catch {
        setState({ user: null, isLoading: false, isAuthenticated: false });
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: email, password }),
      });

      const json = await res.json();

      if (!json.success || !json.data) {
        return { success: false, error: json.error?.message || "Login failed" };
      }

      const { accessToken, refreshToken, user } = json.data;

      // Store tokens securely
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      setState({ user, isLoading: false, isAuthenticated: true });

      // Register for push notifications after successful login
      registerForPushNotifications().catch(() => {});

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" };
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          role: data.role || "candidate",
          fullName: data.fullName,
          phone: data.phone,
        }),
      });

      const json = await res.json();

      if (!json.success || !json.data) {
        return { success: false, error: json.error?.message || "Registration failed" };
      }

      const { accessToken, refreshToken, user } = json.data;

      await setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      await setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

      setState({ user, isLoading: false, isAuthenticated: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" };
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json();
      return { success: true, error: undefined };
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Unregister push token
      await unregisterPushToken();

      const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        // Revoke on server (best-effort)
        fetch(`${API_BASE_URL}/api/v1/mobile/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {});
      }
    } finally {
      // Clear local state regardless
      await deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
      await deleteItem(STORAGE_KEYS.USER_DATA);
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, forgotPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
