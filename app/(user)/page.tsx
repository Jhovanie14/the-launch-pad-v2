"use client";

import Customers from "@/components/user/customers";
import { Footer } from "@/components/user/footer";
import { Hero } from "@/components/user/hero";
import { UserNavbar } from "@/components/user/navbar";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Star, Check, Award, Clock, DollarSign, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
          <Card className="p-6">
            <CardHeader className="border rounded-lg">
              <img
                src="/thelaunchpad.png"
                alt=""
                className="w-full h-40 object-contain"
              />
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl text-accent-foreground mb-4">
                Self-Service Car Wash
              </h3>
              <p className="text-sm mb-8 text-muted-foreground">
                Easy-to-use self-service car wash bays for those who prefer a
                hands-on clean! Wash your car your way with professional-grade
                equipment, including high-pressure hoses, foam brushes, and
                powerful vacuums — all available at your convenience.
              </p>
              <div className="space-y-3">
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Professional-grade equipment
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  High-pressure hoses & foam brushes
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Powerful vacuum stations
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Perfect for DIY car lovers!
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Link
                href="/"
                className="texl-base font-light text-blue-400 underline"
              >
                See Details
              </Link>
            </CardFooter>
          </Card>
          <Card className="p-6">
            <CardHeader className="border rounded-lg">
              <img
                src="/thelaunchpad.png"
                alt=""
                className="w-full h-40 object-contain"
              />
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl text-accent-foreground mb-4 text-nowrap">
                Professional Car Detailing
              </h3>
              <p className="text-sm mb-8 text-muted-foreground">
                Give your vehicle the ultimate refresh with our professional car
                detailing services! We go beyond a basic wash — our detailing
                packages include deep interior cleaning, premium waxing, and
                polishing to bring back your car's showroom shine.
              </p>
              <div className="space-y-3">
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Professional-grade equipment
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  High-pressure hoses & foam brushes
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Powerful vacuum stations
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Perfect for DIY car lovers!
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Link
                href="/"
                className="texl-base font-light text-blue-400 underline"
              >
                See Details
              </Link>
            </CardFooter>
          </Card>
          <Card className="p-6">
            <CardHeader className="border rounded-lg">
              <img
                src="/thelaunchpad.png"
                alt=""
                className="w-full h-40 object-contain"
              />
            </CardHeader>
            <CardContent>
              <h3 className="text-2xl text-accent-foreground mb-4">
                Self-Service Car Wash
              </h3>
              <p className="text-sm mb-8 text-muted-foreground">
                Easy-to-use self-service car wash bays for those who prefer a
                hands-on clean! Wash your car your way with professional-grade
                equipment, including high-pressure hoses, foam brushes, and
                powerful vacuums — all available at your convenience.
              </p>
              <div className="space-y-3">
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Professional-grade equipment
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  High-pressure hoses & foam brushes
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Powerful vacuum stations
                </span>
                <span className="flex text-sm gap-2">
                  <Check className="w-4 h-4 text-muted-foreground" />
                  Perfect for DIY car lovers!
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Link
                href="/"
                className="texl-base font-light text-blue-400 underline"
              >
                See Details
              </Link>
            </CardFooter>
          </Card>
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
              Founded in 2018, The Launch Pad revolutionized the car care
              experience by combining multiple services under one roof. Whether
              you want to wash your car yourself, get professional detailing, or
              grab a quick $15 handwash, we've got you covered.
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
                      <span className="text-sm">$15 handwash special</span>
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
                        Food & Community
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
