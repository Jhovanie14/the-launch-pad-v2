"use client";

import { useAuth } from "@/context/auth-context";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Droplets,
  RotateCcw,
  Timer,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { LicensePlate } from "@/components/dashboard-home/license-plate";
import { BUSINESS_TIME_ZONE, formatClock, vehicleLabel } from "@/lib/dashboard/home";
import { cn } from "@/lib/utils";

type UsageLog = {
  id: string;
  check_in_time: string;
  check_out_time?: string;
  attendant_name?: string;
  status: string;
  notes?: string;
  vehicle?: any;
};

// A session nobody checked out of after this long was simply never closed;
// don't tell the customer they're still at the bay (matches the home).
const OPEN_SESSION_MAX_MS = 6 * 60 * 60 * 1000;

const LIGHT_FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const ROW_ACTION = cn(
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas",
  LIGHT_FOCUS,
);

/** Status reads as words plus an icon; colour never carries it alone. */
const STATUS: Record<string, { label: string; icon: LucideIcon }> = {
  in_progress: { label: "At the bay", icon: Timer },
  completed: { label: "Done", icon: Check },
  cancelled: { label: "Cancelled", icon: XCircle },
};

function visitDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  });
}

function colorsLabel(colors: unknown): string {
  if (Array.isArray(colors)) return colors.filter(Boolean).join(", ");
  return typeof colors === "string" ? colors : "";
}

function isOpenNow(log: UsageLog, now: number): boolean {
  return (
    log.status === "in_progress" &&
    !log.check_out_time &&
    now - new Date(log.check_in_time).getTime() < OPEN_SESSION_MAX_MS
  );
}

export default function SelfServiceLog() {
  const supabase = createClient();
  const { user } = useAuth();

  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    async function fetchUsageLogs() {
      if (!user?.id) return;

      setFetchingLogs(true);
      setLoadError(false);
      try {
        const { data, error } = await supabase
          .from("self_service_usage_logs")
          .select(
            `
              *,
              vehicle:vehicles (year, make, model, body_type, colors, license_plate)
              `
          )
          .eq("user_id", user?.id)
          .order("check_in_time", { ascending: false })
          // Latest 100 visits: enough history without loading years of rows.
          .limit(100);

        if (error) {
          console.error("Error fetching usage logs:", error);
          toast.error("Couldn't load your bay visits");
          setLoadError(true);
          return;
        }

        setUsageLogs(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Couldn't load your bay visits");
        setLoadError(true);
      } finally {
        setFetchingLogs(false);
      }
    }

    fetchUsageLogs();
  }, [user?.id, supabase, attempt]);

  const getDuration = (log: UsageLog) => {
    if (!log.check_out_time) return null;

    const diffMin = Math.max(
      0,
      Math.round(
        (new Date(log.check_out_time).getTime() -
          new Date(log.check_in_time).getTime()) /
          60000
      )
    );
    if (diffMin < 60) return `${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const minutes = diffMin % 60;
    return minutes ? `${hours} hr ${minutes} min` : `${hours} hr`;
  };

  const active = usageLogs.find((log) => isOpenNow(log, now));
  const history = usageLogs.filter((log) => log !== active);

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Self-service</h1>
      <p className="mt-1 text-ink-muted">
        Your bay visits at 10410 S Main St. The bays are open 24/7.
      </p>

      <div className="mt-6 space-y-6">
        {fetchingLogs ? (
          <div aria-busy="true" aria-label="Loading your bay visits" className="space-y-6">
            <div className="h-72 animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />
          </div>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7">
            <p className="flex items-center gap-2 font-semibold text-ink">
              <AlertCircle aria-hidden className="size-5 shrink-0 text-destructive" />
              We couldn&apos;t load your bay visits.
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Check your connection and try again.
            </p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className={cn(ROW_ACTION, "mt-4")}
            >
              <RotateCcw aria-hidden className="size-4" /> Try again
            </button>
          </div>
        ) : (
          <>
            {active && (
              <section
                aria-labelledby="active-visit"
                className="rounded-2xl bg-dusk p-5 text-on-night ring-1 ring-white/10 sm:p-7"
              >
                <h2
                  id="active-visit"
                  className="text-3xl font-black tracking-tight text-balance sm:text-4xl"
                >
                  You&apos;re checked in since {formatClock(active.check_in_time)}
                </h2>
                <p className="mt-1 text-on-night-muted">
                  <span className="font-semibold text-svc-self">Self-service bay</span>
                  {active.vehicle && ` · ${vehicleLabel(active.vehicle)}`}
                </p>
                {active.vehicle?.license_plate && (
                  <LicensePlate plate={active.vehicle.license_plate} className="mt-3" />
                )}
              </section>
            )}

            <section
              aria-labelledby="visits-heading"
              className="rounded-2xl bg-paper p-5 ring-1 ring-line sm:p-7"
            >
              <h2 id="visits-heading" className="text-xl font-black tracking-tight text-ink">
                Your bay visits
              </h2>

              {history.length === 0 ? (
                <div className="mt-3 max-w-prose">
                  <p className="text-sm text-ink-muted">
                    {active
                      ? "Earlier visits will show up here once you've checked out."
                      : "No bay visits yet. When staff check you in at a self-service bay, the visit shows up here with how long you stayed."}
                  </p>
                  {!active && (
                    <Link href="/self-service" className={cn(ROW_ACTION, "mt-4")}>
                      How self-service works <ArrowRight aria-hidden className="size-4" />
                    </Link>
                  )}
                </div>
              ) : (
                <ol className="mt-4 divide-y divide-line-soft">
                  {history.map((log) => {
                    const duration = getDuration(log);
                    const status = STATUS[log.status];
                    const notClosed = log.status === "in_progress" && !log.check_out_time;
                    const car = vehicleLabel(log.vehicle);
                    const carDetail = [log.vehicle?.body_type, colorsLabel(log.vehicle?.colors)]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <li key={log.id} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-4">
                          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas ring-1 ring-line">
                            <Droplets aria-hidden className="size-4 text-svc-self-mark" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <h3 className="font-bold text-ink">
                                <time dateTime={log.check_in_time}>{visitDate(log.check_in_time)}</time>
                              </h3>
                              {log.status !== "cancelled" && duration ? (
                                <span className="text-lg font-black tabular-nums tracking-tight text-ink">
                                  {duration}
                                </span>
                              ) : notClosed ? (
                                <span className="text-sm text-ink-muted">No check-out recorded</span>
                              ) : status ? (
                                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
                                  <status.icon aria-hidden className="size-4" />
                                  {status.label}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-sm tabular-nums text-ink-muted">
                              In {formatClock(log.check_in_time)}
                              {log.check_out_time && <> &ndash; out {formatClock(log.check_out_time)}</>}
                            </p>
                            {(car || log.vehicle?.license_plate) && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                {car && <span className="font-medium text-ink">{car}</span>}
                                {log.vehicle?.license_plate && (
                                  <LicensePlate plate={log.vehicle.license_plate} />
                                )}
                                {carDetail && <span className="text-ink-muted">{carDetail}</span>}
                              </div>
                            )}
                            {(log.attendant_name || log.notes) && (
                              <p className="mt-1 text-sm text-ink-muted">
                                {log.attendant_name && <>Checked in by {log.attendant_name}</>}
                                {log.attendant_name && log.notes && " · "}
                                {log.notes && <>Note: {log.notes}</>}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
