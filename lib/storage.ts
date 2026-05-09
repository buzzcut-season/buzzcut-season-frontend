import type { AccountMe, AuthenticateResponse, RefreshTokenResponse } from "./types";

const KEY = "buzzcut.auth";
const ACCOUNT_KEY = "buzzcut.account";
export const ACCOUNT_PROFILE_UPDATED_EVENT = "buzzcut:account-profile-updated";

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

export function readAccountProfile(): AccountMe | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AccountMe;
  } catch {
    return null;
  }
}

export function writeAccountProfile(account: AccountMe) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  window.dispatchEvent(new CustomEvent<AccountMe>(ACCOUNT_PROFILE_UPDATED_EVENT, { detail: account }));
}

export function clearAccountProfile() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCOUNT_KEY);
  window.dispatchEvent(new Event(ACCOUNT_PROFILE_UPDATED_EVENT));
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function payloadHasSellerRole(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;

  const values = [
    payload.role,
    payload.roles,
    payload.authorities,
    payload.permissions,
    payload.scope,
    payload.scopes,
  ];

  for (const value of values) {
    if (Array.isArray(value)) {
      if (value.some((entry) => typeof entry === "string" && entry.toUpperCase().includes("SELLER"))) {
        return true;
      }
      continue;
    }

    if (typeof value === "string") {
      const parts = value.split(/[,\s]+/).filter(Boolean);
      if (parts.some((entry) => entry.toUpperCase().includes("SELLER"))) {
        return true;
      }
    }
  }

  return false;
}

export function hasSellerAccess(): boolean {
  const token = readAuth()?.accessToken;
  if (!token) return false;
  return payloadHasSellerRole(parseJwtPayload(token));
}
