import { cn } from "@/lib/utils";

/**
 * A plate drawn like a plate: white ground, dark mono characters. Staff at
 * the bay match these by eye, so they read at arm's length in daylight.
 */
export function LicensePlate({
  plate,
  size = "md",
  className,
}: {
  plate: string;
  size?: "md" | "xl";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] border border-line bg-white font-mono font-semibold uppercase text-ink shadow-[0_1px_0_rgb(0_0_0/0.25)]",
        size === "md" && "px-2 py-0.5 text-sm tracking-[0.12em]",
        size === "xl" && "px-4 py-2 text-3xl tracking-[0.14em] sm:text-4xl",
        className,
      )}
    >
      <span className="sr-only">License plate </span>
      {plate}
    </span>
  );
}
