"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { StarRating } from "@/components/ui/star-rating";

interface ReviewFormProps {
  bookingId: string;
  userId: string;
  onSubmitted?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewForm({
  bookingId,
  userId,
  onSubmitted,
  open,
  onOpenChange,
}: ReviewFormProps) {
  const supabase = createClient();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      user_id: userId,
      rating,
      comment,
    });

    setLoading(false);

    if (error) {
      console.error("Error submitting review:", error);
      return;
    }

    setComment("");
    setRating(5);

    if (onSubmitted) onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className=" max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Leave a Review</DialogTitle>
          <DialogDescription>
            Please rate our service and share your feedback.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating">Rating</Label>
            <StarRating rating={rating} setRating={setRating} />
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment</Label>
            <Textarea
              id="comment"
              placeholder="Write your review..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Review"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
