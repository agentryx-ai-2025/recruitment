/**
 * API Client — fetch wrapper with JWT bearer token interceptor.
 *
 * Handles:
 * - Automatic access token injection via Authorization header
 * - Automatic token refresh on 401 (transparent to callers)
 * - Retry-once logic after refresh
 * - JSON response parsing
 *
 * Maps to: F1.1 (API client wrapper)
 */

import { API_BASE_URL, STORAGE_KEYS } from "./config";
import { getItem, setItem, deleteItem } from "./storage";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: number; message: string };
  message?: string;
}

interface FetchOptions {
  method?: HttpMethod;
  body?: any;
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded, false otherwise.
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = await getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) return false;

    const res = await fetch(`${API_BASE_URL}/api/v1/mobile/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      // Refresh failed — clear tokens (user must re-login)
      await deleteItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteItem(STORAGE_KEYS.REFRESH_TOKEN);
      await deleteItem(STORAGE_KEYS.USER_DATA);
      return false;
    }

    const json = await res.json();
    if (json.data?.accessToken) {
      await setItem(STORAGE_KEYS.ACCESS_TOKEN, json.data.accessToken);
    }
    if (json.data?.refreshToken) {
      await setItem(STORAGE_KEYS.REFRESH_TOKEN, json.data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Main API fetch function. Use this for all API calls.
 */
export async function api<T = any>(
  path: string,
  options: FetchOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, headers = {}, skipAuth = false } = options;

  const url = `${API_BASE_URL}${path}`;
  const fetchHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Inject bearer token if we have one
  if (!skipAuth) {
    const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      fetchHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const fetchOptions: RequestInit = {
    method,
    headers: fetchHeaders,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  try {
    let res = await fetch(url, fetchOptions);

    // If 401 and not already refreshing, try to refresh once
    if (res.status === 401 && !skipAuth) {
      // Deduplicate concurrent refresh attempts
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshAccessToken();
      }

      const refreshed = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;

      if (refreshed) {
        // Retry the original request with new token
        const newToken = await getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (newToken) {
          fetchHeaders["Authorization"] = `Bearer ${newToken}`;
        }
        res = await fetch(url, { ...fetchOptions, headers: fetchHeaders });
      }
    }

    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 0,
        message: error.message || "Network error — check your connection",
      },
    };
  }
}

/**
 * Upload a file using multipart/form-data.
 */
export async function uploadFile<T = any>(
  path: string,
  uri: string,
  name: string,
  type: string,
  additionalData?: Record<string, string>
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${path}`;
  const token = await getItem(STORAGE_KEYS.ACCESS_TOKEN);

  const formData = new FormData();
  formData.append("file", {
    uri,
    name,
    type,
  } as any);

  if (additionalData) {
    Object.keys(additionalData).forEach((key) => {
      formData.append(key, additionalData[key]);
    });
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
        // Do NOT set Content-Type to multipart/form-data manually
        // fetch handles the boundary automatically when passing FormData
      },
      body: formData,
    });

    const json = await res.json();
    return json;
  } catch (error: any) {
    return {
      success: false,
      error: {
        code: 0,
        message: error.message || "Upload failed — check your connection",
      },
    };
  }
}
