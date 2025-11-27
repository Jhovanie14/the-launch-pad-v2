"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Star } from "lucide-react";

interface Testimonial {
  id: number;
  // image: string;
  // New fields for SEO and accessibility
  rating: number;
  text: string;
  author: string;
  vehicle?: string;
  source: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    // image: "/reviews/image10.png",
    rating: 5,
    text: "Best self-wash in Houston. Equipment is strong and bays are super clean.",
    author: "Ahmed S.",
    vehicle: "BMW 3 Series",
    source: "Google",
  },
  {
    id: 2,
    // image: "/reviews/image11.png",
    rating: 5,
    text: "The express detailing service is amazing! My car looked brand new after they finished.",
    author: "Maria G.",
    vehicle: "Honda CR-V",
    source: "Yelp",
  },
  {
    id: 3,
    // image: "/reviews/image12.png",
    rating: 5,
    text: "I've tried every car wash in the area and this is by far the best. The membership is worth every penny.",
    author: "Jason T.",
    vehicle: "Regular Customer",
    source: "Google",
  },
  {
    id: 4,
    // image: "/reviews/image13.png",
    rating: 5,
    text: "Clean facility, modern equipment, and friendly staff. Highly recommend!",
    author: "Sarah M.",
    vehicle: "Toyota Camry",
    source: "Google",
  },
  {
    id: 5,
    // image: "/reviews/image14.png",
    rating: 5,
    text: "Outstanding detailing work! They got stains out of my seats that I thought were permanent.",
    author: "David R.",
    vehicle: "Ford F-150",
    source: "Yelp",
  },
  {
    id: 6,
    // image: "/reviews/image15.png",
    rating: 5,
    text: "Great prices and excellent service. The self-service bays have everything you need.",
    author: "Jennifer L.",
    vehicle: "Mazda CX-5",
    source: "Google",
  },
  {
    id: 7,
    // image: "/reviews/image16.png",
    rating: 5,
    text: "Been coming here for years. Never disappointed. The team always does a fantastic job.",
    author: "Michael P.",
    vehicle: "Regular Customer",
    source: "Google",
  },
  {
    id: 8,
    // image: "/reviews/image17.png",
    rating: 5,
    text: "Love the 24/7 access! Perfect for my late-night cleaning sessions after long drives.",
    author: "Carlos R.",
    vehicle: "Tesla Model 3",
    source: "Yelp",
  },
  {
    id: 9,
    // image: "/reviews/image18.png",
    rating: 5,
    text: "The membership saves me so much money. Unlimited washes means my car is always clean!",
    author: "Amanda K.",
    vehicle: "Regular Customer",
    source: "Google",
  },
  {
    id: 10,
    // image: "/reviews/image19.png",
    rating: 5,
    text: "Professional service every time. My truck has never looked better. Worth every dollar!",
    author: "Robert T.",
    vehicle: "Chevy Silverado",
    source: "Google",
  },
];

const duplicatedTestimonials = [...testimonials, ...testimonials];

export default function Testimonials() {
  const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
    <div className="bg-white rounded-2xl shadow-lg flex-shrink-0 w-full overflow-hidden">
      {/* Image Section */}
      <div className="relative">
        <div className="absolute top-4 left-4 z-10">
          <span className="text-5xl font-bold text-yellow-400">"</span>
        </div>
        {/* <Image
          src={testimonial.image || "/placeholder.svg"}
          alt={`Review from ${testimonial.author}`}
          width={450}
          height={450}
          className="w-full h-auto rounded-t-xl object-cover"
        /> */}
      </div>

      {/* Text Content Section - NEW */}
      <div className="p-6 bg-white">
        {/* Star Rating */}
        <div className="flex gap-1 mb-3">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
          ))}
        </div>

        {/* Review Text */}
        <p className="text-gray-700 text-sm leading-relaxed mb-4 italic">
          "{testimonial.text}"
        </p>

        {/* Author Info */}
        <div className="border-t border-gray-200 pt-3">
          <p className="font-semibold text-gray-900 text-sm">
            {testimonial.author}
          </p>
          {testimonial.vehicle && (
            <p className="text-xs text-gray-500">{testimonial.vehicle}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            {testimonial.source} Review
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <section className="bg-gradient-to-br from-blue-700 to-blue-900 py-20 rounded-md px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Content */}
          <div className="text-white">
            <div className="inline-block border border-blue-200 rounded-full px-4 py-2 mb-6 text-sm font-semibold text-blue-100">
              TESTIMONIALS
            </div>
            <h2 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight">
              What Our Customers are Saying
            </h2>
            <p className="text-lg text-emerald-100 leading-relaxed max-w-md mb-8">
              Don't just take our word for it, see what our happy customers are
              saying! These testimonials show how we make every car shine and
              every visit worth it.
            </p>
          </div>

          {/* Right Escalator Cards */}
          <div className="flex gap-6 h-96 w-full overflow-hidden">
            <motion.div
              className="flex-1 flex flex-col gap-6"
              animate={{
                y: [-600, -1800],
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
                repeatType: "loop",
              }}
            >
              {duplicatedTestimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={`right-${index}`}
                  testimonial={testimonial}
                />
              ))}
            </motion.div>
          </div>
        </div>

        {/* Mobile-friendly text reviews - NEW */}
        <div className="lg:hidden mt-12 space-y-6">
          <h3 className="text-2xl font-bold text-white text-center mb-6">
            Featured Reviews
          </h3>
          <div className="grid gap-4">
            {testimonials.slice(0, 5).map((review) => (
              <div
                key={review.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20"
              >
                <div className="flex gap-1 mb-2">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="text-white text-sm leading-relaxed mb-3 italic">
                  "{review.text}"
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold text-sm">
                      {review.author}
                    </p>
                    {review.vehicle && (
                      <p className="text-blue-200 text-xs">{review.vehicle}</p>
                    )}
                  </div>
                  <p className="text-blue-200 text-xs">{review.source}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
