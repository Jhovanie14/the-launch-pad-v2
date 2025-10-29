"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Review } from "@/types";

interface ReviewCarouselProps {
  reviews: Review[];
  autoplayInterval?: number;
}

export function ReviewCarousel({
  reviews,
  autoplayInterval = 6000,
}: ReviewCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDirection(1);
      setCurrent((prev) => (prev + 1) % reviews.length);
    }, autoplayInterval);

    return () => clearInterval(timer);
  }, [reviews.length, autoplayInterval]);

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      zIndex: 0,
      x: dir > 0 ? -1000 : 1000,
      opacity: 0,
    }),
  };

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrent(
      (prev) => (prev + newDirection + reviews.length) % reviews.length
    );
  };

  const review = reviews[current];

  function getInitials(name: string): string {
    if (!name) return "";

    const words = name.trim().split(" ").filter(Boolean);
    const initials = words.map((word) => word[0].toUpperCase()).slice(0, 2);

    return initials.join("");
  }

  function formatTimeAgo(date: Date | string | null | undefined): string {
    if (!date) return "just now"; // handles null or undefined

    const _date = new Date(date);

    if (isNaN(_date.getTime())) {
      // invalid date string
      return "just now";
    }

    const seconds = Math.floor((Date.now() - _date.getTime()) / 1000);

    if (seconds < 5) return "just now";
    if (seconds < 60) return `${seconds} seconds ago`;

    const intervals: Record<string, number> = {
      year: 31536000,
      month: 2628000,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return `${interval} ${unit}${interval > 1 ? "s" : ""} ago`;
      }
    }

    return "just now";
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative h-96 overflow-hidden rounded-lg">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.5 },
            }}
            className="absolute inset-0"
          >
            <Card className="h-full flex flex-col p-8 bg-gradient-to-br from-card to-card/80">
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: review?.rating }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, duration: 0.3 }}
                  >
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  </motion.div>
                ))}
              </div>

              {/* Content */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-lg text-card-foreground leading-relaxed mb-8 flex-grow italic"
              >
                "{review?.comment}"
              </motion.p>

              {/* Author */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex items-center gap-4 pt-6 border-t border-border"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={review?.profiles?.avatar_url || ""}
                    alt={review?.profiles?.full_name}
                  />
                  <AvatarFallback>
                    {getInitials(review?.profiles?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-card-foreground">
                    {review?.profiles?.full_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatTimeAgo(review?.created_at)}
                  </p>
                </div>
              </motion.div>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => paginate(-1)}
          aria-label="Previous review"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Indicators */}
        <div className="flex gap-2">
          {reviews.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => {
                setDirection(index > current ? 1 : -1);
                setCurrent(index);
              }}
              className={`h-2 rounded-full transition-all ${index === current ? "bg-primary w-8" : "bg-muted w-2"}`}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.95 }}
              aria-label={`Go to review ${index + 1}`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => paginate(1)}
          aria-label="Next review"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Counter */}
      <motion.p
        key={current}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center text-sm text-muted-foreground mt-4"
      >
        {current + 1} / {reviews.length}
      </motion.p>
    </div>
  );
}
