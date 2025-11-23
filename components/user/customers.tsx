"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Testimonial {
  id: number;
  image: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,

    image: "/reviews/image10.png",
  },
  {
    id: 2,

    image: "/reviews/image11.png",
  },
  {
    id: 3,

    image: "/reviews/image12.png",
  },
  {
    id: 4,

    image: "/reviews/image13.png",
  },
  {
    id: 5,

    image: "/reviews/image14.png",
  },
  {
    id: 6,
    image: "/reviews/image15.png",
  },
  {
    id: 7,
    image: "/reviews/image16.png",
  },
  {
    id: 8,
    image: "/reviews/image17.png",
  },
  {
    id: 9,
    image: "/reviews/image18.png",
  },
  {
    id: 10,
    image: "/reviews/image19.png",
  },
];

const duplicatedTestimonials = [...testimonials, ...testimonials];

export default function Testimonials() {
  // const leftColumnAnimation = {
  //   animate: {
  //     y: [0, -1200],
  //     transition: {
  //       duration: 30,
  //       repeat: Number.POSITIVE_INFINITY,
  //       ease: "linear",
  //       repeatType: "loop" as const,
  //     },
  //   },
  // };

  // const rightColumnAnimation = {
  //   animate: {
  //     y: [-600, -1800],
  //     transition: {
  //       duration: 30,
  //       repeat: Number.POSITIVE_INFINITY,
  //       ease: "linear",
  //       repeatType: "loop" as const,
  //     },
  //   },
  // };

  const TestimonialCard = ({ testimonial }: { testimonial: Testimonial }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg flex-shrink-0 w-full">
      <div className="mb-3">
        <span className="text-5xl font-bold text-yellow-400">"</span>
      </div>

      <div className="flex items-center">
        {/* <Image
          src={testimonial.image}
          alt={`5-star review from ${testimonial.author} about ${testimonial.vehicle} car wash service`}
          width={450}
          height={450}
        /> */}
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
            <p className="text-lg text-emerald-100 leading-relaxed max-w-md">
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
      </div>
    </section>
  );
}
