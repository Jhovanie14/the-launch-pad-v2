import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailX, TriangleAlert } from "lucide-react";
import { verifyUnsubscribeToken } from "@/lib/marketing/unsubscribeToken";
import { maskEmail } from "@/lib/marketing/unsubscribeLink";
import { unsubscribeAction } from "./actions";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ t?: string; done?: string; error?: string }> };

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/*
  Where the unsubscribe link in automatic marketing emails lands. Opening the
  page changes nothing (mail scanners open links); the button does.
*/
export default async function UnsubscribePage({ searchParams }: Props) {
  const { t, done, error } = await searchParams;
  const secret = process.env.MARKETING_UNSUBSCRIBE_SECRET;
  const email = secret ? verifyUnsubscribeToken(t, secret) : null;

  return (
    <main className="flex flex-1 items-start justify-center bg-canvas px-4 py-16 sm:py-24">
      <section className="w-full max-w-md rounded-2xl bg-paper p-6 text-ink ring-1 ring-line sm:p-8">
        {!email ? (
          <>
            <TriangleAlert aria-hidden className="size-9 text-ink-muted" />
            <h1 className="mt-4 text-2xl font-black tracking-tight">This link doesn&apos;t work</h1>
            <p className="mt-2 text-ink-muted">
              It may have been cut off when it was copied. Use the unsubscribe link at the bottom of the email
              again, or turn off news and offers in your account settings.
            </p>
            <Actions />
          </>
        ) : done ? (
          <>
            <CheckCircle2 aria-hidden className="size-9 text-brand-blue" />
            <h1 className="mt-4 text-2xl font-black tracking-tight">You&apos;re unsubscribed</h1>
            <p className="mt-2 text-ink-muted">
              <span className="font-semibold text-ink">{maskEmail(email)}</span>{" "}
              won&apos;t get news and offers from us anymore. You&apos;ll still get booking confirmations, receipts and messages about your
              membership.
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              Changed your mind? You can turn news and offers back on in your{" "}
              <Link href="/dashboard/settings" className={`font-semibold text-brand-blue underline ${FOCUS}`}>
                account settings
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <MailX aria-hidden className="size-9 text-ink-muted" />
            <h1 className="mt-4 text-2xl font-black tracking-tight">Unsubscribe from news and offers?</h1>
            <p className="mt-2 text-ink-muted">
              We&apos;ll stop sending offers and news to{" "}
              <span className="font-semibold text-ink">{maskEmail(email)}</span>. Booking confirmations and
              receipts still arrive.
            </p>
            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-canvas p-3 text-sm text-ink ring-1 ring-line">
                Something went wrong on our side. Please try again, or call{" "}
                <a href="tel:+18322198320" className="font-semibold underline">
                  (832) 219-8320
                </a>
                .
              </p>
            )}
            <form action={unsubscribeAction} className="mt-6">
              <input type="hidden" name="t" value={t} />
              <button
                type="submit"
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-night px-5 text-base font-bold text-on-night hover:bg-night-raised ${FOCUS}`}
              >
                Unsubscribe
              </button>
            </form>
            <Link
              href="/"
              className={`mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-semibold text-ink-muted hover:text-ink ${FOCUS}`}
            >
              Keep getting offers
            </Link>
          </>
        )}
      </section>
    </main>
  );
}

function Actions() {
  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Link
        href="/dashboard/settings"
        className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-night px-4 text-sm font-bold text-on-night hover:bg-night-raised ${FOCUS}`}
      >
        Account settings
      </Link>
      <Link
        href="/contact"
        className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold text-ink ring-1 ring-line hover:bg-canvas ${FOCUS}`}
      >
        Contact us
      </Link>
    </div>
  );
}
