"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Star, Bubbles, SprayCan, Stars } from "lucide-react";

const features = [
  {
    icon: Bubbles,
    title: "Self-Service Bays",
    description: "Premium DIY car wash experience",
  },
  {
    icon: SprayCan,
    title: "Express Detail",
    description: "Professional detailing services",
  },
  {
    icon: Stars,
    title: "Premium Care",
    description: "Expert auto care solutions",
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
                className="px-4 py-2 bg-blue-500/10 border-blue-500 text-blue-100 hover:bg-blue-500/20"
              >
                <span className="text-sm font-medium text-[#ffffff]">
                  🚀 Houston's Premier Car Care
                </span>
              </Badge>
            </div>

            {/* Main Heading */}
            <div className="text-center mb-8 space-y-6">
              <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-white via-amber-100 to-amber-200 bg-clip-text text-transparent">
                  Elevate Your
                </span>
                <br />
                <span>Car Care Experience</span>
              </h1>

              <p className="text-xl md:text-2xl text-white font-semibold max-w-2xl mx-auto leading-relaxed">
                Premium self-service bays and professional detailing services
                designed for those who demand excellence.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/services"
                className="group inline-flex items-center gap-2 px-8 py-3 bg-blue-900 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-300 hover:gap-3"
              >
                Explore Services
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/how-it-works"
                className="inline-flex items-center gap-2 px-8 py-3 border border-amber-500 hover:border-white text-amber-400 font-medium rounded-lg transition-colors duration-300 hover:bg-amber-500/50 hover:text-white"
              >
                Learn More
              </Link>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
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
            </div>

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
              <Link href="/reviews" className="underline font-medium text-amber-400">
                See our reviews
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
