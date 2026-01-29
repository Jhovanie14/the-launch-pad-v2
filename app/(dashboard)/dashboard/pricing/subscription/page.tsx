// app/(dashboard)/dashboard/pricing/subscription/page.tsx
"use client";
import { Suspense } from "react";
import SubscriptionCart from "@/components/subscription/SubscriptionCart";
import LoadingDots from "@/components/loading";
import { Loader2 } from "lucide-react";

function SubscriptionCartPage() {
  return <SubscriptionCart />;
}

export default function SubscriptionCard() {
  return (
    <Suspense fallback={<Loader2 className="ml-2 w-5 h-5 animate-spin" />}>
      <SubscriptionCartPage />
    </Suspense>
  );
}
