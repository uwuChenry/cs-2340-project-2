// Thin client for the Django API.
//
// The backend uses session auth, so every request sends cookies. Unsafe methods
// also echo the csrftoken cookie back in X-CSRFToken (the backend keeps that
// cookie readable from JS on purpose). Django sets the cookie itself, so the
// first unsafe call fetches /api/auth/csrf/ if it is not there yet.
//
// The API origin is derived from the page's own hostname rather than hardcoding
// "localhost": cookies are per-host, so a page opened on 127.0.0.1 has to talk to
// 127.0.0.1:8000 or the session cookie is treated as cross-site and dropped.

export class ApiError extends Error {
  status: number;
  // DRF validation errors keyed by field, e.g. { password: ["Too common."] }.
  // Forms use these to put each message next to the input it belongs to.
  fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

function fieldErrorsOf(data: unknown): Record<string, string[]> {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const errors: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(data)) {
    if (field === "detail") continue;
    errors[field] = Array.isArray(value) ? value.map(String) : [String(value)];
  }
  return errors;
}

function apiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://127.0.0.1:8000";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function ensureCsrfCookie(): Promise<void> {
  if (readCookie("csrftoken")) return;
  await fetch(`${apiBase()}/api/auth/csrf/`, { credentials: "include" });
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const body = data as Record<string, unknown>;
    if (typeof body.detail === "string") return body.detail;
    // DRF validation errors look like { field: ["message"] }.
    const parts = Object.entries(body).map(([field, value]) =>
      `${field}: ${Array.isArray(value) ? value.join(" ") : String(value)}`,
    );
    if (parts.length) return parts.join("; ");
  }
  return `Request failed (${status})`;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

type Query = Record<string, string | number | boolean | null | undefined>;

type Options = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
};

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const method = options.method ?? "GET";
  const unsafe = method !== "GET";
  if (unsafe) await ensureCsrfCookie();

  const url = new URL(`${apiBase()}${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  // A FormData body is sent as-is: the browser has to write the multipart
  // Content-Type itself, because it includes the boundary between the parts.
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (unsafe) {
    const token = readCookie("csrftoken");
    if (token) headers["X-CSRFToken"] = token;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Is the backend running on port 8000?");
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, errorMessage(data, response.status), fieldErrorsOf(data));
  return data as T;
}

export const http = {
  get: <T>(path: string, query?: Query) => api<T>(path, { query }),
  post: <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => api<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData) => api<T>(path, { method: "POST", body: form }),
};
