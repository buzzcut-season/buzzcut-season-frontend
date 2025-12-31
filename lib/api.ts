import type {
  AuthenticateRequest,
  AuthenticateResponse,
  HealthResponse,
  ProductFeedResponse,
  SendCodeRequest,
  SendCodeResponse,
} from "./types";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
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

export { asErrorMessage };
