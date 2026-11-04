"use client";

import Link from "next/link";
import { useState } from "react";
import { Maximize2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { LicensePlate } from "./license-plate";

export interface PassVehicle {
  id: string;
  label: string;
  plate: string | null;
  isPrimary: boolean;
}

export interface MemberPassProps {
  kind: "express" | "self_service";
  holderName: string;
  planName: string;
  description?: string | null;
  statusLine: string;
  cancelling: boolean;
  vehicles: PassVehicle[];
  /** Optional control, so the phone dock can open the same full-screen pass. */
  showing?: boolean;
  onShowingChange?: (showing: boolean) => void;
}

const KIND = {
  express: { label: "Express membership", chip: "bg-violet-400/15 text-violet-200 ring-violet-300/30" },
  self_service: { label: "Self-service plan", chip: "bg-sky-400/15 text-sky-200 ring-sky-300/30" },
} as const;

/**
 * The membership as something to show: on the dashboard it is the first thing
 * a member sees; "Show at the bay" opens it full screen, high contrast, for
 * the attendant to read the plate at arm's length.
 */
export function MemberPass({ showing: controlled, onShowingChange, ...props }: MemberPassProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const showing = controlled ?? uncontrolled;
  const setShowing = onShowingChange ?? setUncontrolled;
  const kind = KIND[props.kind];

  return (
    <section
      aria-labelledby={`pass-${props.kind}`}
      className="rounded-2xl bg-slate-950 p-5 text-white shadow-[0_18px_40px_-24px_rgb(2_6_23/0.9)] ring-1 ring-white/10 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={cn("rounded-full px-3 py-1 text-xs font-semibold ring-1", kind.chip)}>
          {kind.label}
        </span>
        <Link
          href="/dashboard/billing"
          className="rounded-md px-2 py-1 text-sm font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          Manage
        </Link>
      </div>

      <h2 id={`pass-${props.kind}`} className="mt-4 text-3xl font-black tracking-tight text-balance sm:text-4xl">
        {props.planName}
      </h2>
      <p className={cn("mt-1 text-base font-semibold", props.cancelling ? "text-amber-300" : "text-slate-300")}>
        {props.statusLine}
      </p>
      {props.description && (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-slate-400">{props.description}</p>
      )}

      {props.vehicles.length > 0 && (
        <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
          {props.vehicles.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <span className="flex items-center gap-2 text-base font-medium text-slate-100">
                {v.isPrimary && <Star aria-hidden className="size-4 fill-amber-400 text-amber-400" />}
                {v.label || "Vehicle"}
                {v.isPrimary && <span className="text-xs font-normal text-slate-300">Primary vehicle</span>}
              </span>
              {v.plate && <LicensePlate plate={v.plate} />}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowing(true)}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-5 font-bold text-amber-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:w-auto"
      >
        <Maximize2 aria-hidden className="size-4" />
        Show at the bay
      </button>

      <BayPass open={showing} onOpenChange={setShowing} {...props} />
    </section>
  );
}

function BayPass({
  open,
  onOpenChange,
  ...p
}: MemberPassProps & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-dvh max-h-dvh w-screen max-w-none flex-col justify-center gap-0 rounded-none border-0 bg-slate-950 p-6 text-white sm:max-w-none sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">The Launch Pad</p>
        <DialogTitle className="mt-4 text-4xl font-black leading-none tracking-tight sm:text-6xl">
          {p.holderName}
        </DialogTitle>
        <DialogDescription className="mt-3 text-xl font-semibold text-slate-200 sm:text-2xl">
          {p.planName} · <span className={p.cancelling ? "text-amber-300" : "text-white"}>{p.statusLine}</span>
        </DialogDescription>
        <ul className="mt-8 space-y-5">
          {p.vehicles.map((v) => (
            <li key={v.id} className="flex flex-col items-start gap-2">
              <span className="text-lg font-medium text-slate-200">
                {v.label || "Vehicle"}
                {v.isPrimary && <span className="ml-2 text-sm text-amber-300">Primary vehicle</span>}
              </span>
              {v.plate && <LicensePlate plate={v.plate} size="xl" />}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-10 min-h-12 self-start rounded-lg border border-white/30 px-6 font-semibold text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          Done
        </button>
      </DialogContent>
    </Dialog>
  );
}
