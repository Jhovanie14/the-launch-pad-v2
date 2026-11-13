"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compareSlots,
  dayLabel,
  firstName,
  formatTime12,
  monthGrid,
  monthOf,
  queueStatus,
  shiftMonth,
  type CalendarEntry,
} from "@/lib/admin/bookingQueue";
import { cn } from "@/lib/utils";
import { STATUS_DOT } from "./booking-card";

type Props = {
  month: string;
  today: string;
  selected: string;
  /** Already filtered for "Show cancelled". */
  entries: CalendarEntry[];
  onSelect: (date: string) => void;
  onMonthChange: (month: string) => void;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const NAMES_SHOWN = 3;
const DOTS_SHOWN = 5;

function monthTitle(month: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export function QueueCalendar({ month, today, selected, entries, onSelect, onMonthChange }: Props) {
  const weeks = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();
    for (const e of [...entries].sort(compareSlots)) {
      const list = map.get(e.appointment_date);
      if (list) list.push(e);
      else map.set(e.appointment_date, [e]);
    }
    return map;
  }, [entries]);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Previous month"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          >
            <ChevronLeft className="size-5" />
          </Button>
          <h2 className="min-w-36 text-center font-semibold">{monthTitle(month)}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Next month"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          >
            <ChevronRight className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-1 h-9"
            onClick={() => {
              onMonthChange(monthOf(today));
              onSelect(today);
            }}
          >
            Today
          </Button>
        </div>
        <ul className="flex items-center gap-3 text-xs text-muted-foreground" aria-label="Legend">
          <li className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", STATUS_DOT.waiting)} aria-hidden /> Waiting
          </li>
          <li className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", STATUS_DOT.in_progress)} aria-hidden /> In progress
          </li>
          <li className="flex items-center gap-1">
            <span className={cn("size-2 rounded-full", STATUS_DOT.done)} aria-hidden /> Done
          </li>
        </ul>
      </div>

      <div className="@container">
        <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {weeks.flat().map((date) => {
            const dayEntries = byDate.get(date) ?? [];
            const inMonth = monthOf(date) === month;
            const isToday = date === today;
            const isSelected = date === selected;
            const count = dayEntries.length;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onSelect(date)}
                aria-pressed={isSelected}
                aria-label={`${dayLabel(date)}, ${count} ${count === 1 ? "booking" : "bookings"}`}
                className={cn(
                  "relative flex min-h-14 flex-col items-stretch gap-0.5 border-r border-b p-1 text-left text-xs transition-colors hover:bg-slate-50 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-900/40 @2xl:min-h-20 @2xl:p-1.5 [&:nth-child(7n)]:border-r-0",
                  !inMonth && "bg-slate-50/60 text-muted-foreground/60",
                  isToday && "bg-blue-50/70",
                  isSelected && "z-[1] outline-2 -outline-offset-2 outline-blue-900",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center self-start rounded-full tabular-nums",
                    isToday && "bg-blue-900 font-semibold text-white",
                  )}
                >
                  {Number(date.slice(8))}
                </span>

                {count > 0 && (
                  <>
                    {/* Narrow: dots + count */}
                    <span className="flex flex-wrap items-center gap-0.5 @2xl:hidden" aria-hidden>
                      {dayEntries.slice(0, DOTS_SHOWN).map((e) => (
                        <span key={e.id} className={cn("size-1.5 rounded-full", STATUS_DOT[queueStatus(e.status)])} />
                      ))}
                      <span className="ml-0.5 font-medium text-foreground tabular-nums">{count}</span>
                    </span>

                    {/* Wide: time + first name */}
                    <span className="hidden flex-col gap-0.5 @2xl:flex" aria-hidden>
                      {dayEntries.slice(0, NAMES_SHOWN).map((e) => (
                        <span key={e.id} className="flex min-w-0 items-center gap-1">
                          <span className={cn("size-1.5 shrink-0 rounded-full", STATUS_DOT[queueStatus(e.status)])} />
                          <span className="truncate">
                            <span className="tabular-nums text-muted-foreground">{formatTime12(e.appointment_time)}</span>{" "}
                            {firstName(e.customer_name)}
                          </span>
                        </span>
                      ))}
                      {count > NAMES_SHOWN && (
                        <span className="text-muted-foreground">+{count - NAMES_SHOWN} more</span>
                      )}
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
