const API_URL = import.meta.env.VITE_API_URL || "https://backend.asherlewis.online";

const AUTH_PATHS_WITHOUT_REFRESH = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/apple",
  "/api/auth/magic-link/request",
  "/api/auth/magic-link/verify",
  "/api/auth/refresh",
]);

export interface ApiError {
  detail: string;
}

let refreshPromise: Promise<string | null> | null = null;

function shouldAttemptRefresh(path: string): boolean {
  return !AUTH_PATHS_WITHOUT_REFRESH.has(path);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("rolevault_refresh_token");
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    localStorage.removeItem("rolevault_token");
    localStorage.removeItem("rolevault_refresh_token");
    return null;
  }

  const data = await res.json() as { access_token: string; refresh_token: string };
  localStorage.setItem("rolevault_token", data.access_token);
  localStorage.setItem("rolevault_refresh_token", data.refresh_token);
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

  let token = localStorage.getItem("rolevault_token");
  let res = await execute(token);

  if (res.status === 401 && shouldAttemptRefresh(path)) {
    const refreshed = await getRefreshedToken();
    if (refreshed) {
      token = refreshed;
      res = await execute(token);
    }
  }

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail);
  }

  return res.json();
}
