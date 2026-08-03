"use client";

import Customers from "@/components/user/customers";
import { Hero } from "@/components/user/hero";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Star,
  Check,
  Award,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import ServiceModal from "@/components/user/service-modal";

const reasons = [
  {
    icon: Award,
    title: "Professional equipment",
    detail: "Top-tier self-service bays",
  },
  {
    icon: Clock,
    title: "Convenient hours",
    detail: "Open 24/7 for self-service bays",
  },
  {
    icon: DollarSign,
    title: "Great value",
    detail: "Best price in town",
  },
  {
    icon: Users,
    title: "Satisfaction guarantee",
    detail: "Where we guarantee your shine",
  },
];

const services = [
  {
    id: 1,
    title: "Self-Service Car Wash",
    description:
      "Easy-to-use self-service car wash bays for those who prefer a hands-on clean. Wash your car your way with professional-grade equipment, including high-pressure hoses, and powerful vacuums — all available at your convenience.",
    image: "/self-service.png",
    images: [
      "/self-service.png",
      "/self-service-wash-1.jpg",
      "/self-service-wash-2.jpg",
    ],
    alt: "Self-Service-Car-Wash",
    features: [
      "Professional-grade equipment",
      "High-pressure hoses",
      "Powerful vacuum stations",
      "Perfect for DIY car lovers",
    ],
    fullDescription:
      "Easy-to-use self-service car wash bays for those who prefer a hands-on clean. Wash your car your way with professional-grade equipment, including high-pressure hoses, and powerful vacuums — all available at your convenience. Our self-service bays are designed for maximum convenience and efficiency, allowing you to maintain your vehicle on your own schedule.",
    details: [
      "Professional-grade equipment and tools",
      "High-pressure hoses for deep cleaning",
      // "Foam brushes for gentle yet effective washing",
      "Powerful vacuum stations for interior cleaning",
      "Available 24/7 for your convenience",
      "Affordable pricing with flexible payment options which includes tap to pay or dollar coins",
      "Well-maintained facilities and equipment",
      "Perfect for DIY car enthusiasts",
    ],
  },
  {
    id: 2,
    title: "Professional Express Car Detailing",
    description:
      "Give your vehicle the ultimate refresh with our professional detailing services. We go beyond a express wash — deep interior cleaning, premium waxing, and polishing to bring back your car's showroom shine.",
    image: "/professional-express-car-detailing.png",
    images: [
      "/professional-express-car-detailing.png",
      "/professional-express-car-detailing-1.png",
      "/professional-express-car-detailing-2.png",
    ],
    alt: "Professional-Express-Car-Detailing",
    features: [
      "Premium cleaning products",
      "Interior & exterior detailing",
      "Waxing and polishing",
      "Professional-grade finish",
    ],
    fullDescription:
      "Give your vehicle the ultimate refresh with our professional detailing services. We go beyond a express wash — deep interior cleaning, premium waxing, and polishing to bring back your car's showroom shine. Our expert team uses only the finest products and techniques to ensure your vehicle looks and feels brand new.",
    details: [
      "Comprehensive exterior detailing and polishing",
      "Deep interior cleaning and vacuuming",
      "Premium wax application for protection",
      "Professional-grade finishing products",
      "Window and trim detailing",
      "Quick turnaround time with express service",
    ],
  },
  {
    id: 3,
    title: "Express Detailing Subscription",
    description:
      "Experience ultimate control over your vehicle's shine with our Express Detailing Subscription. Designed for drivers who want their car looking sharp all the time. Our team uses top-tier tools and technology to keep your vehicle clean, protected, and ready to roll—without you lifting a finger.",
    image: "/express-detailing-subscription.png",
    images: [
      "/express-detailing-subscription.png",
      "/express-detailing-subscription-1.jpg",
    ],
    alt: "Express-Detailing-Subscription",
    features: [
      "Commercial-grade equipment",
      "High-pressure hoses",
      "Powerful vacuum & interior care stations",
      "Tailored for enthusiasts",
    ],
    fullDescription:
      "Experience ultimate control over your vehicle's shine with our Express Detailing Subscription. Designed for those who take pride in a hands-on clean, our self-service bays feature top-tier tools and technology to deliver a professional finish anytime. Enjoy unlimited access to our premium facilities with exclusive member benefits and priority scheduling.",
    details: [
      "Unlimited access to all self-service bays",
      "Commercial-grade equipment and tools",
      "Premium cleaning products included",
      "Priority scheduling and reservations",
      "Exclusive member discounts",
      "Monthly subscription with flexible plans",
      "No hidden fees or additional charges",
      "Cancel anytime with no penalties",
    ],
  },
];

export default function Home() {
  const [selectedService, setSelectedService] = useState<
    (typeof services)[0] | null
  >(null);
  return (
    <main className="flex-1">
      {/* Full-bleed: the hero owns the whole viewport width so the photograph
          reads as a scene, not as an inset panel. */}
      <Hero />
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Service, One Location */}
        <div className="py-16 md:py-24">
          <div className="max-w-4xl mb-14">
            <h2 className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight text-blue-900 mb-6">
              Three Amazing Services, One Location
            </h2>
            <p className="max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
              From DIY car washing to professional detailing and a unique
              community, The Launch Pad is your complete automotive care center.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            {services.map((service) => (
              <Card
                key={service.id}
                className="group flex flex-col overflow-hidden p-0 gap-0 transition-shadow duration-300 hover:shadow-lg hover:shadow-black/5"
              >
                <CardHeader className="p-0">
                  <div className="relative w-full h-56 overflow-hidden">
                    <Image
                      src={service.image || ""}
                      alt={service.alt}
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-6">
                  <h3 className="text-xl font-semibold tracking-tight mb-3">
                    {service.title}
                  </h3>

                  <p className="text-sm leading-relaxed text-muted-foreground mb-6">
                    {service.description}
                  </p>
                  <ul className="space-y-2.5">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className="mt-0.5 w-3.5 h-3.5 shrink-0 text-blue-700"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="px-6 pb-6 pt-0">
                  <button
                    type="button"
                    onClick={() => setSelectedService(service)}
                    className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-blue-700 underline-offset-4 transition-colors hover:text-blue-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
                  >
                    See details
                    <ArrowRight
                      className="w-3.5 h-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                    <span className="sr-only"> about {service.title}</span>
                  </button>
                </CardFooter>
              </Card>
            ))}
          </div>
          {selectedService && (
            <ServiceModal
              service={selectedService}
              onClose={() => setSelectedService(null)}
            />
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center">
            {/* Left Block */}
            <div className="relative">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl">
                <Image
                  src="/carwash.jpg"
                  alt="A car being washed at The Launch Pad in Houston"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="absolute -bottom-5 right-4 md:right-6 flex items-center gap-3 rounded-xl bg-blue-900 px-5 py-3.5 text-white shadow-lg shadow-blue-900/25">
                <Star
                  className="w-5 h-5 fill-amber-400 text-amber-400"
                  aria-hidden="true"
                />
                <div className="leading-tight">
                  <span className="block text-lg font-bold tracking-tight">
                    4.9/5
                  </span>
                  <span className="text-xs text-blue-200">
                    From 500+ Reviews
                  </span>
                </div>
              </div>
            </div>
            {/* Right Block */}
            <div className="pt-8 md:pt-0">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-blue-900">
                Why Choose The Launch Pad?
              </h2>
              <div className="mt-5 space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Founded in 2024, The Launch Pad revolutionized the car care
                  experience by combining multiple services under one roof.
                  Whether you want to wash your car yourself, get professional
                  detailing, or grab a quick handwash, we've got you covered.
                </p>
                <p>
                  Plus, while you wait, enjoy Houston's finest food trucks! It's
                  the perfect way to turn car maintenance into an enjoyable
                  experience.
                </p>
              </div>

              {/* Facts, not four more cards — a divided list reads faster and
                  stops the page from becoming a grid of identical boxes. */}
              <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-x-8">
                {reasons.map((reason) => (
                  <div
                    key={reason.title}
                    className="flex items-start gap-3 border-t py-4"
                  >
                    <reason.icon
                      className="mt-0.5 w-4 h-4 shrink-0 text-blue-700"
                      aria-hidden="true"
                    />
                    <div>
                      <dt className="font-medium leading-snug">
                        {reason.title}
                      </dt>
                      <dd className="mt-0.5 text-sm text-muted-foreground">
                        {reason.detail}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>
        {/* Customers say */}
        <Customers />
      </div>
      {/* Breathing room before the footer — the testimonial block was landing
          flush against it with no separation at all. */}
      <div className="h-16 md:h-24" aria-hidden="true" />
    </main>
  );
}
