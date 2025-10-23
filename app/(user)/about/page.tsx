import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Car, Clock, Shield, Sparkles, Star, Truck, Users } from "lucide-react";
import Image from "next/image";

const coreContent: {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  color: string;
}[] = [
  {
    icon: Shield,
    color: "text-blue-900",
    title: "Quality First",
    description:
      "We never compromise on the quality of our services or the products we use.",
  },
  {
    icon: Clock,
    color: "text-red-800",
    title: "Time Efficiency",
    description:
      "We respect your time by providing quick, efficient service without sacrificing quality.",
  },
  {
    icon: Users,
    color: "text-yellow-800",
    title: "Community Focus",
    description:
      "We're proud to support local food vendors and create a community gathering space.",
  },
  {
    icon: Sparkles,
    color: "text-green-800",
    title: "Innovation",
    description:
      "We continuously evolve our services to meet changing customer needs.",
  },
];

const diffContent: {
  icon: React.ComponentType<any>;
  color: string;
  title: string;
  description: string[];
}[] = [
  {
    icon: Car,
    color: "text-blue-900",
    title: "Premium Car Care",
    description: [
      "State-of-the-art washing equipment",
      "Professional-grade cleaning products",
      "Multiple service bays for quick access",
      "Experienced staff for guidance",
    ],
  },
  {
    icon: Truck,
    color: "text-red-800",
    title: "DIY Carwash",
    description: [
      "Rotating selection of local food trucks",
      "Diverse cuisine options daily",
      "Comfortable seating areas",
    ],
  },
];

export default function About() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="py-20">
          <div className="text-center space-y-2 mb-12">
            <h1 className="text-4xl md:text-6xl font-semibold text-blue-900">
              About The Launch Pad
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Where innovation meets convenience, creating a unique destination
              that combines premium car care with Houston's vibrant food
              culture.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            {/* Left content */}
            <div>
              <div className="space-y-8">
                <h3 className="text-xl text-accent-foreground">Our Story</h3>
                <p className="text-muted-foreground">
                  Founded in 2024, The Launch Pad was born from a simple yet
                  powerful idea: car care shouldn’t feel like a chore, it should
                  be an experience. We set out to redefine what a car wash could
                  be by blending premium vehicle care with Houston’s vibrant
                  culinary culture.
                </p>
                <p className="text-muted-foreground">
                  At The Launch Pad, state-of-the-art detailing and wash systems
                  work hand in hand with a customer-focused approach, turning
                  every visit into something more than routine maintenance. It’s
                  a place where quality, convenience, and care come together
                  seamlessly.
                </p>
                <p className="text-muted-foreground">
                  Today, we’re proud to stand as Houston’s first hybrid car care
                  and culinary destination, serving a growing community of
                  customers who value quality, innovation, and enjoyment in
                  every visit.
                </p>
              </div>
            </div>
            {/* Right content */}

            <div className="relative">
              <Image
                src="/carwash.jpg"
                alt="Carwash"
                width={400}
                height={400}
                className="w-full h-full object-contain rounded-md"
              />
              <Card className="absolute -bottom-6 -right-3 md:-right-6 bg-gradient-to-r from-red-600 to-blue-600 text-white rounded-xl p-4 soft-shadow">
                <div className="flex items-center gap-2">
                  <Star />
                  <div>
                    <span className="block font-bold"> 4.9/5</span>
                    <span className="text-sm"> From 500+ Reviews</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
        {/* Core Values */}
        <div className="text-center space-y-8 py-20">
          <h3 className="text-4xl font-semibold text-blue-900">
            Our Core Values
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {coreContent.map((core, id) => (
              <Card key={id} className="border border-blue-200">
                <CardHeader>
                  <core.icon className={`w-8 h-8 ${core.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-start space-y-1">
                    <h4 className="text-lg font-medium text-accent-foreground">
                      {core.title}
                    </h4>
                    <p className="text-muted-foreground">{core.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="text-center space-y-8 py-16">
          <h3 className="text-4xl font-semibold text-blue-900">
            What Makes Us Different
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* Left block */}
            {diffContent.map((diff, id) => (
              <Card key={id} className="border border-blue-200">
                <CardHeader>
                  <diff.icon className={`w-8 h-8 ${diff.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-start space-y-3">
                    <h4 className="text-lg font-medium text-foreground">
                      {diff.title}
                    </h4>
                    <div className="space-y-3">
                      {diff.description.map((des, id) => (
                        <div key={id} className="flex items-center space-x-2">
                          <Star className="w-4 h-4" />
                          <p className="text-muted-foreground">{des}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Right block */}
          </div>
        </div>
      </div>
    </main>
  );
}
