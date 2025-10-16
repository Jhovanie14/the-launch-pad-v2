import { Calendar, MapPin, Sparkles, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Calendar,
    number: "01",
    title: "Book Your Service",
    description:
      "Choose your preferred date, time, and service package through our easy-to-use online booking system or mobile app.",
  },
  {
    icon: MapPin,
    number: "02",
    title: "Visit The Launch Pad",
    description:
      "Stop by The Launch Pad and let our expert team give your vehicle the care it deserves.",
  },
  {
    icon: Sparkles,
    number: "03",
    title: "Expert Cleaning",
    description:
      "We use eco-friendly products and advanced techniques to clean, polish, and protect your vehicle inside and out.",
  },
  {
    icon: CheckCircle,
    number: "04",
    title: "Enjoy Your Ride",
    description:
      "Drive away in a spotless vehicle. We guarantee satisfaction with every wash or your money back.",
  },
];

export function ProcessSteps() {
  return (
    <section className="py-20 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-balance text-blue-900">
            Simple Steps to a Spotless Car
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty leading-relaxed">
            Our streamlined process ensures you get professional results without
            the hassle of traditional car washes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card
                key={index}
                className="p-8 hover:shadow-lg transition-shadow duration-300 border-2"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className="bg-blue-900 text-white w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-blue-900 text-sm font-bold mb-2">
                      STEP {step.number}
                    </div>
                    <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
