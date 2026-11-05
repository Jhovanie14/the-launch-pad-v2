"use client";

import { useState } from "react";
import { AlertCircle, Star } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "@/lib/utils";

interface ReviewFormProps {
  bookingId: string;
  userId: string;
  onSubmitted?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RATING_WORDS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

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
  const [failed, setFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFailed(false);

    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      user_id: userId,
      rating,
      comment,
    });

    setLoading(false);

    if (error) {
      console.error("Error submitting review:", error);
      setFailed(true);
      return;
    }

    setComment("");
    setRating(5);

    if (onSubmitted) onSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* The dialog portals outside the dashboard shell, so it opts into the
          customer tokens itself (lp-theme) to keep navy text and a brand-blue ring. */}
      <DialogContent className="lp-theme max-h-[90vh] overflow-y-auto bg-paper text-ink ring-1 ring-line sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight text-ink">
            How was your detail?
          </DialogTitle>
          <DialogDescription className="text-ink-muted">
            Your rating and a few words help us get the next one right.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Rating: a real radio group, so it works with keys and screen readers */}
          <fieldset>
            <legend className="text-sm font-semibold text-ink">Your rating</legend>
            <div className="mt-1 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <label
                  key={star}
                  className="relative flex size-11 cursor-pointer items-center justify-center rounded-lg hover:bg-canvas has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                >
                  <input
                    type="radio"
                    name="rating"
                    value={star}
                    checked={rating === star}
                    onChange={() => setRating(star)}
                    className="sr-only"
                  />
                  <Star
                    aria-hidden
                    className={cn(
                      "size-7",
                      star <= rating
                        ? "fill-svc-detail-mark text-svc-detail-mark"
                        : "text-ink-subtle"
                    )}
                  />
                  <span className="sr-only">
                    {star} {star === 1 ? "star" : "stars"}, {RATING_WORDS[star]}
                  </span>
                </label>
              ))}
              <span aria-hidden className="ml-2 text-sm font-semibold text-ink-muted">
                {RATING_WORDS[rating]}
              </span>
            </div>
          </fieldset>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment" className="font-semibold text-ink">
              Tell us more
            </Label>
            <Textarea
              id="comment"
              placeholder="What did we get right, and what could be better?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              className="min-h-28 bg-paper text-ink"
            />
          </div>

          {failed && (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
              We couldn&apos;t send your review. Check your connection and try again.
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-flame px-5 font-bold text-on-flame transition-colors hover:bg-flame-bright focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60 sm:w-auto"
          >
            {loading ? "Sending…" : "Send review"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
