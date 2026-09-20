const TOKEN_KEY = "mfarps_token";
const USER_KEY = "mfarps_user";

export type Role = "Head Admin" | "Staff" | "Cashier";

export type User = {
  id: number;
  name: string;
  email: string;
  role: Role;
  status: string;
  last_login?: string | null;
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearSession();
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error(data.error || "Sign in required");
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export function peso(value: number | string) {
  return `₱${Number(value || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
