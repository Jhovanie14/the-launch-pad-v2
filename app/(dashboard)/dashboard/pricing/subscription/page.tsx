// app/(dashboard)/dashboard/pricing/subscription/page.tsx
"use client";
import { Suspense } from "react";
import SubscriptionCart from "@/components/subscription/SubscriptionCart";
import LoadingDots from "@/components/loading";

function SubscriptionCartPage() {
  return <SubscriptionCart />;
}

export default function SubscriptionCard() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <SubscriptionCartPage />
    </Suspense>
  );
}
