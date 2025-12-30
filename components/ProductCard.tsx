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

export function ProductCard({ item }: { item: ProductFeedItem }) {
  return (
    <div className="card overflow-hidden group">
      <div className="relative aspect-[4/3] bg-black/30">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-zinc-500 text-sm">
            no image
          </div>
        )}
        <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
          <span className="badge">#{item.id}</span>
          <span className="badge">{item.currency}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="font-semibold leading-snug line-clamp-2">{item.name}</div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="text-pink-200 font-semibold">
            {formatMoney(item.priceSubunits, item.currency)}
          </div>
          <button className="btn btn-primary">
            В корзину
          </button>
        </div>
      </div>
    </div>
  );
}
