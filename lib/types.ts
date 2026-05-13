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

export type AccountMe = {
  id: number;
  email: string;
  nickname: string;
  birthDate: string | null;
  gender: AccountGender | null;
};

export type AccountGender = "MALE" | "FEMALE";

export type UpdateAccountMeRequest = {
  nickname: string;
  birthDate: string | null;
  gender: AccountGender | null;
};

export type CurrencyCode = "RUB" | "USD" | "EUR";

export type ProductPriceFields = {
  priceUsd?: string | null;
  priceEur?: string | null;
  priceRub?: string | null;
};

export type ProductFeedItem = {
  id: number;
  name: string;
  priceUsd?: string | null;
  priceEur?: string | null;
  priceRub?: string | null;
  image?: string | null;
  ratingAvg?: string | null;
  reviewsCount?: number | null;
};

export type ProductFeedResponse = {
  page: number;
  size: number;
  items: ProductFeedItem[];
};

export type ProductCardImage = {
  position: number;
  image: string;
};

export type ProductReviewStats = {
  ratingAvg: string | null;
  reviewsCount: number;
};

export type ProductCard = {
  id: number;
  sellerId: number;
  chatKey: string | null;
  name: string;
  description: string;
  seller: string;
  priceUsd?: string | null;
  priceEur?: string | null;
  priceRub?: string | null;
  images: ProductCardImage[];
  ratingAvg?: string | null;
  reviewsCount?: number | null;
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

export type DraftCurrency = CurrencyCode | string;

export type SellerDraftStatus =
  | "EMPTY"
  | "IN_PROGRESS"
  | "READY"
  | "PUBLISHING_STARTED"
  | "PUBLISHED"
  | "CANCELED"
  | string;

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

export type OrderStatus = "CREATED" | "PAID" | "COMPLETED" | "REFUNDED" | string;

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
  chatKey: string | null;
  buyerId: number | null;
  sellerId: number | null;
  price: string;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  displaySettings: OrderDisplaySettings;
};

export type OrderPageResponse = OrderResponse & {
  review: Review | null;
};

export type OrderListResponse = {
  orders: OrderResponse[];
};

export type ChatParticipant = "BUYER" | "SELLER" | string;

export type ChatMessage = {
  id: number;
  clientMessageId: string | null;
  userId: number;
  name: string;
  body: string;
  createdAt: string;
};

export type ChatListItem = {
  chatKey: string;
  userId: number;
  nickname: string;
  body: string;
  createdAt: string;
};

export type ChatListResponse = {
  page: number;
  size: number;
  messages: ChatListItem[];
};

export type ChatMessagesResponse = {
  chatKey: string;
  size: number;
  nextCursorMessageId: number | null;
  items: ChatMessage[];
};

export type Review = {
  id: number;
  buyer: string;
  rating: number;
  text: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type ProductReviewsResponse = {
  averageRating: string | null;
  totalCount: number;
  items: Review[];
};

export type CreateReviewRequest = {
  rating: number;
  text?: string;
};
