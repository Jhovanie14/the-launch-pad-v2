"use client";

import ServiceStep from "@/components/booking/ServiceStep";
import DateTimeStep from "@/components/booking/DateTimeStep";
import ConfirmationStep from "@/components/booking/ConfirmationStep";
import { useBookingAuthContext, type BookingVariant } from "@/hooks/useBookingAuthContext";
import type { BookingStep } from "@/lib/booking/bookingParams";
import type { BookingInitialData } from "@/lib/booking/loadBookingStep";

/** The browser half of a booking step page: the server page passes what it loaded. */
export default function BookingStepShell({
  variant,
  step,
  initial,
}: {
  variant: BookingVariant;
  step: BookingStep;
  initial: BookingInitialData;
}) {
  const ctx = useBookingAuthContext(variant, initial);
  if (step === "service") return <ServiceStep ctx={ctx} initial={initial} />;
  if (step === "datetime") return <DateTimeStep ctx={ctx} initial={initial} />;
  return <ConfirmationStep ctx={ctx} initial={initial} />;
}
