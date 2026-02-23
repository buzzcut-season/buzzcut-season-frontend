import { notFound } from "next/navigation";
import { SellerPageClient } from "../SellerPageClient";

type SellerDraftPageProps = {
  params: Promise<{
    draftId: string;
  }>;
};

export default async function SellerDraftPage({ params }: SellerDraftPageProps) {
  const resolved = await params;
  const parsed = Number(resolved.draftId);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    notFound();
  }

  return <SellerPageClient initialDraftId={parsed} />;
}
