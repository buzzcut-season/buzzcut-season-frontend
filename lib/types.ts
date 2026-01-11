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
