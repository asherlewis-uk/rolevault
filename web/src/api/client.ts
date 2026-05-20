const API_URL = import.meta.env.VITE_API_URL || "https://backend.asherlewis.online";

export interface ApiError {
  detail: string;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("rolevault_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err: ApiError = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail);
  }

  return res.json();
}
