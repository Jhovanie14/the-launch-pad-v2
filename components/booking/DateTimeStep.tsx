"use client";

import { useState, useSyncExternalStore } from "react";
import { DayPicker } from "react-day-picker";
import { useRouter } from "next/navigation";
import LoadingDots from "@/components/loading";
import { useBookingFlow } from "@/hooks/useBookingFlow";
import type { BookingAuthContext } from "@/hooks/useBookingAuthContext";
import type { BookingInitialData } from "@/lib/booking/loadBookingStep";
import { DETAILING_CLOSED_WEEKDAYS } from "@/lib/booking/detailingDays";
import { BOOKING_TIME_SLOTS, isSlotPast } from "@/lib/booking/appointment";
import { cn } from "@/lib/utils";
import StepLayout from "./ui/StepLayout";
import StepProgress from "./ui/StepProgress";
import { FLAME_BUTTON, FOCUS_ON_LIGHT, SURFACE } from "./ui/focus";

const noSubscribe = () => () => {};

// The same slots the server accepts (lib/booking/appointment.ts).
const timeSlots: string[] = [...BOOKING_TIME_SLOTS];

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes.toString().padStart(2, "0")} ${period}`;
};

const formatLocaleDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

// react-day-picker v9 class names, on the brand tokens (no rdp stylesheet).
const CALENDAR_CLASSES = {
  root: "w-full",
  months: "relative",
  month: "w-full",
  month_caption: "flex h-10 items-center",
  caption_label: "text-lg font-black tracking-[-0.02em]",
  nav: "absolute right-0 top-0 flex gap-1",
  button_previous: cn("inline-flex size-10 items-center justify-center rounded-lg hover:bg-line-soft disabled:opacity-40", FOCUS_ON_LIGHT),
  button_next: cn("inline-flex size-10 items-center justify-center rounded-lg hover:bg-line-soft disabled:opacity-40", FOCUS_ON_LIGHT),
  chevron: "size-5 fill-ink",
  month_grid: "mt-2 w-full border-collapse",
  weekdays: "",
  weekday: "pb-1 text-xs font-semibold text-ink-subtle",
  week: "",
  day: "p-0.5 text-center",
  day_button: cn(
    "mx-auto flex size-10 items-center justify-center rounded-lg text-base font-semibold tabular-nums transition-colors hover:bg-line-soft motion-reduce:transition-none",
    FOCUS_ON_LIGHT
  ),
  selected: "[&>button]:bg-night [&>button]:text-on-night [&>button]:hover:bg-night",
  today: "[&>button]:ring-1 [&>button]:ring-inset [&>button]:ring-line",
  disabled:
    "[&>button]:cursor-not-allowed [&>button]:font-normal [&>button]:text-ink-subtle/50 [&>button]:line-through [&>button]:hover:bg-transparent",
  outside: "invisible",
  hidden: "invisible",
};

export default function DateTimeStep({
  ctx,
  initial,
}: {
  ctx: BookingAuthContext;
  initial?: BookingInitialData;
}) {
  const router = useRouter();
  const { service, pricing, duration, goToConfirmation } = useBookingFlow(ctx, "datetime", initial);
  // The calendar works out "today" from the clock. The server runs in UTC, so
  // from 6 pm Houston time it would draw tomorrow as today (and on a month's
  // last evening, the wrong month). Draw the calendar in the browser only.
  const inBrowser = useSyncExternalStore(noSubscribe, () => true, () => false);

  const [navigating, setNavigating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // A slot that has started is greyed out, judged by the shop's clock in
  // Houston rather than the visitor's device (same rule the server applies).
  const isPastTime = (time: string) => !!selectedDate && isSlotPast(formatLocaleDate(selectedDate), time);

  const handleContinue = () => {
    if (!selectedDate || !selectedTime) return;
    setNavigating(true);
    goToConfirmation({ date: formatLocaleDate(selectedDate), time: selectedTime });
  };

  if (navigating) {
    return <LoadingDots />;
  }

  const priceText = pricing.isServiceFree && pricing.finalTotal === 0 ? "Free with your membership" : `$${pricing.saleTotal.toFixed(2)}`;
  const summaryTitle =
    selectedDate && selectedTime
      ? `${selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${formatTime(selectedTime)}`
      : "Pick a day and time";

  return (
    <StepLayout
      above={ctx.variant === "dashboard" ? <StepProgress current={2} tone="canvas" className="mb-5" /> : undefined}
      back={{
        label: service ? `${service.name} · ${duration} min` : "Back",
        onClick: () => router.back(),
      }}
      title="Pick a day and time"
      action={{
        summaryTitle,
        summaryDetail: service ? `${service.name} · ${priceText}` : undefined,
        button: (
          <button type="button" disabled={!selectedDate || !selectedTime} onClick={handleContinue} className={FLAME_BUTTON}>
            Continue
          </button>
        ),
      }}
    >
      <p className="text-base text-ink-muted">Express detailing is open Thursday to Sunday.</p>

      <section aria-label="Day" className={cn(SURFACE, "p-4 sm:p-5")}>
        {!inBrowser ? (
          <div className="h-[22rem]" aria-hidden="true" />
        ) : (
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(d) => {
              setSelectedDate(d);
              setSelectedTime(null);
            }}
            disabled={[{ before: new Date() }, { dayOfWeek: [...DETAILING_CLOSED_WEEKDAYS] }]}
            classNames={CALENDAR_CLASSES}
          />
        )}
      </section>

      <section aria-labelledby="slots-title" className={cn(SURFACE, "p-4 sm:p-5")}>
        <h2 id="slots-title" className="text-base font-bold">
          {selectedDate
            ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
            : "Times"}
        </h2>
        {selectedDate ? (
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {timeSlots.map((time) => {
              const isDisabled = isPastTime(time);
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isDisabled}
                  onClick={() => setSelectedTime(time)}
                  className={cn(
                    "h-11 rounded-lg text-sm font-semibold tabular-nums transition-colors motion-reduce:transition-none",
                    isSelected
                      ? "bg-night text-on-night"
                      : "bg-paper ring-1 ring-inset ring-line hover:bg-line-soft",
                    "disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-subtle/50 disabled:line-through disabled:hover:bg-paper",
                    FOCUS_ON_LIGHT
                  )}
                >
                  {formatTime(time)}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-base text-ink-muted">Pick a day first, and the times appear here.</p>
        )}
      </section>
    </StepLayout>
  );
}
