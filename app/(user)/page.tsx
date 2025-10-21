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
import Link from "next/link";
import { Button } from "@/components/ui/button";

const services = [
  {
    id: 1,
    title: "Self-Service Car Wash",
    description:
      "Easy-to-use self-service car wash bays for those who prefer a hands-on clean. Wash your car your way with professional-grade equipment, including high-pressure hoses, foam brushes, and powerful vacuums — all available at your convenience.",
    features: [
      "Professional-grade equipment",
      "High-pressure hoses & foam brushes",
      "Powerful vacuum stations",
      "Perfect for DIY car lovers",
    ],
    image: "/thelaunchpad.png",
  },
  {
    id: 2,
    title: "Professional Express Car Detailing",
    description:
      "Give your vehicle the ultimate refresh with our professional detailing services. We go beyond a basic wash — deep interior cleaning, premium waxing, and polishing to bring back your car's showroom shine.",
    features: [
      "Premium cleaning products",
      "Interior & exterior detailing",
      "Waxing and polishing",
      "Professional-grade finish",
    ],
    image: "/thelaunchpad.png",
  },
  {
    id: 3,
    title: "Express Detailing Subscription",
    description:
      "Experience ultimate control over your vehicle's shine with our Express Detailing Subscription. Designed for those who take pride in a hands-on clean, our self-service bays feature top-tier tools and technology to deliver a professional finish anytime.",
    features: [
      "Commercial-grade equipment",
      "High-pressure hoses & foam brushes",
      "Powerful vacuum & interior care stations",
      "Tailored for enthusiasts",
    ],
    image: "/thelaunchpad.png",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <Hero />
      {/* Service, One Location */}
      <div className=" py-16 md:py-20">
        <div className="max-w-4xl mb-16">
          <h1 className="text-3xl md:text-5xl font-semibold leading-tight text-blue-900 mb-8">
            Three Amazing Services, One Location
          </h1>
          <p className="max-w-2xl text-xl text-muted-foreground leading-relaxed">
            From DIY car washing to professional detailing and delicious food
            trucks, The Launch Pad is your complete automotive and dining
            destination.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {services.map((service) => (
            <Card key={service.id} className="p-6">
              <CardHeader className="border rounded-lg">
                <img
                  src="/thelaunchpad.png"
                  alt=""
                  className="w-full h-40 object-contain"
                />
              </CardHeader>
              <CardContent className="flex-1">
                <h3 className="text-2xl text-accent-foreground mb-4">
                  {service.title}
                </h3>
                <p className="text-sm mb-8 text-muted-foreground">
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
                <Button className="texl-base font-light text-blue-400 underline hover:text-blue-600 bg-white hover:bg-white">
                  See Details
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Block */}
          <div className="relative">
            <Image
              src="/carwash.jpg"
              alt="Carwash"
              width={400}
              height={400}
              className="w-full h-full object-contain rounded-md"
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
            <h1 className="text-center font-medium text-2xl">
              Why Choose The Launch Pad?
            </h1>
            <p>
              Founded in 2024, The Launch Pad revolutionized the car care
              experience by combining multiple services under one roof. Whether
              you want to wash your car yourself, get professional detailing, or
              grab a quick handwash, we've got you covered.
            </p>
            <p>
              Plus, while you wait, enjoy Houston's finest food trucks! It's the
              perfect way to turn car maintenance into an enjoyable experience.
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
                      <span className="text-sm">Open when you need us</span>
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
                      <span className="text-sm">Where car lovers gather</span>
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
    </>
  );
}
