import Link from "next/link";
import { cn } from "@/lib/utils";

const FOCUS_ON_NIGHT = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

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
