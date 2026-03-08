"use client";

import { OrderChatPageClient } from "@/app/orders/OrderChatPageClient";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default function SellerOrderPage({ params }: PageProps) {
  return <OrderChatPageClient params={params} role="seller" />;
}
