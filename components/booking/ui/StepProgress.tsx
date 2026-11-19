import { cn } from "@/lib/utils";

const STEPS = ["Service", "Date and time", "Confirm"] as const;

/**
 * Where the customer is in the three booking steps. `night` sits in the navy
 * guest header; `canvas` sits on the page under the dashboard navbar.
 */
export default function StepProgress({
  current,
  tone,
  className,
}: {
  current: 1 | 2 | 3;
  tone: "night" | "canvas";
  className?: string;
}) {
  const night = tone === "night";
  return (
    <ol aria-label="Booking steps" className={cn("grid grid-cols-3 gap-1.5", className)}>
      {STEPS.map((label, i) => {
        const n = i + 1;
        const reached = n <= current;
        const isCurrent = n === current;
        return (
          <li key={label} aria-current={isCurrent ? "step" : undefined} className="min-w-0">
            <span
              aria-hidden
              className={cn(
                "block h-[5px] rounded-full",
                reached ? "bg-flame" : night ? "bg-paper/20" : "bg-line"
              )}
            />
            <span
              className={cn(
                "mt-1.5 block truncate text-xs font-semibold",
                isCurrent
                  ? night ? "text-on-night" : "text-ink"
                  : night ? "text-on-night-subtle" : "text-ink-subtle"
              )}
            >
              {n} {label}
              {reached && !isCurrent && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
