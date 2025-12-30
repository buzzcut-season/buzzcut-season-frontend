import type { AuthenticateResponse } from "./types";

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

export function clearAuth() {
  localStorage.removeItem(KEY);
}
