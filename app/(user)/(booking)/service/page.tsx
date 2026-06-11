"use client";

import { Suspense } from "react";
import LoadingDots from "@/components/loading";
import ServiceStep from "@/components/booking/ServiceStep";
import { useBookingAuthContext } from "@/hooks/useBookingAuthContext";

function GuestServicePage() {
  const ctx = useBookingAuthContext("guest");
  return <ServiceStep ctx={ctx} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <GuestServicePage />
    </Suspense>
  );
}
