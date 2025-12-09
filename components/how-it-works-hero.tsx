import { Droplets } from "lucide-react";

export function HowItWorksHero() {
  return (
    <section className="text-blue-900">
      <div className="container mx-auto max-w-6xl text-center">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-white/10 p-4 rounded-full">
            <Droplets className="w-12 h-12" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-balance">
            How It Works
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto text-pretty leading-relaxed">
          Experience the easiest, most convenient car wash service. From booking
          to sparkling clean, we've streamlined every step.
        </p>
      </div>
    </section>
  );
}
