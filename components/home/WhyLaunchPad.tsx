import Image from "next/image";
import { HOME_REASONS } from "@/lib/marketing/homePage";

/** "Why The Launch Pad?": the story and four facts, on Canvas. */
export function WhyLaunchPad() {
  return (
    <section aria-labelledby="why-title" className="bg-canvas py-16 text-ink md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 sm:px-8 md:grid-cols-2 md:gap-14">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
          <Image
            src="/carwash.jpg"
            alt="A car being washed at The Launch Pad in Houston"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div>
          <h2 id="why-title" className="text-4xl font-black leading-[1.05] tracking-[-0.025em] text-balance md:text-5xl">
            Why The Launch Pad?
          </h2>
          <div className="mt-5 space-y-4 leading-relaxed text-ink-muted">
            <p>
              Founded in 2024, The Launch Pad brings every kind of car care under one roof. Wash it yourself, get it
              professionally detailed, or grab a quick handwash, all in one stop.
            </p>
            <p>Plus, while you wait, enjoy Houston&apos;s finest food trucks.</p>
          </div>
          <dl className="mt-8 grid gap-x-8 sm:grid-cols-2">
            {HOME_REASONS.map((reason) => (
              <div key={reason.title} className="border-t border-line py-4">
                <dt className="font-bold">{reason.title}</dt>
                <dd className="mt-0.5 text-sm text-ink-muted">{reason.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
