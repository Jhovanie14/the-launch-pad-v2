import type { Variants } from "motion/react";

/**
 * Shared motion vocabulary.
 *
 * The app had a different hand-rolled `initial`/`animate`/`delay` triple on
 * almost every page, so nothing entered the same way twice. These are the two
 * primitives worth sharing: a container that staggers its children, and the
 * single element entrance those children use.
 *
 * Reduced-motion is NOT handled here — `<MotionConfig reducedMotion="user">` in
 * app/layout.tsx covers every animation in the app from one place, including
 * ones that never import this file.
 */

/** Exponential ease-out: fast to settle, no bounce. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Content settles down out of a soft blur. Pair with `pageStagger`. */
export const pageRise: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: EASE_OUT },
  },
};

/** Container for `pageRise` children. */
export const pageStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.05 },
  },
};

/** Same entrance, tuned for grids where many items land at once. */
export const gridStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};
