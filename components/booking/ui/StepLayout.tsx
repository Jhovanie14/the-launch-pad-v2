"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT } from "./focus";

export interface StepAction {
  summaryTitle: string;
  summaryDetail?: string;
  /** The step's one flame button. */
  button: React.ReactNode;
}

/**
 * The frame every booking step shares: a back link, the title, the content,
 * and the action panel. On phones the panel is a navy bar fixed to the
 * bottom; from 1024px it is a sticky white surface in a 320px side column.
 */
export default function StepLayout({
  back,
  title,
  above,
  children,
  action,
}: {
  back?: { label: string; href?: string; onClick?: () => void };
  title: string;
  /** Rendered above the back link (the dashboard tree's step progress). */
  above?: React.ReactNode;
  children: React.ReactNode;
  action: StepAction;
}) {
  const backClass = cn(
    "inline-flex min-h-11 items-center gap-2 rounded-lg pr-2 text-sm font-semibold text-ink-muted hover:text-ink",
    FOCUS_ON_LIGHT
  );
  return (
    <div className="pb-32 lg:pb-0">
      {above}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
        <div className="min-w-0">
          {back &&
            (back.href ? (
              <Link href={back.href} className={backClass}>
                <ArrowLeft className="size-4" aria-hidden />
                {back.label}
              </Link>
            ) : (
              <button type="button" onClick={back.onClick} className={backClass}>
                <ArrowLeft className="size-4" aria-hidden />
                {back.label}
              </button>
            ))}
          <h1 className="mt-1 text-2xl font-black tracking-[-0.025em] text-balance sm:text-3xl">{title}</h1>
          <div className="mt-5 space-y-4">{children}</div>
        </div>

        <aside
          aria-label="Your booking"
          className={cn(
            // Phone: a navy bar fixed to the bottom.
            "fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 bg-night px-4 pt-3 text-on-night",
            "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
            // From 1024px: a sticky white surface in the side column.
            "lg:sticky lg:top-24 lg:z-auto lg:flex-col lg:items-stretch lg:gap-4 lg:rounded-2xl lg:bg-paper lg:p-5 lg:text-ink lg:ring-1 lg:ring-line"
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold lg:whitespace-normal lg:text-lg lg:font-black lg:tracking-[-0.02em]">
              {action.summaryTitle}
            </p>
            {action.summaryDetail && (
              <p className="truncate text-sm text-on-night-muted lg:mt-0.5 lg:whitespace-normal lg:text-ink-muted">
                {action.summaryDetail}
              </p>
            )}
          </div>
          <div className="shrink-0 lg:[&>*]:w-full">{action.button}</div>
        </aside>
      </div>
    </div>
  );
}
