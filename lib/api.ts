import type {
  AuthenticateRequest,
  AuthenticateResponse,
  CategoryTreeResponse,
  HealthResponse,
  ProductFeedResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  SendCodeRequest,
  SendCodeResponse,
} from "./types";
import { clearAuth, readAuth, updateAuthAccessToken } from "./storage";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

function getApiBase(): string {
  if (!API_BASE) {
    throw new Error("NEXT_PUBLIC_API_BASE is not set");
  }
  return API_BASE;
}

function asErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

const REFRESH_PATH = "/api/v1/accounts/refresh";

function buildHeaders(init?: RequestInit, accessToken?: string): Headers {
  const headers = new Headers(init?.headers ?? {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (accessToken && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }
  return headers;
}

async function refreshAccessToken(): Promise<string | null> {
  const auth = readAuth();
  if (!auth?.refreshToken) return null;

  const body: RefreshTokenRequest = { refreshToken: auth.refreshToken };
  const res = await fetch(`${getApiBase()}${REFRESH_PATH}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as RefreshTokenResponse;
  const updated = updateAuthAccessToken(data);
  return updated?.accessToken ?? null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = readAuth();
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: buildHeaders(init, auth?.accessToken),
  });

  if (!res.ok) {
    if ((res.status === 401 || res.status === 403) && path !== REFRESH_PATH) {
      const nextAccessToken = await refreshAccessToken();
      if (nextAccessToken) {
        const retryRes = await fetch(`${getApiBase()}${path}`, {
          ...init,
          headers: buildHeaders(init, nextAccessToken),
        });
        if (retryRes.ok) {
          return (await retryRes.json()) as T;
        }
        const retryText = await retryRes.text().catch(() => "");
        throw new Error(`HTTP ${retryRes.status}: ${retryText || retryRes.statusText}`);
      }
      clearAuth();
    }
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }

  return (await res.json()) as T;
}

export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/actuator/health", { method: "GET" });
}

export async function sendCode(body: SendCodeRequest): Promise<SendCodeResponse> {
  return request<SendCodeResponse>("/api/v1/accounts/send-code", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function authenticate(body: AuthenticateRequest): Promise<AuthenticateResponse> {
  return request<AuthenticateResponse>("/api/v1/accounts/authenticate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getProductFeed(params?: { page?: number; size?: number }): Promise<ProductFeedResponse> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 24;
  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString();
  return request<ProductFeedResponse>(`/api/v1/product-feed?${qs}`, { method: "GET" });
}

export async function getCategoryTree(): Promise<CategoryTreeResponse> {
  return request<CategoryTreeResponse>("/api/v1/categories/tree", { method: "GET" });
}

export { asErrorMessage };
