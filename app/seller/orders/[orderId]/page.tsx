"use client";

import { OrderDetailsPageClient } from "@/app/orders/OrderDetailsPageClient";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default function SellerOrderPage({ params }: PageProps) {
  return <OrderDetailsPageClient params={params} role="seller" />;
}
