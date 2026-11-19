"use client";

import { ArrowRight } from "lucide-react";
import { useBooking } from "@/context/bookingContext";
import { FLAME_BUTTON } from "@/components/booking/ui/focus";
import { cn } from "@/lib/utils";

/** The home hero's one flame action: opens the booking pop-up, like the navbar's "Book". */
export function BookDetailButton({ className }: { className?: string }) {
  const { openBookingModal } = useBooking();
  return (
    <button type="button" onClick={openBookingModal} className={cn(FLAME_BUTTON, "h-13 px-7", className)}>
      Book a detail <ArrowRight aria-hidden className="size-4" />
    </button>
  );
}
