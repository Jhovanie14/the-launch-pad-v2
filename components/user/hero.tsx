"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { Wrench, Star, ForkKnife } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
const cardContent = [
  {
    image: Wrench,
    title: "Self-Service Bays",
    description: "DIY car wash your way",
    color: "text-blue-800",
  },
  {
    image: Star,
    title: "$15 Handwash",
    description: "Mon-Thu special",
    color: "text-yellow-700",
  },
  {
    image: ForkKnife,
    title: "Food Trucks",
    description: "Eat while you wait",
    color: "text-red-700",
  },
];

export function Hero() {
  return (
    <section className="py-16 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Left: copy */}
        <div className="space-y-6 p-6 order-2 md:order-1">
          <div className="text-center md:inline-flex gap-2 ">
            <Badge
              variant="outline"
              className="px-3 py-2 text-base bg-blue-50 rounded-xl"
            >
              <span className="text-sm text-muted-foreground">
                🚀 Houston's Premier Car Care & Food Hub
              </span>
            </Badge>
          </div>

          <h1 className="text-center md:text-start text-4xl md:text-6xl text-blue-900 font-semibold leading-tight ">
            Car Care Done Right. Finally.
          </h1>
          <p className="text-center md:text-start text-base md:text-lg text-muted-foreground">
            Self-service car wash bays, professional detailing, and Houston's
            best food trucks all in one convenient location. Plus our famous $15
            handwash special!
          </p>

          <div className="flex flex-col md:flex-row items-stretch gap-3">
            <Link
              href="#"
              className="inline-flex justify-center items-center rounded-md bg-red-600 text-white px-5 py-3 hover:bg-red-700"
            >
              See my price
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex justify-center items-center rounded-md bg-gray-200 px-5 py-3 text-foreground hover:bg-gray-300"
            >
              How it works
            </Link>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {cardContent.map((content, id) => (
              <Card key={id} className="border-blue-200">
                <CardHeader>
                  <content.image className={content.color} />
                </CardHeader>
                <CardContent>
                  <h3 className="font-medium text-accent-foreground">
                    {content.title}
                  </h3>
                  <span className="text-xs ">{content.description}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Image
              src="/thelaunchpad.png"
              alt="review avatars"
              width={450}
              height={450}
              className="h-6 w-auto"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="17"
                  viewBox="0 0 18 17"
                  fill="none"
                >
                  <path
                    d="M8.40632 0.82955C8.59343 0.253686 9.40813 0.253686 9.59524 0.82955L11.1058 5.47847C11.1894 5.73601 11.4294 5.91037 11.7002 5.91037H16.5884C17.1939 5.91037 17.4456 6.68519 16.9558 7.04109L13.0012 9.91429C12.7821 10.0735 12.6904 10.3556 12.7741 10.6131L14.2846 15.262C14.4717 15.8379 13.8126 16.3168 13.3228 15.9609L9.36818 13.0877C9.1491 12.9285 8.85246 12.9285 8.63339 13.0877L4.67878 15.9609C4.18892 16.3168 3.52982 15.8379 3.71693 15.262L5.22745 10.6131C5.31113 10.3556 5.21946 10.0735 5.00039 9.91429L1.04578 7.04109C0.555922 6.68519 0.807676 5.91037 1.41318 5.91037H6.30134C6.57213 5.91037 6.81212 5.73601 6.8958 5.47847L8.40632 0.82955Z"
                    fill="#F29A05"
                  />
                </svg>
                <span>4.9</span>
              </div>
              <span>from 12,423 reviews •</span>
              <Link href="/reviews" className="underline text-blue-500">
                See our reviews
              </Link>
            </div>
          </div>
        </div>

        {/* Right: image */}
        <div className="order-1 md:order-2 flex items-center justify-center">
          <div className="relative w-full max-w-xl aspect-[842/652]">
            <Image
              src="/thelaunchpad.png"
              alt="A Panda Hub detailer standing in front of a freshly detailed black SUV"
              height={450}
              width={450}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
