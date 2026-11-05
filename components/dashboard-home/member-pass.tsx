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
  express: { label: "Express membership", tone: "text-svc-member" },
  self_service: { label: "Self-service plan", tone: "text-svc-self" },
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
      className="rounded-2xl bg-night p-5 text-on-night shadow-[0_18px_40px_-24px_rgb(8_20_52/0.9)] ring-1 ring-white/10 sm:p-7"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id={`pass-${props.kind}`} className="text-3xl font-black tracking-tight text-balance sm:text-4xl">
          {props.planName}
        </h2>
        <Link
          href="/dashboard/billing"
          className="rounded-md px-2 py-1 text-sm font-medium text-on-night-muted underline-offset-4 hover:text-on-night hover:underline focus-visible:outline-2 focus-visible:outline-flame"
        >
          Manage
        </Link>
      </div>
      <p className="mt-1 text-base font-semibold">
        <span className={kind.tone}>{kind.label}</span>
        <span className="text-on-night-subtle"> · </span>
        <span className={props.cancelling ? "text-flame" : "text-on-night-muted"}>{props.statusLine}</span>
      </p>
      {props.description && (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-on-night-subtle">{props.description}</p>
      )}

      {props.vehicles.length > 0 && (
        <ul className="mt-5 divide-y divide-white/10 border-y border-white/10">
          {props.vehicles.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <span className="flex items-center gap-2 text-base font-medium text-on-night">
                {v.isPrimary && <Star aria-hidden className="size-4 fill-flame text-flame" />}
                {v.label || "Vehicle"}
                {v.isPrimary && <span className="text-xs font-normal text-on-night-muted">Primary vehicle</span>}
              </span>
              {v.plate && <LicensePlate plate={v.plate} />}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setShowing(true)}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-bright sm:w-auto"
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
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-h-dvh w-screen max-w-none flex-col justify-start gap-0 overflow-y-auto rounded-none border-0 bg-night p-6 text-on-night motion-reduce:animate-none sm:max-w-none sm:justify-[safe_center] sm:p-12"
      >
        <DialogTitle className="text-4xl font-black leading-none tracking-tight sm:text-6xl">
          {p.holderName}
        </DialogTitle>
        <DialogDescription className="mt-3 text-xl font-semibold text-on-night-muted sm:text-2xl">
          {p.planName} · <span className={p.cancelling ? "text-flame" : "text-on-night"}>{p.statusLine}</span>
        </DialogDescription>
        <ul className="mt-8 space-y-5">
          {p.vehicles.map((v) => (
            <li key={v.id} className="flex flex-col items-start gap-2">
              <span className="text-lg font-medium text-on-night-muted">
                {v.label || "Vehicle"}
                {v.isPrimary && <span className="ml-2 text-sm text-flame">Primary vehicle</span>}
              </span>
              {v.plate && <LicensePlate plate={v.plate} size="xl" />}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="mt-10 min-h-12 self-start rounded-lg border border-white/30 px-6 font-semibold text-on-night hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-flame"
        >
          Done
        </button>
      </DialogContent>
    </Dialog>
  );
}
