// In local dev, keep this relative so Vite's proxy (vite.config.ts) forwards
// /api/* to http://localhost:5000. In production, werewolf.sg has no such proxy —
// a bare "/api" resolves to werewolf.sg/api/... (404, not JSON), which is why
// every request — including login — was failing with "Request failed" and the
// app appeared to have no data (every fetch silently 404'd the same way).
// Mirrors the origin-resolution AuthModal already uses for the OAuth redirect.
const API_ORIGIN = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "" : "https://api.werewolf.sg");
const BASE = `${API_ORIGIN}/api`;

// Single in-flight refresh shared by all concurrent 401s (prevents a burst of
// parallel requests from each consuming the rotating refresh token)
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem('token', data.token);
        if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
        if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
        return true;
      } catch {
        return false;
      } finally {
        // allow the next expiry (much later) to trigger a fresh refresh
        setTimeout(() => { refreshPromise = null; }, 0);
      }
    })();
  }
  return refreshPromise;
}

async function request<T>(path: string, opts: { method?: string; body?: unknown } = {}, isRetry = false): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    if (localStorage.getItem('token') && !path.startsWith('/auth/')) {
      // Access token expired — try one silent refresh, then retry the request once
      if (!isRetry && (await tryRefresh())) {
        return request<T>(path, opts, true);
      }
      // Refresh failed (revoked/expired/reused) — clear and force re-login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }
    // Login attempt with no existing session — surface the server error, don't redirect
    const errData = await res.json().catch(() => ({ message: 'Invalid credentials.' }));
    throw new Error(errData.message ?? 'Invalid credentials.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: 'Request failed' }));
    // If the server returned Zod validation errors, surface the first field error
    // instead of the generic "Validation error" message so the user knows what to fix.
    const fieldErrors = data.errors?.fieldErrors as Record<string, string[]> | undefined;
    if (fieldErrors) {
      const first = Object.values(fieldErrors).flat()[0];
      if (first) throw new Error(first);
    }
    throw new Error(data.message ?? 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get:    <T>(path: string)                  => request<T>(path),
  post:   <T>(path: string, body: unknown)   => request<T>(path, { method: 'POST', body }),
  patch:  <T>(path: string, body: unknown)   => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string)                  => request<T>(path, { method: 'DELETE' }),
};
