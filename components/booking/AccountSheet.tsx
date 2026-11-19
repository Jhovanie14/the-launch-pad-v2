"use client";

import Link from "next/link";
import { CalendarCheck, Percent, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WelcomeOffer } from "@/lib/booking/welcomeOffer";
import BookingSheet from "./ui/BookingSheet";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, GHOST_BUTTON } from "./ui/focus";

function Point({ icon: Icon, children }: { icon: typeof Star; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-base leading-snug">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas ring-1 ring-line">
        <Icon className="size-4 text-brand-blue" aria-hidden />
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

/**
 * Shown to guests when the service step opens: a free account, never framed
 * as a membership (that word means the paid plan). The promo point appears
 * only when checkout would accept the code (lib/booking/welcomeOffer.ts).
 */
export default function AccountSheet({
  open,
  onOpenChange,
  welcomeOffer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  welcomeOffer: WelcomeOffer | null;
}) {
  return (
    <BookingSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Create a free account"
      description="Book faster next time, and keep every visit in one place."
      footer={
        <>
          <Link href="/signup" className={cn(FLAME_BUTTON, "w-full")}>
            Create free account
          </Link>
          <button type="button" onClick={() => onOpenChange(false)} className={cn(GHOST_BUTTON, "w-full")}>
            Continue as guest
          </button>
          <p className="pt-1 text-center text-sm text-ink-muted">
            Already have an account?{" "}
            <Link href="/login" className={cn("rounded font-semibold text-brand-blue underline-offset-2 hover:underline", FOCUS_ON_LIGHT)}>
              Sign in
            </Link>
          </p>
        </>
      }
    >
      <ul className="space-y-3">
        <Point icon={CalendarCheck}>Track and manage your bookings easily.</Point>
        <Point icon={Star}>See membership plans for regular savings.</Point>
        {welcomeOffer && (
          <Point icon={Percent}>
            {welcomeOffer.percent}% off a booking with promo code{" "}
            <span className="font-semibold tracking-wide">{welcomeOffer.code}</span>
          </Point>
        )}
      </ul>
    </BookingSheet>
  );
}
