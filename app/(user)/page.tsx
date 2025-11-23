"use client";

import Customers from "@/components/user/customers";
import { Hero } from "@/components/user/hero";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Star, Check, Award, Clock, DollarSign, Users } from "lucide-react";
import Image from "next/image";
// import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import ServiceModal from "@/components/user/service-modal";

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
      "Give your vehicle the ultimate refresh with our professional detailing services. We go beyond a basic wash — deep interior cleaning, premium waxing, and polishing to bring back your car's showroom shine.",
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
      "Give your vehicle the ultimate refresh with our professional detailing services. We go beyond a basic wash — deep interior cleaning, premium waxing, and polishing to bring back your car's showroom shine. Our expert team uses only the finest products and techniques to ensure your vehicle looks and feels brand new.",
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
    <main className="flex-1 container mx-auto py-8 px-3">
      <Hero />
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        {/* Service, One Location */}
        <div className=" py-16 md:py-20">
          <div className="max-w-4xl mb-16">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-blue-900 mb-8">
              Three Amazing Services, One Location
            </h1>
            <p className="max-w-2xl text-xl text-accent-foreground leading-relaxed">
              From DIY car washing to professional detailing and a unique
              community, The Launch Pad is your complete automotive care center.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {services.map((service) => (
              <Card key={service.id} className="p-6">
                <CardHeader className="p-0">
                  <div className="relative w-full h-64 rounded-xl overflow-hidden">
                    <Image
                      src={service.image || ""}
                      alt={service.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <h3 className="text-[28px] font-semibold text-accent-foreground mb-4">
                    {service.title}
                  </h3>

                  <p className="text-[15px] mb-8 text-accent-foreground">
                    {service.description}
                  </p>
                  <div className="space-y-3">
                    {service.features.map((feature, i) => (
                      <span key={i} className="flex text-sm gap-2">
                        <Check className="w-4 h-4 text-muted-foreground" />
                        {feature}
                      </span>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => setSelectedService(service)}
                    className="texl-base font-light text-blue-400 underline hover:text-blue-600 bg-white hover:bg-white"
                  >
                    See Details
                  </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Block */}
            <div className="relative">
              <Image
                src="/carwash.jpg"
                alt="Carwash"
                width={400}
                height={400}
                className="w-full h-full object-contain rounded-md"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <Card className="absolute -bottom-6 md:bottom-6 -right-3 md:-right-6 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl p-4 soft-shadow">
                <div className="flex items-center gap-2">
                  <Star />
                  <div>
                    <span className="block font-bold"> 4.9/5</span>
                    <span className="text-sm"> From 500+ Reviews</span>
                  </div>
                </div>
              </Card>
            </div>
            {/* Right Block */}
            <div className="space-y-4 p-3">
              <h1 className="text-center font-semibold text-3xl">
                Why Choose The Launch Pad?
              </h1>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <Award className="w-8 h-8 bg-blue-100 text-blue-400 p-1 rounded-md" />
                      <div>
                        <span className="block font-medium text-foreground">
                          Professional Equipment
                        </span>
                        <span className="text-sm">
                          Top-tier self-service bays
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <Clock className="w-8 h-8 bg-red-100 text-red-400 p-1 rounded-md" />
                      <div>
                        <span className="block font-medium text-foreground">
                          Convenient Hours
                        </span>
                        <span className="text-sm">
                          Open 24/7 for self service bay
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-8 h-8 bg-yellow-100 text-yellow-400 p-1 rounded-md" />
                      <div>
                        <span className="block font-medium text-foreground">
                          Great Value
                        </span>
                        <span className="text-sm">Best price in town</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <div className="flex items-center space-x-3">
                      <Users className="w-8 h-8 bg-green-100 text-green-400 p-1 rounded-md" />
                      <div>
                        <span className="block font-medium text-foreground">
                          {/* customer  */}
                          Satisfaction guarantee
                        </span>
                        <span className="text-sm">
                          where we guarantee your shine
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
        {/* Customers say */}
        <Customers />
      </div>
    </main>
  );
}
