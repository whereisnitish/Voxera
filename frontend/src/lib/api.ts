const TOKEN_KEY = "voxera_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
  }
}

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  form?: Record<string, string>;
}

export async function api<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  const token = tokenStore.get();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | undefined;
  if (opts.form) {
    body = new URLSearchParams(opts.form);
    headers.set("Content-Type", "application/x-www-form-urlencoded");
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`/api${path}`, { ...opts, headers, body });

  if (res.status === 401) {
    tokenStore.clear();
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    let detail: unknown = await res.text();
    try {
      detail = JSON.parse(detail as string);
    } catch {
      // not json
    }
    const msg =
      (typeof detail === "object" && detail && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : String(detail)) || res.statusText;
    throw new ApiError(res.status, msg, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
