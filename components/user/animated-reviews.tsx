"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Review } from "@/types";

interface AnimatedReviewsProps {
  reviews: Review[];
  autoplay?: boolean;
  autoplayInterval?: number;
}

export function AnimatedReviews({
  reviews,
  autoplay = true,
  autoplayInterval = 5000,
}: AnimatedReviewsProps) {
  const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: EASE_OUT,
      },
    },
  };

  const starVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
        ease: EASE_OUT,
      },
    }),
  };

  function getInitials(name: string): string {
    if (!name) return "";

    const words = name.trim().split(" ").filter(Boolean);
    const initials = words.map((word) => word[0].toUpperCase()).slice(0, 2);

    return initials.join("");
  }

  function formatTimeAgo(date: Date | string): string {
    let _date: Date;

    // Convert string input to a Date object if necessary
    if (typeof date === "string") {
      _date = new Date(date);
    } else {
      _date = date;
    }

    const seconds: number = Math.floor(
      (new Date().getTime() - _date.getTime()) / 1000
    );

    // Define intervals for different time units in seconds
    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2628000,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    // Iterate through the intervals and determine the appropriate unit
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval: number = Math.floor(seconds / secondsInUnit);
      if (interval > 1) {
        return `${interval} ${unit}s ago`;
      } else if (interval === 1) {
        return `${interval} ${unit} ago`;
      }
    }

    // If no larger unit is found, return "just now"
    return "just now";
  }

  return (
    <motion.div
      className="w-full"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review, index) => (
          <motion.div
            key={review.id}
            variants={itemVariants}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
          >
            <Card className="h-full flex flex-col p-6 bg-card hover:shadow-lg transition-shadow duration-300">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <motion.div
                    key={i}
                    custom={i}
                    variants={starVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                  >
                    <Star
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                      aria-hidden="true"
                    />
                  </motion.div>
                ))}
              </div>

              {/* Review Content */}
              <motion.p
                className="text-card-foreground text-sm leading-relaxed mb-6 flex-grow"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                viewport={{ once: true }}
              >
                "{review.comment}"
              </motion.p>

              {/* Author Info */}
              <motion.div
                className="flex items-center gap-3 pt-4 border-t border-border"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage
                    src={review?.profiles?.avatar_url || ""}
                    alt={review?.profiles?.full_name}
                  />
                  <AvatarFallback>
                    {getInitials(review?.profiles?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-card-foreground truncate">
                    {review?.profiles?.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatTimeAgo(review?.created_at)}
                  </p>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
