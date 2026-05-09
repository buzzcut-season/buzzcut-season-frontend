"use client";

import { OrderDetailsPageClient } from "@/app/orders/OrderDetailsPageClient";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default function BuyerOrderPage({ params }: PageProps) {
  return <OrderDetailsPageClient params={params} role="buyer" />;
}
