"use client";

import { Suspense } from "react";
import LoadingDots from "@/components/loading";
import ConfirmationStep from "@/components/booking/ConfirmationStep";
import { useBookingAuthContext } from "@/hooks/useBookingAuthContext";

function GuestConfirmationPage() {
  const ctx = useBookingAuthContext("guest");
  return <ConfirmationStep ctx={ctx} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <GuestConfirmationPage />
    </Suspense>
  );
}
