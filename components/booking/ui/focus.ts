// Focus outlines for the booking screens (DESIGN.md: Flame on navy, Brand
// Blue with a 2px offset on white).
export const FOCUS_ON_NIGHT =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";
export const FOCUS_ON_LIGHT =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue";

/** The one flame-filled button a screen (or open sheet) may have. */
export const FLAME_BUTTON =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-flame px-5 text-base font-bold text-on-flame transition-colors hover:bg-flame-bright disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame-bright";

/** Quiet button on white. */
export const GHOST_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-base font-semibold text-ink-muted transition-colors hover:bg-line-soft motion-reduce:transition-none " +
  FOCUS_ON_LIGHT;

/** Ringed button on white (row action). */
export const RING_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-paper px-4 text-sm font-semibold text-ink ring-1 ring-line transition-colors hover:bg-canvas motion-reduce:transition-none " +
  FOCUS_ON_LIGHT;

/** White surface with a hairline ring. */
export const SURFACE = "rounded-2xl bg-paper ring-1 ring-line";
