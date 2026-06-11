"use client";

import { Suspense } from "react";
import LoadingDots from "@/components/loading";
import DateTimeStep from "@/components/booking/DateTimeStep";
import { useBookingAuthContext } from "@/hooks/useBookingAuthContext";

function DashboardDateTimePage() {
  const ctx = useBookingAuthContext("dashboard");
  return <DateTimeStep ctx={ctx} />;
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingDots />}>
      <DashboardDateTimePage />
    </Suspense>
  );
}
