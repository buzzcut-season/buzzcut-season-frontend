import type {
  AccountMe,
  AuthenticateRequest,
  AuthenticateResponse,
  ChatMessagesResponse,
  CategoryTreeResponse,
  ConfirmDraftImageRequest,
  CreateReviewRequest,
  CreateOrderRequest,
  CreateDraftResponse,
  HealthResponse,
  OrderListResponse,
  OrderPageResponse,
  OrderResponse,
  PresignDraftImageRequest,
  PresignDraftImageResponse,
  ProductCard,
  ProductReviewsResponse,
  PublishDraftResponse,
  ProductFeedResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  Review,
  SellerDraft,
  SendCodeRequest,
  SendCodeResponse,
  SellerCreateRequest,
  SellerMe,
  UpdateDraftRequest,
} from "./types";
import { clearAuth, readAuth, updateAuthAccessToken } from "./storage";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;

export class ApiHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, fallback: string) {
    super(`HTTP ${status}: ${body || fallback}`);
    this.name = "ApiHttpError";
    this.status = status;
    this.body = body;
  }
}

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

type OrderResponseWire = Omit<OrderResponse, "orderId" | "displaySettings"> & {
  id?: number | null;
  orderId?: number | null;
  displaySettings?: {
    productName?: string | null;
    coverImage?: string | null;
  } | null;
};

type OrderPageResponseWire = OrderResponseWire & {
  review?: Review | null;
};

type ProductCardWire = Omit<ProductCard, "reviews"> & {
  reviews?: {
    averageRating?: string | null;
    totalCount?: number | null;
  } | null;
};

type OrderListResponseWire = {
  orders?: OrderResponseWire[] | null;
};

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
        throw new ApiHttpError(retryRes.status, retryText, retryRes.statusText);
      }
      clearAuth();
    }
    const text = await res.text().catch(() => "");
    throw new ApiHttpError(res.status, text, res.statusText);
  }

  return (await res.json()) as T;
}

function normalizeOrderResponse(order: OrderResponseWire): OrderResponse {
  const orderId = order.orderId ?? order.id;
  if (orderId == null) {
    throw new Error("Order response does not include orderId");
  }

  return {
    ...order,
    orderId,
    displaySettings: {
      productName: order.displaySettings?.productName ?? null,
      coverImage: order.displaySettings?.coverImage ?? null,
    },
  };
}

function normalizeOrderPageResponse(order: OrderPageResponseWire): OrderPageResponse {
  return {
    ...normalizeOrderResponse(order),
    review: order.review ?? null,
  };
}

function normalizeOrderListResponse(response: OrderListResponseWire): OrderListResponse {
  return {
    orders: (response.orders ?? []).map(normalizeOrderResponse),
  };
}

function normalizeProductCardResponse(product: ProductCardWire): ProductCard {
  return {
    ...product,
    reviews: {
      averageRating: product.reviews?.averageRating ?? null,
      totalCount: product.reviews?.totalCount ?? 0,
    },
  };
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

export async function getAccountMe(): Promise<AccountMe> {
  return request<AccountMe>("/api/v1/accounts/me", { method: "GET" });
}

export async function getProductFeed(params?: {
  page?: number;
  size?: number;
  category?: string | null;
  query?: string | null;
}): Promise<ProductFeedResponse> {
  const page = params?.page ?? 0;
  const size = Math.min(params?.size ?? 20, 100);
  const qs = new URLSearchParams({ page: String(page), size: String(size) });
  if (typeof params?.category === "string" && params.category.trim()) {
    qs.set("category", params.category.trim());
  }
  if (typeof params?.query === "string" && params.query.trim()) {
    qs.set("query", params.query.trim());
  }
  return request<ProductFeedResponse>(`/api/v1/products?${qs.toString()}`, { method: "GET" });
}

export async function getProductCard(productId: number): Promise<ProductCard> {
  const response = await request<ProductCardWire>(`/api/v1/products/${productId}`, { method: "GET" });
  return normalizeProductCardResponse(response);
}

export async function getProductReviews(
  productId: number,
  params?: { page?: number; size?: number },
): Promise<ProductReviewsResponse> {
  const page = params?.page ?? 0;
  const size = Math.min(params?.size ?? 20, 100);
  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString();
  return request<ProductReviewsResponse>(`/api/v1/products/${productId}/reviews?${qs}`, { method: "GET" });
}

export async function getCategoryTree(): Promise<CategoryTreeResponse> {
  return request<CategoryTreeResponse>("/api/v1/categories/tree", { method: "GET" });
}

export async function createSeller(body: SellerCreateRequest): Promise<unknown> {
  return request<unknown>("/api/v1/sellers", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getSellerMe(): Promise<SellerMe> {
  return request<SellerMe>("/api/v1/sellers/me", { method: "GET" });
}

export async function createDraft(): Promise<CreateDraftResponse> {
  return request<CreateDraftResponse>("/api/seller/v1/drafts", { method: "POST" });
}

export async function updateDraft(draftId: number, body: UpdateDraftRequest): Promise<SellerDraft> {
  return request<SellerDraft>(`/api/seller/v1/drafts/${draftId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getDraft(draftId: number): Promise<SellerDraft> {
  return request<SellerDraft>(`/api/seller/v1/drafts/${draftId}`, { method: "GET" });
}

export async function presignDraftImage(
  draftId: number,
  body: PresignDraftImageRequest,
): Promise<PresignDraftImageResponse> {
  return request<PresignDraftImageResponse>(`/api/seller/v1/drafts/${draftId}/images/presign`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function uploadFileToPresignedUrl(uploadUrl: string, file: File): Promise<void> {
  const headers = new Headers();
  if (file.type) {
    headers.set("content-type", file.type);
  }

  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers,
    body: file,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: HTTP ${res.status}: ${text || res.statusText}`);
  }
}

export async function confirmDraftImage(
  draftId: number,
  body: ConfirmDraftImageRequest,
): Promise<CreateDraftResponse> {
  return request<CreateDraftResponse>(`/api/seller/v1/drafts/${draftId}/images/confirm`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function deleteDraftImage(draftId: number, position: number): Promise<CreateDraftResponse> {
  return request<CreateDraftResponse>(`/api/seller/v1/drafts/${draftId}/images/${position}`, {
    method: "DELETE",
  });
}

export async function publishDraft(draftId: number): Promise<PublishDraftResponse> {
  return request<PublishDraftResponse>(`/api/seller/v1/drafts/${draftId}/publish`, { method: "POST" });
}

export async function cancelDraft(draftId: number): Promise<CreateDraftResponse> {
  return request<CreateDraftResponse>(`/api/seller/v1/drafts/${draftId}/cancel`, { method: "POST" });
}

export async function createOrder(body: CreateOrderRequest): Promise<OrderResponse> {
  const response = await request<OrderResponseWire>("/api/v1/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return normalizeOrderResponse(response);
}

export async function payOrder(orderId: number): Promise<OrderResponse> {
  const response = await request<OrderResponseWire>(`/api/v1/orders/${orderId}/pay`, {
    method: "POST",
  });
  return normalizeOrderResponse(response);
}

export async function getOrder(orderId: number): Promise<OrderPageResponse> {
  const response = await request<OrderPageResponseWire>(`/api/v1/orders/${orderId}`, {
    method: "GET",
  });
  return normalizeOrderPageResponse(response);
}

export async function getSellerOrder(orderId: number): Promise<OrderPageResponse> {
  const response = await request<OrderPageResponseWire>(`/api/seller/v1/orders/${orderId}`, {
    method: "GET",
  });
  return normalizeOrderPageResponse(response);
}

export async function completeSellerOrder(orderId: number): Promise<OrderResponse> {
  const response = await request<OrderResponseWire>(`/api/seller/v1/orders/${orderId}/complete`, {
    method: "POST",
  });
  return normalizeOrderResponse(response);
}

export async function refundSellerOrder(orderId: number): Promise<OrderResponse> {
  const response = await request<OrderResponseWire>(`/api/seller/v1/orders/${orderId}/refund`, {
    method: "POST",
  });
  return normalizeOrderResponse(response);
}

export async function createOrderReview(orderId: number, body: CreateReviewRequest): Promise<Review> {
  return request<Review>(`/api/v1/orders/${orderId}/review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getBuyerOrders(params?: { page?: number; size?: number }): Promise<OrderListResponse> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString();
  const response = await request<OrderListResponseWire>(`/api/v1/orders?${qs}`, {
    method: "GET",
  });
  return normalizeOrderListResponse(response);
}

export async function getSellerOrders(params?: { page?: number; size?: number }): Promise<OrderListResponse> {
  const page = params?.page ?? 0;
  const size = params?.size ?? 20;
  const qs = new URLSearchParams({ page: String(page), size: String(size) }).toString();
  const response = await request<OrderListResponseWire>(`/api/seller/v1/orders?${qs}`, {
    method: "GET",
  });
  return normalizeOrderListResponse(response);
}

export async function getOrderChatMessages(
  orderId: number,
  params?: { size?: number; beforeMessageId?: number },
): Promise<ChatMessagesResponse> {
  const qs = new URLSearchParams();
  qs.set("size", String(params?.size ?? 50));
  if (params?.beforeMessageId != null) {
    qs.set("beforeMessageId", String(params.beforeMessageId));
  }
  return request<ChatMessagesResponse>(`/api/v1/orders/${orderId}/chat/messages?${qs.toString()}`, {
    method: "GET",
  });
}

export async function getSellerOrderChatMessages(
  orderId: number,
  params?: { size?: number; beforeMessageId?: number },
): Promise<ChatMessagesResponse> {
  const qs = new URLSearchParams();
  qs.set("size", String(params?.size ?? 50));
  if (params?.beforeMessageId != null) {
    qs.set("beforeMessageId", String(params.beforeMessageId));
  }
  return request<ChatMessagesResponse>(`/api/seller/v1/orders/${orderId}/chat/messages?${qs.toString()}`, {
    method: "GET",
  });
}

export { asErrorMessage };
