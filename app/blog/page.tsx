import { Footer } from "@/components/user/footer";
import { UserNavbar } from "@/components/user/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowRight, Calendar, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Blog() {
  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <div className="py-20">
        <div className="container mx-auto px-4 ">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-center text-4xl md:text-6xl font-semibold text-blue-900 mb-16">
              Latest Article
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-0 rounded-md">
                <Image
                  src="/carwash.jpg"
                  alt=""
                  width={500}
                  height={50}
                  className="w-full rounded-md object-contain"
                />
                <CardContent className="py-3 ">
                  <div className="space-y-3 pb-4">
                    <h3 className="text-2xl font-medium text-foreground">
                      Why ceramic coating is worth the investment
                    </h3>
                    <p className="text-muted-foreground">
                      Discover how ceramic coating provides long-term protection
                      and keeps your vehicle looking its best for years to come
                    </p>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        April 15, 2025
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        James Wilson
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/"
                    className="flex items-center space-x-2 mb-3 text-red-600 hover:text-red-700 "
                  >
                    <span className="text-lg">Read More</span>
                    <ArrowRight />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
