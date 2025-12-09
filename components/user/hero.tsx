"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Star,
  Droplets,
  Sparkles,
  Calendar,
  Check,
} from "lucide-react";

// const features = [
//   {
//     icon: Droplets,
//     title: "Self-Service Bays",
//     description: "Premium DIY car wash experience",
//   },
//   {
//     icon: Sparkles,
//     title: "Express Detail",
//     description: "Professional detailing services",
//   },
//   {
//     icon: Calendar,
//     title: "Premium Care",
//     description: "Expert auto care solutions",
//   },
// ];

const customerTypes = [
  {
    icon: Droplets,
    label: "DIY Self-Service Bays",
    whoFor: "For hands-on car owners who prefer to wash their own vehicle",
    whatTheyGet: [
      "24/7 access to premium bays",
      "High-pressure wash system",
      "Spot-free rinse & foam brush",
      "Vacuum stations available",
    ],
    price: "Starting average at $8",
    cta: "See Self-Service Options",
    ctaLink: "/self-service",
    variant: "outline" as const,
    gradient: "from-blue-500/20 to-cyan-500/20",
    borderColor: "border-blue-500/30 hover:border-blue-400/50",
  },
  {
    icon: Sparkles,
    label: "Full Service Express Detail",
    whoFor: "For busy professionals who want expert results without the wait",
    whatTheyGet: [
      "Professional hand wash & wax",
      "Interior vacuum & detail",
      "Tire shine & windows",
      "45-90 minute service",
    ],
    price: "Starting at $25",
    cta: "Book Express Detail",
    ctaLink: "/services",
    variant: "default" as const,
    gradient: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/50 hover:border-amber-400/70",
    featured: true,
  },
  {
    icon: Calendar,
    label: "Monthly Memberships",
    whoFor: "For regular customers who want unlimited washes and premium perks",
    whatTheyGet: [
      "Unlimited express washes",
      "Priority scheduling",
      "15% off all detailing",
      "Exclusive member benefits",
    ],
    price: "Starting at $69.99/mo",
    cta: "Learn More",
    ctaLink: "/pricing",
    variant: "outline" as const,
    gradient: "from-purple-500/20 to-pink-500/20",
    borderColor: "border-purple-500/30 hover:border-purple-400/50",
  },
];

export function Hero() {
  return (
    <section
      className="min-h-screen relative overflow-hidden rounded-xl"
      style={{
        backgroundImage: "url(/self-service.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
      aria-label="Self-service car wash bays at The Launch Pad Houston"
    >
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-slate-700/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-20">
          <div className="max-w-6xl mx-auto">
            {/* Header Badge */}
            <div className="flex justify-center mb-6">
              <Badge
                variant="outline"
                className="px-4 py-2 bg-blue-400 border-white text-blue-100"
              >
                <span className="text-sm font-medium text-[#ffffff]">
                  🚀 Houston's Premier Car Care
                </span>
              </Badge>
            </div>

            {/* Main Heading */}
            <div className="text-center mb-8 space-y-6">
              <h1 className="text-3xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white via-amber-100 to-amber-200 bg-clip-text text-transparent">
                  24/7 Self-Service Car Wash + Professional Detailing in Houston
                </span>
              </h1>

              <p className="text-lg md:text-2xl text-white font-semibold max-w-2xl mx-auto leading-relaxed">
                Wash it yourself in our premium bays or let our team handle a
                full express detail — all at 10410 S Main St.
              </p>
            </div>

            {/* Customer Type Selector - NEW */}
            <div className="mb-16 mt-12">
              <h2 className="text-3xl font-bold text-center text-white mb-8">
                Which Service Is Right for You?
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {customerTypes.map((type, idx) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={idx}
                      className={`relative group p-6 rounded-xl bg-gradient-to-br ${type.gradient} backdrop-blur-sm border-2 ${type.borderColor} transition-all duration-300 hover:scale-[1.02] ${
                        type.featured
                          ? "md:scale-105 shadow-2xl shadow-amber-500/20"
                          : ""
                      }`}
                    >
                      {type.featured && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-amber-500 text-slate-900 font-bold px-4 py-1">
                            Most Popular
                          </Badge>
                        </div>
                      )}

                      {/* Icon & Label */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg bg-white/10 backdrop-blur-sm">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">
                          {type.label}
                        </h3>
                      </div>

                      {/* Who It's For */}
                      <p className="text-sm text-white/90 mb-4 leading-relaxed">
                        {type.whoFor}
                      </p>

                      {/* What They Get */}
                      <div className="space-y-2 mb-6">
                        {type.whatTheyGet.map((item, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-white/80">
                              {item}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Price */}
                      <div className="mb-4 pt-4 border-t border-white/20">
                        <p className="text-2xl font-bold text-white">
                          {type.price}
                        </p>
                      </div>

                      {/* CTA Button */}
                      <Link href={type.ctaLink} className="block">
                        <Button
                          variant={type.variant}
                          className={`w-full ${
                            type.variant === "default"
                              ? "bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold"
                              : "bg-white/10 hover:bg-white/20 text-white border-white/30"
                          }`}
                        >
                          {type.cta}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Features Grid */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {features.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={idx}
                    className="group p-6 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-amber-500/30 transition-all duration-300 hover:bg-slate-800/70"
                  >
                    <div className="mb-4 inline-flex p-3 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                      <Icon className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-white text-sm">{feature.description}</p>
                  </div>
                );
              })}
            </div> */}

            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8 border-t border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 border-2 border-slate-900"
                    />
                  ))}
                </div>
                <span className="text-sm text-slate-300">
                  <span className="font-semibold text-white">500+</span>{" "}
                  satisfied customers
                </span>
              </div>
              <div className="flex items-center gap-2 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-current" />
                ))}

                <span className="text-sm text-slate-300 ml-2">4.9 rating</span>
              </div>
              <Link
                href="/reviews"
                className="underline font-medium text-amber-400"
              >
                See our reviews
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
