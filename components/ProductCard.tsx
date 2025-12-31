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
      <div className="relative aspect-[4/3] overflow-hidden bg-[#0b0a10]">
        {item.image ? (
          <>
            <div
              className="absolute inset-0 scale-[1.25] blur-2xl opacity-70"
              style={{
                backgroundImage: `url(${item.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                WebkitMaskImage:
                  "radial-gradient(85% 85% at 50% 50%, #000 0%, #000 55%, transparent 100%)",
                maskImage:
                  "radial-gradient(85% 85% at 50% 50%, #000 0%, #000 55%, transparent 100%)",
              }}
              aria-hidden
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(90% 90% at 50% 50%, rgba(11,10,16,0) 0%, rgba(11,10,16,0.55) 70%, rgba(11,10,16,0.95) 100%)",
              }}
              aria-hidden
            />
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-contain transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, 33vw"
              style={{
                WebkitMaskImage:
                  "radial-gradient(80% 80% at 50% 50%, #000 70%, transparent 100%)",
                maskImage:
                  "radial-gradient(80% 80% at 50% 50%, #000 70%, transparent 100%)",
              }}
            />
          </>
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
