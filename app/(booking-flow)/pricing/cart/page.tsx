import { Suspense } from "react";
import type { Metadata } from "next";
import { GuestCart } from "./GuestCart";

// A checkout step, not a landing page: keep it out of search results.
export const metadata: Metadata = {
  title: "Join a membership",
  robots: { index: false, follow: false },
};

export default function PricingCartPage() {
  return (
    <Suspense fallback={null}>
      <GuestCart />
    </Suspense>
  );
}
