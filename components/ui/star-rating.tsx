import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  setRating: (value: number) => void;
}

function StarRating({ rating, setRating }: StarRatingProps) {
  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-6 w-6 cursor-pointer transition-colors ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-400"
          }`}
          onClick={() => setRating(star)}
        />
      ))}
    </div>
  );
}

export { StarRating };
