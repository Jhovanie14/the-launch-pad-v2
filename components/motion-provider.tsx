"use client";

import { MotionConfig } from "motion/react";

/**
 * `reducedMotion="user"` makes every motion component in the app respect the
 * visitor's OS-level "reduce motion" setting — including ones that never opted
 * in themselves. Transform and layout animations are dropped; opacity is kept,
 * so content still appears rather than vanishing.
 *
 * This lives in one place on purpose: per-component useReducedMotion checks
 * only cover the components someone remembered to update.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
