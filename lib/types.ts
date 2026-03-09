export type HealthResponse = {
  status: "UP" | "DOWN" | string;
  groups?: string[];
};

export type SendCodeRequest = {
  email: string;
  recaptchaResponse: string;
};

export type SendCodeResponse = {
  cooldownSeconds: number;
};

export type AuthenticateRequest = {
  email: string;
  code: string;
  recaptchaResponse: string;
};

export type AuthenticateResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshTokenExpiresAt: string;
  isNewAccount: boolean;
};

export type RefreshTokenRequest = {
  refreshToken: string;
};

export type RefreshTokenResponse = {
  accessToken: string;
  expiresAt: string;
};

export type SellerCreateRequest = {
  name: string;
};

export type AccountMe = {
  id: number;
  email: string;
};

export type SellerStatus = "ACTIVE" | string;

export type SellerMe = {
  id: number;
  name: string;
  userId: number;
  status: SellerStatus;
  createdAt: string;
  updatedAt: string;
};

export type ProductFeedItem = {
  id: number;
  name: string;
  prices?: Array<{
    currency: string;
    price: string;
  }> | null;
  image?: string | null;
};

export type ProductFeedResponse = {
  page: number;
  size: number;
  items: ProductFeedItem[];
};

export type ProductCardPrice = {
  currency: string;
  price: string;
};

export type ProductCardImage = {
  position: number;
  image: string;
};

export type ProductCard = {
  id: number;
  name: string;
  description: string;
  seller: string;
  prices: ProductCardPrice[];
  images: ProductCardImage[];
};

export type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  children: CategoryNode[];
};

export type CategoryTreeResponse = {
  categories: CategoryNode[];
};

export type DraftCurrency = "RUB" | "USD" | "EUR" | string;

export type SellerDraftStatus = "EMPTY" | "IN_PROGRESS" | "READY" | "PUBLISHED" | "CANCELED" | string;

export type DraftImage = {
  position: number;
  image: string;
};

export type CreateDraftResponse = {
  draftId: number;
};

export type UpdateDraftRequest = {
  name: string;
  description: string;
  currency: DraftCurrency;
  price: string;
  categoryId: number;
};

export type SellerDraft = {
  draftId: number;
  name?: string;
  description?: string;
  currency?: DraftCurrency;
  price?: string;
  categoryId?: number;
  status: SellerDraftStatus;
  images?: DraftImage[];
};

export type PresignDraftImageRequest = {
  fileName: string;
  sizeBytes: number;
};

export type PresignDraftImageResponse = {
  draftId: number;
  token: string;
  uploadUrl: string;
};

export type ConfirmDraftImageRequest = {
  token: string;
};

export type PublishDraftResponse = {
  draftId: number;
  productId: number;
};

export type OrderStatus = "CREATED" | "PAID" | "COMPLETED" | string;

export type CreateOrderRequest = {
  productId: number;
  currency: string;
};

export type OrderDisplaySettings = {
  productName: string | null;
  coverImage: string | null;
};

export type OrderResponse = {
  orderId: number;
  productId: number;
  sellerId: number;
  buyerId: number;
  amount: number;
  precision: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  displaySettings: OrderDisplaySettings;
};

export type OrderListResponse = {
  orders: OrderResponse[];
};

export type ChatParticipant = "BUYER" | "SELLER" | string;

export type ChatMessage = {
  id: number;
  participant: ChatParticipant;
  body: string;
  createdAt: string;
};

export type ChatMessagesResponse = {
  chatId: number;
  buyer: string;
  seller: string;
  size: number;
  nextCursorMessageId: number | null;
  messages: ChatMessage[];
};
