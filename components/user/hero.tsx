"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Star,
  Droplets,
  Sparkles,
  Calendar,
  Check,
  MapPin,
  Clock,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useBooking } from "@/context/bookingContext";

const cards = [
  {
    icon: Droplets,
    eyebrow: "DIY",
    label: "Self-Service Bays",
    desc: "Premium bays open around the clock — bring your own touch.",
    perks: [
      "24/7 open access",
      "High-pressure wash system",
      "Spot-free rinse & foam brush",
      "Vacuum stations",
    ],
    price: "~$10",
    priceSub: "avg. spend",
    cta: "View Bays",
    href: "/self-service",
    accent: "text-sky-300",
    rule: "bg-sky-400",
  },
  {
    icon: Sparkles,
    eyebrow: "Most Popular",
    label: "Express Detail",
    desc: "Expert hands, show-room results — done in under an hour.",
    perks: [
      "Hand wash, wax & tire shine",
      "Interior vacuum & detail",
      "Window clean & dashboard",
      "15 – 45 min turnaround",
    ],
    price: "from $25",
    priceSub: "per visit",
    cta: "Book Now",
    href: "/services",
    accent: "text-amber-300",
    rule: "bg-amber-400",
    featured: true,
  },
  {
    icon: Calendar,
    eyebrow: "Best Value",
    label: "Memberships",
    desc: "Unlimited washes, priority booking and exclusive member perks.",
    perks: [
      "Unlimited express washes",
      "Priority scheduling",
      "15% off all detailing",
      "Cancel anytime",
    ],
    price: "$39.99",
    priceSub: "per month",
    cta: "See Plans",
    href: "/pricing",
    accent: "text-violet-300",
    rule: "bg-violet-400",
  },
];

export function Hero() {
  const { openBookingModal } = useBooking();
  const reduceMotion = useReducedMotion();

  // One authored entrance: content settles downward out of a soft blur.
  // Everything starts visible enough to read if motion never runs.
  const rise = {
    hidden: reduceMotion
      ? { opacity: 1, y: 0, filter: "blur(0px)" }
      : { opacity: 0, y: 18, filter: "blur(6px)" },
    show: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.85, ease: [0.16, 1, 0.3, 1] as const },
    },
  };

  const stagger = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduceMotion ? 0 : 0.09, delayChildren: 0.05 },
    },
  };

  return (
    <section
      className="relative isolate min-h-svh w-full overflow-hidden bg-slate-950"
      aria-label="The Launch Pad — Houston car wash and detailing"
    >
      {/* Background photograph — real image element so it is a sized, priority
          LCP candidate with responsive sources rather than a CSS backdrop. */}
      <Image
        src="/self-service.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      {/* Scrim tuned for legibility, not for darkness: lighter across the upper
          half where the sky carries the photograph, deeper behind the cards.
          The section ends on a hard edge — a fade to the page background just
          reads as a murky band once the photo is this dark. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-linear-to-b from-slate-950/70 via-slate-950/65 to-slate-950/90"
      />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-20 pt-24 sm:px-8 md:pb-24 md:pt-32"
      >
        <motion.h1
          variants={rise}
          className="max-w-4xl text-balance text-5xl font-black leading-[0.95] tracking-[-0.035em] text-white sm:text-6xl md:text-7xl lg:text-8xl"
        >
          Your car deserves better.
        </motion.h1>

        <motion.p
          variants={rise}
          className="mt-7 max-w-xl text-pretty text-lg leading-relaxed text-slate-300 md:text-xl"
        >
          24/7 self-service bays or a full professional detail — everything your
          car needs at{" "}
          <span className="font-medium text-white">
            10410 S Main St, Houston.
          </span>
        </motion.p>

        <motion.div
          variants={rise}
          className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
        >
          <Button
            size="lg"
            onClick={openBookingModal}
            className="h-13 bg-amber-400 px-8 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition-colors hover:bg-amber-300"
          >
            Book online
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-13 border-white/25 bg-white/5 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10 hover:text-white"
          >
            <Link href="/self-service">Self-service bays</Link>
          </Button>
        </motion.div>

        {/* Facts about the location, not decoration */}
        <motion.div
          variants={rise}
          className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-slate-300"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4" aria-hidden="true" /> Open 24/7
          </span>
          <span aria-hidden="true" className="h-3.5 w-px bg-white/20" />
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden="true" /> 10410 S Main St
          </span>
          <span aria-hidden="true" className="h-3.5 w-px bg-white/20" />
          <span className="flex items-center gap-2">
            <span className="flex" aria-hidden="true">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                />
              ))}
            </span>
            4.4 · 31+ reviews
          </span>
        </motion.div>

        {/* Service picker */}
        <motion.div variants={rise} className="mt-16 md:mt-20">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">
            Choose your experience
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`group relative flex flex-col rounded-xl border border-white/10 bg-slate-900/80 p-6 transition-[transform,border-color,background-color] duration-300 ease-out hover:-translate-y-1 hover:border-white/25 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                    card.featured ? "border-amber-400/30 bg-slate-900" : ""
                  }`}
                >
                  {/* Top rule carries the card's colour instead of a gradient chip */}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-6 top-0 h-px ${card.rule} opacity-60 transition-opacity duration-300 group-hover:opacity-100`}
                  />

                  <div className="flex items-center justify-between gap-3">
                    <Icon
                      className={`h-5 w-5 ${card.accent}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                        card.featured ? card.accent : "text-slate-500"
                      }`}
                    >
                      {card.eyebrow}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold tracking-tight text-white">
                    {card.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {card.desc}
                  </p>

                  <ul className="mt-5 flex-1 space-y-2">
                    {card.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400"
                          aria-hidden="true"
                        />
                        <span className="text-sm text-slate-300">{p}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                    <div>
                      <span className="text-2xl font-black tracking-tight text-white">
                        {card.price}
                      </span>
                      <span className="ml-1.5 text-xs text-slate-500">
                        {card.priceSub}
                      </span>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-semibold ${card.accent}`}
                    >
                      {card.cta}
                      <ArrowRight
                        className="h-4 w-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
