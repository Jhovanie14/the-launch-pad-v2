"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 2000;
const TRIES = 10; // about 20 seconds

/**
 * Shown while Stripe's webhook hasn't marked the card order paid yet. Re-reads
 * the server page every two seconds; once it's paid, the page renders the pass
 * instead of this.
 */
export default function ConfirmingPayment() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  const slow = tries >= TRIES;

  useEffect(() => {
    if (slow) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, EVERY_MS);
    return () => clearTimeout(t);
  }, [tries, slow, router]);

  return (
    <div aria-live="polite" className="rounded-2xl bg-paper p-6 ring-1 ring-line">
      <p className="text-lg font-bold text-ink">
        {slow ? "Payment is taking longer than usual" : "Confirming your payment…"}
      </p>
      <p className="mt-1 text-ink-muted">
        {slow
          ? "We'll email you when it's confirmed. You can also check your orders later."
          : "This usually takes a few seconds."}
      </p>
    </div>
  );
}
