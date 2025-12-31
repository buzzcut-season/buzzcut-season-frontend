import Image from "next/image";
import type { ProductFeedItem } from "@/lib/types";

function formatMoney(subunits: number, currency: string) {
  const amount = subunits / 100;
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function ProductCard({
  item,
  currency,
}: {
  item: ProductFeedItem;
  currency: string;
}) {
  const priceSubunits = item.prices?.[currency] ?? item.priceSubunits;
  const priceCurrency = item.prices?.[currency] ? currency : item.currency;

  return (
    <div className="card overflow-hidden group">
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f3f6fb 45%, #e7f0ff 100%)",
        }}
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[var(--muted)] text-sm">
            no image
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="font-semibold leading-snug line-clamp-2">{item.name}</div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-[var(--ink)] font-semibold">
            {formatMoney(priceSubunits, priceCurrency)}
          </div>
          <button className="btn btn-primary">
            Купить
          </button>
        </div>
      </div>
    </div>
  );
}
