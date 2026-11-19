"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import StepProgress from "./ui/StepProgress";
import { FOCUS_ON_NIGHT } from "./ui/focus";

function stepFor(pathname: string): 1 | 2 | 3 {
  if (pathname.startsWith("/confirmation")) return 3;
  if (pathname.startsWith("/datetime")) return 2;
  return 1;
}

/** The guest booking frame's header: the bay at night, with the steps under it. */
export default function BookingHeader() {
  const pathname = usePathname() ?? "/service";
  return (
    <header className="sticky top-0 z-50 bg-night text-on-night shadow-[0_8px_24px_-16px_oklch(0.2_0.07_262/0.8)]">
      <div className="mx-auto max-w-7xl px-4 pb-3 pt-3 sm:px-6 lg:px-8">
        <div className="flex h-11 items-center justify-between gap-4">
          <Link href="/" className={cn("flex shrink-0 items-center gap-2 rounded-lg", FOCUS_ON_NIGHT)}>
            <Image src="/thelaunchpad.png" alt="The Launch Pad" width={40} height={40} className="size-10 object-contain" priority />
            <span aria-hidden className="hidden text-sm font-black tracking-tight sm:inline">
              THE LAUNCH PAD
            </span>
          </Link>
          <Link
            href="/"
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-3 text-sm font-semibold text-on-night-muted ring-1 ring-paper/20 transition-colors hover:bg-paper/10 hover:text-on-night motion-reduce:transition-none",
              FOCUS_ON_NIGHT
            )}
          >
            Back to site
          </Link>
        </div>
        <StepProgress current={stepFor(pathname)} tone="night" className="mt-3" />
      </div>
    </header>
  );
}
