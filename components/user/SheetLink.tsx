import Link from "next/link";
import { cn } from "@/lib/utils";

const FOCUS_ON_NIGHT = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

/**
 * The navy phone menu panel. The close button is restyled through the
 * `[&>button]` variants: a 44px target with the Flame focus outline.
 */
export const NIGHT_SHEET_CONTENT = [
  "w-[85vw] max-w-sm gap-0 border-l-0 bg-night p-0 text-on-night",
  "[&>button]:top-2.5 [&>button]:right-2.5 [&>button]:inline-flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-lg",
  "[&>button]:text-on-night [&>button]:opacity-100 [&>button]:hover:bg-white/10",
  "[&>button]:focus:ring-0 [&>button]:focus:ring-offset-0 [&>button]:focus-visible:outline-2 [&>button]:focus-visible:outline-offset-2 [&>button]:focus-visible:outline-flame",
].join(" ");

/** A 48px row in a navy phone menu; the current page gets the light pill. */
export function SheetLink({
  name,
  href,
  active,
  onNavigate,
}: {
  name: string;
  href: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center rounded-lg px-4 font-semibold transition-colors",
          active ? "bg-white/12 text-on-night" : "text-on-night-muted hover:bg-white/8 hover:text-on-night",
          FOCUS_ON_NIGHT,
        )}
      >
        {name}
      </Link>
    </li>
  );
}
