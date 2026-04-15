"use client";
import Link from "next/link";
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
    accent: "from-sky-400 to-cyan-500",
    glow: "shadow-sky-500/30",
    ring: "ring-sky-400/40",
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
    accent: "from-amber-400 to-orange-500",
    glow: "shadow-amber-500/40",
    ring: "ring-amber-400/50",
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
    accent: "from-violet-400 to-purple-500",
    glow: "shadow-violet-500/30",
    ring: "ring-violet-400/40",
  },
];

export function Hero() {
  const { openBookingModal } = useBooking();

  return (
    <section
      className="relative min-h-screen overflow-hidden rounded-2xl"
      aria-label="The Launch Pad — Houston car wash and detailing"
    >
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url(/self-service.png)" }}
      />
      {/* Dark overlay — stronger at top, lighter at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/70 to-slate-950/80" />

      {/* Ambient colour orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-[500px] w-[500px] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-sky-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto max-w-6xl px-4 py-24 md:py-32">

        {/* ── Eyebrow pill ── */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Houston's Premier Car Care
          </span>
        </div>

        {/* ── Headline ── */}
        <div className="text-center space-y-5 mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight">
            Your Car Deserves{" "}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              Better.
            </span>
          </h1>

          <p className="text-base md:text-xl text-white/70 max-w-xl mx-auto leading-relaxed">
            24/7 self-service bays or a full professional detail — we have
            everything your car needs at{" "}
            <span className="text-white font-medium">10410 S Main St, Houston.</span>
          </p>
        </div>

        {/* ── Primary CTAs ── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <Button
            size="lg"
            onClick={openBookingModal}
            className="h-12 px-8 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-base shadow-lg shadow-amber-500/30 transition-all hover:scale-[1.03]"
          >
            Book Online
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
          <Link href="/self-service">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 font-semibold text-base backdrop-blur-sm"
            >
              Self-Service Bays
            </Button>
          </Link>
        </div>

        {/* ── Quick trust badges ── */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-20 text-white/50 text-xs">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Open 24 / 7
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> 10410 S Main St
          </span>
          <span className="w-px h-3 bg-white/20" />
          <span className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
            ))}
            <span className="ml-0.5">4.4 · 31+ reviews</span>
          </span>
        </div>

        {/* ── Service cards ── */}
        <div className="mb-10">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-white/40 mb-8">
            Choose your experience
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`group relative flex flex-col rounded-2xl border bg-white/5 backdrop-blur-md p-6 ring-1 ${card.ring} border-white/10 transition-all duration-300 hover:bg-white/10 hover:-translate-y-1 hover:shadow-xl ${card.glow} ${
                    card.featured ? "md:-translate-y-2 shadow-2xl " + card.glow : ""
                  }`}
                >
                  {/* Featured ribbon */}
                  {card.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${card.accent} px-3 py-0.5 text-[11px] font-bold text-slate-900 shadow`}>
                        ★ {card.eyebrow}
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className={`mb-4 inline-flex w-fit rounded-xl bg-gradient-to-br ${card.accent} p-3 shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Eyebrow (non-featured) */}
                  {!card.featured && (
                    <span className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/40">
                      {card.eyebrow}
                    </span>
                  )}

                  <h3 className="text-xl font-bold text-white mb-2">{card.label}</h3>
                  <p className="text-sm text-white/60 leading-relaxed mb-5">{card.desc}</p>

                  {/* Perks */}
                  <ul className="space-y-1.5 mb-6 flex-1">
                    {card.perks.map((p) => (
                      <li key={p} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span className="text-sm text-white/70">{p}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Price */}
                  <div className="border-t border-white/10 pt-4 mb-4">
                    <span className="text-2xl font-black text-white">{card.price}</span>
                    <span className="ml-1.5 text-xs text-white/40">{card.priceSub}</span>
                  </div>

                  {/* CTA row */}
                  <div className={`inline-flex items-center gap-1.5 text-sm font-semibold bg-gradient-to-r ${card.accent} bg-clip-text text-transparent group-hover:gap-2.5 transition-all`}>
                    {card.cta}
                    <ArrowRight className={`w-4 h-4 bg-gradient-to-r ${card.accent} rounded-full text-white p-0.5`} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
