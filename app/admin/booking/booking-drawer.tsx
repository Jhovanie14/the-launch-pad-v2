"use client";

import { useState, type ReactNode } from "react";
import { Ban, Loader2, Mail, Pencil, Phone, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  QUEUE_STATUS_LABEL,
  dayLabel,
  formatTime12,
  queueStatus,
  tookLabel,
} from "@/lib/admin/bookingQueue";
import { cn } from "@/lib/utils";
import type { Booking } from "@/types";
import { STATUS_DOT, vehicleLine } from "./booking-card";

type Props = {
  booking: Booking | null;
  isMember: boolean;
  canDelete: boolean;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (b: Booking) => void;
  onCancelBooking: (b: Booking) => void;
  onDelete: (b: Booking) => void;
};

function money(value: string | number | null | undefined): string {
  const n = Number(value);
  return value === null || value === undefined || value === "" || !Number.isFinite(n) ? "—" : `$${n.toFixed(2)}`;
}

function when(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "medium", timeStyle: "short" });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}

export function BookingDrawer({ booking, isMember, canDelete, busy, onOpenChange, onEdit, onCancelBooking, onDelete }: Props) {
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);

  const status = booking ? queueStatus(booking.status) : null;
  const took = booking ? tookLabel(booking.confirmed_at, booking.completed_at) : null;
  const canCancel = booking ? booking.status !== "cancelled" && booking.status !== "completed" : false;

  return (
    <>
      <Sheet open={booking !== null} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          {booking && status && (
            <>
              <SheetHeader className="pb-0">
                <SheetTitle className="pr-6 text-xl">{booking.customer_name?.trim() || "Guest"}</SheetTitle>
                <SheetDescription className="flex flex-wrap items-center gap-x-2">
                  <span>
                    {dayLabel(booking.appointment_date)} · {formatTime12(booking.appointment_time)} ·{" "}
                    {booking.total_duration} min
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("size-2 rounded-full", STATUS_DOT[status])} aria-hidden />
                    {QUEUE_STATUS_LABEL[status]}
                    {took && status === "done" ? ` · took ${took}` : ""}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 px-4 pb-4">
                <Section title="Contact">
                  {booking.customer_phone ? (
                    <a
                      href={`tel:${booking.customer_phone}`}
                      className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium hover:bg-slate-50"
                    >
                      <Phone className="size-4" aria-hidden /> {booking.customer_phone}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No phone on file</p>
                  )}
                  {booking.customer_email ? (
                    <a
                      href={`mailto:${booking.customer_email}`}
                      className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm break-all hover:bg-slate-50"
                    >
                      <Mail className="size-4 shrink-0" aria-hidden /> {booking.customer_email}
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">No email on file</p>
                  )}
                  {isMember && <p className="text-sm font-medium text-purple-900">Active member</p>}
                </Section>

                <Section title="Vehicle">
                  {booking.vehicle ? (
                    <p className="text-sm">
                      <span className="mr-2 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold uppercase tracking-wide">
                        {booking.vehicle.license_plate}
                      </span>
                      {vehicleLine(booking)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No vehicle on file</p>
                  )}
                </Section>

                <Section title="Price">
                  <Row label={booking.service_package_name || "Service"}>{money(booking.service_package_price)}</Row>
                  {(booking.add_ons ?? []).filter(Boolean).map((a) => (
                    <Row key={a.id ?? a.name} label={a.name}>
                      {money(a.price)}
                    </Row>
                  ))}
                  <div className="border-t pt-1.5">
                    <Row label="Total">
                      <span className="font-semibold">{money(booking.total_price)}</span>
                    </Row>
                  </div>
                  <Row label="Payment">
                    <span className="capitalize">{booking.payment_method || "—"}</span>
                  </Row>
                </Section>

                {(booking.notes?.trim() || booking.special_instructions?.trim()) && (
                  <Section title="Notes">
                    {booking.notes?.trim() && <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>}
                    {booking.special_instructions?.trim() && (
                      <p className="text-sm whitespace-pre-wrap">
                        <span className="font-medium">Special instructions: </span>
                        {booking.special_instructions}
                      </p>
                    )}
                  </Section>
                )}

                <Section title="Wash">
                  <Row label="Attendant">{booking.attendant_name || "—"}</Row>
                  <Row label="Started">{when(booking.confirmed_at)}</Row>
                  <Row label="Finished">{when(booking.completed_at)}</Row>
                  {took && <Row label="Took">{took}</Row>}
                </Section>

                <Section title="Booking">
                  <p className="font-mono text-xs break-all text-muted-foreground">{booking.id}</p>
                  <Row label="Booked">{when(booking.created_at)}</Row>
                </Section>

                <div className="flex flex-col gap-2 border-t pt-4">
                  {booking.status === "pending" && (
                    <Button variant="outline" className="min-h-11" onClick={() => onEdit(booking)} disabled={busy}>
                      <Pencil className="size-4" aria-hidden /> Edit booking
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="outline"
                      className="min-h-11 text-amber-800 hover:text-amber-900"
                      onClick={() => setConfirm("cancel")}
                      disabled={busy}
                    >
                      <Ban className="size-4" aria-hidden /> Cancel booking
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="outline"
                      className="min-h-11 text-red-700 hover:text-red-800"
                      onClick={() => setConfirm("delete")}
                      disabled={busy}
                    >
                      <Trash2 className="size-4" aria-hidden /> Delete booking
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "delete" ? "Delete this booking? This can't be undone." : "Cancel this booking?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {booking
                ? `${booking.customer_name?.trim() || "Guest"}, ${dayLabel(booking.appointment_date)} at ${formatTime12(booking.appointment_time)}.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className={confirm === "delete" ? "bg-red-700 hover:bg-red-800" : "bg-amber-700 hover:bg-amber-800"}
              onClick={() => {
                if (!booking) return;
                if (confirm === "delete") onDelete(booking);
                else onCancelBooking(booking);
                setConfirm(null);
              }}
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {confirm === "delete" ? "Delete booking" : "Cancel booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
