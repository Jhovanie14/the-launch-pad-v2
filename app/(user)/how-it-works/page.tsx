"use client";

import { HowItWorksHero } from "@/components/how-it-works-hero";
import { ProcessSteps } from "@/components/process-steps";
import { VideoSection } from "@/components/video-section";
// import { CTASection } from "@/components/cta-section";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useBooking } from "@/context/bookingContext";

export default function HowItWorksPage() {
  const { openBookingModal } = useBooking();
  return (
    <main className="min-h-screen">
      <HowItWorksHero />
      <ProcessSteps />
      <VideoSection />
      <section className="py-20 px-4 bg-background">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-balance">
            Ready for a Spotless Car?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 text-pretty leading-relaxed max-w-2xl mx-auto">
            Join thousands of satisfied customers who trust us with their
            vehicles. Book your first wash today and experience the difference.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={openBookingModal}
              className="inline-flex justify-center items-center rounded-xl bg-blue-900 text-white px-5 py-6 hover:bg-blue-800"
            >
              Schedule Service
            </Button>
            <Link
              href="/services"
              className="inline-flex justify-center items-center rounded-xl bg-gray-200 px-5 py-3 text-foreground hover:bg-gray-300 dark:text-black"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
