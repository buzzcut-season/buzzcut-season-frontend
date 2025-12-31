import type { AuthenticateResponse, RefreshTokenResponse } from "./types";

const KEY = "buzzcut.auth";

export function readAuth(): AuthenticateResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthenticateResponse;
  } catch {
    return null;
  }
}

export function writeAuth(auth: AuthenticateResponse) {
  localStorage.setItem(KEY, JSON.stringify(auth));
}

export function updateAuthAccessToken(update: RefreshTokenResponse): AuthenticateResponse | null {
  const current = readAuth();
  if (!current) return null;
  const next = { ...current, accessToken: update.accessToken, expiresAt: update.expiresAt };
  writeAuth(next);
  return next;
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}
