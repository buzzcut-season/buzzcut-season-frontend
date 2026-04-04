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
