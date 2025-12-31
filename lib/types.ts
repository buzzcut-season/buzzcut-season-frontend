export type HealthResponse = {
  status: "UP" | "DOWN" | string;
  groups?: string[];
};

export type SendCodeRequest = {
  email: string;
};

export type SendCodeResponse = {
  cooldownSeconds: number;
};

export type AuthenticateRequest = {
  email: string;
  code: string;
};

export type AuthenticateResponse = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  refreshTokenExpiresAt: string;
  isNewAccount: boolean;
};

export type ProductFeedItem = {
  id: number;
  name: string;
  priceSubunits: number;
  currency: string;
  image: string;
  prices?: Record<string, number>;
};

export type ProductFeedResponse = {
  page: number;
  size: number;
  items: ProductFeedItem[];
};
