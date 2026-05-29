import { ROLEVAULT_API_URL } from "@/lib/runtimeConfig";

const API_URL = ROLEVAULT_API_URL;
const ACCESS_TOKEN_KEY = "rolevault_token";
const REFRESH_TOKEN_KEY = "rolevault_refresh_token";
const DEVICE_ID_KEY = "rolevault_device_id";
const DEVICE_ID_BYTES = 16;
const NONCE_BYTES = 32;

export const AUTH_SESSION_REJECTED_EVENT = "rolevault:auth-session-rejected";

const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/api/auth/apple",
  "/api/auth/magic-link/request",
  "/api/auth/magic-link/verify",
  "/api/auth/refresh",
]);

export function clearStoredAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function randomBase64URL(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error("Secure random generation is unavailable in this browser.");
  }

  globalThis.crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function getAuthDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing && existing.length >= 16 && existing.length <= 128) {
    return existing;
  }

  const deviceId = globalThis.crypto?.randomUUID?.() ?? randomBase64URL(DEVICE_ID_BYTES);
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export function createAuthNonce(): string {
  return randomBase64URL(NONCE_BYTES);
}

function notifySessionRejected() {
  clearStoredAuthTokens();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_REJECTED_EVENT));
  }
}

export interface ApiError {
  detail: string;
}

let refreshPromise: Promise<string | null> | null = null;

function shouldAttemptRefresh(path: string): boolean {
  return !AUTH_PATHS_WITHOUT_REFRESH.has(path);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken, device_id: getAuthDeviceId() }),
  });

  if (!res.ok) {
    clearStoredAuthTokens();
    return null;
  }

  const data = await res.json() as { access_token: string; refresh_token: string };
  localStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
  return data.access_token;
}

async function getRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const buildHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const execute = async (token: string | null) => {
    return fetch(`${API_URL}${path}`, { ...options, headers: buildHeaders(token) });
  };

  let token = localStorage.getItem(ACCESS_TOKEN_KEY);
  let res = await execute(token);

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await getRefreshedToken();
    if (refreshed) {
      token = refreshed;
      res = await execute(token);
    }

    if (res.status === 401) {
      notifySessionRejected();
    }
  }

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail);
  }

  return res.json();
}

export async function apiStreamFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const buildHeaders = (token: string | null): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const execute = async (token: string | null) => {
    return fetch(`${API_URL}${path}`, { ...options, headers: buildHeaders(token) });
  };

  let token = localStorage.getItem(ACCESS_TOKEN_KEY);
  let res = await execute(token);

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await getRefreshedToken();
    if (refreshed) {
      token = refreshed;
      res = await execute(token);
    }

    if (res.status === 401) {
      notifySessionRejected();
    }
  }

  return res;
}
