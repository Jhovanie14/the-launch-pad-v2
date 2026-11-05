"use client";

import Link from "next/link";
import { CalendarPlus, IdCard, ShoppingBag, CalendarDays } from "lucide-react";

const DOCK_ITEM =
  "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-flame";

/**
 * Phone only: the three things people do standing at the site, within reach
 * of a thumb. On larger screens the same actions live in the side rail.
 */
export function ActionDock({
  onBook,
  onShowPass,
}: {
  onBook: () => void;
  onShowPass?: () => void;
}) {
  return (
    <nav
      aria-label="Quick actions"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/95 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md gap-2">
        {/* One amber target: the pass for members (they're at the bay), Book for everyone else. */}
        <button
          type="button"
          onClick={onBook}
          className={`${DOCK_ITEM} ${onShowPass ? "text-on-night hover:bg-white/10" : "bg-flame text-on-flame hover:bg-flame-bright"}`}
        >
          <CalendarPlus aria-hidden className="size-5" /> Book
        </button>
        {onShowPass ? (
          <button type="button" onClick={onShowPass} className={`${DOCK_ITEM} bg-flame text-on-flame hover:bg-flame-bright`}>
            <IdCard aria-hidden className="size-5" /> Show at bay
          </button>
        ) : (
          <Link href="/dashboard/bookings" className={`${DOCK_ITEM} text-on-night hover:bg-white/10`}>
            <CalendarDays aria-hidden className="size-5" /> Bookings
          </Link>
        )}
        <Link href="/products" className={`${DOCK_ITEM} text-on-night hover:bg-white/10`}>
          <ShoppingBag aria-hidden className="size-5" /> Shop
        </Link>
      </div>
    </nav>
  );
}
