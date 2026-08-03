"use client";

import { motion } from "motion/react";
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
    <figure className="w-full shrink-0 overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-blue-950/20">
      {/* Star Rating */}
      <div
        className="mb-3 flex gap-1"
        aria-label={`${testimonial.rating} out of 5 stars`}
      >
        {[...Array(testimonial.rating)].map((_, i) => (
          <Star
            key={i}
            className="h-5 w-5 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Review Text */}
      <blockquote className="mb-4 text-sm italic leading-relaxed text-gray-700">
        "{testimonial.text}"
      </blockquote>

      {/* Author Info */}
      <figcaption className="border-t border-gray-200 pt-3">
        <p className="text-sm font-semibold text-gray-900">
          {testimonial.author}
        </p>
        {testimonial.vehicle && (
          <p className="text-xs text-gray-500">{testimonial.vehicle}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {testimonial.source} Review
        </p>
      </figcaption>
    </figure>
  );

  return (
    <section className="rounded-xl bg-linear-to-br from-blue-700 to-blue-900 px-6 py-20 sm:px-8 lg:px-12">
      <div className="container mx-auto">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left Content */}
          <div className="text-white">
            <h2 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
              What Our Customers are Saying
            </h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-blue-100">
              Don't just take our word for it, see what our happy customers are
              saying! These testimonials show how we make every car shine and
              every visit worth it.
            </p>
          </div>

          {/* Right escalator — hidden on small screens, where the static list
              below carries the same reviews. */}
          <div className="relative hidden h-96 w-full overflow-hidden lg:block">
            <motion.div
              className="flex flex-col gap-6"
              // The list is rendered twice, so travelling exactly -50% lands on
              // the identical frame and the loop is seamless at any card height.
              animate={{ y: ["0%", "-50%"] }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: "linear",
              }}
            >
              {duplicatedTestimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={`right-${index}`}
                  testimonial={testimonial}
                />
              ))}
            </motion.div>
            {/* Feather the ends so cards enter and leave instead of clipping */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-blue-800 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-blue-900 to-transparent"
            />
          </div>
        </div>

        {/* Small screens get the same reviews as a static list — the escalator
            is unreadable at that width. */}
        <div className="mt-10 lg:hidden">
          <div className="grid gap-4">
            {testimonials.slice(0, 5).map((review) => (
              <figure
                key={review.id}
                className="rounded-xl border border-blue-400/30 bg-blue-950/30 p-5"
              >
                <div
                  className="mb-2 flex gap-1"
                  aria-label={`${review.rating} out of 5 stars`}
                >
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-amber-400 text-amber-400"
                      aria-hidden="true"
                    />
                  ))}
                </div>
                <blockquote className="mb-3 text-sm italic leading-relaxed text-white">
                  "{review.text}"
                </blockquote>
                <figcaption className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {review.author}
                    </p>
                    {review.vehicle && (
                      <p className="text-xs text-blue-200">{review.vehicle}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-blue-200">
                    {review.source}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
