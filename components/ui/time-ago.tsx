"use client";

import { useEffect, useState } from "react";

/**
 * Formats a date as a human-readable relative time (e.g. "3 days ago").
 * Pure helper — exported for reuse and testing.
 */
export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return "just now"; // handles null or undefined

  const _date = new Date(date);
  if (isNaN(_date.getTime())) return "just now"; // invalid date string

  const seconds = Math.floor((Date.now() - _date.getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds} seconds ago`;

  const intervals: Record<string, number> = {
    year: 31536000,
    month: 2628000,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
    }
  }

  return "just now";
}

/**
 * Renders a relative timestamp in a hydration-safe way.
 *
 * Relative time depends on the current clock, so computing it during render
 * would produce different output on the server and on the client, triggering a
 * React hydration mismatch. Instead we render an empty label on the server and
 * first client render (which match), then fill it in from an effect after
 * mount. `suppressHydrationWarning` is defense-in-depth for the text node.
 */
export function TimeAgo({
  date,
  className,
}: {
  date: Date | string | null | undefined;
  className?: string;
}) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(formatTimeAgo(date));
  }, [date]);

  return (
    <span className={className} suppressHydrationWarning>
      {label}
    </span>
  );
}
