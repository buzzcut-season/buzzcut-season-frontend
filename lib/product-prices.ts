import type { CurrencyCode, ProductPriceFields } from "@/lib/types";

const CURRENCY_TO_PRICE_KEY: Record<CurrencyCode, keyof ProductPriceFields> = {
  USD: "priceUsd",
  EUR: "priceEur",
  RUB: "priceRub",
};

export function getPriceForCurrency(
  product: ProductPriceFields | null | undefined,
  currency: CurrencyCode,
): string | null {
  if (!product) return null;
  return product[CURRENCY_TO_PRICE_KEY[currency]] ?? null;
}

export function getAvailableCurrencies(
  product: ProductPriceFields | null | undefined,
): CurrencyCode[] {
  if (!product) return [];

  return (Object.entries(CURRENCY_TO_PRICE_KEY) as Array<[CurrencyCode, keyof ProductPriceFields]>)
    .filter(([, key]) => product[key] != null)
    .map(([currency]) => currency);
}
