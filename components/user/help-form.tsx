"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function HelpForm() {
  const [concern, setConcern] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      console.log(data);

      if (res.ok) {
        toast.success(
          "Your message has been sent! We’ll get back to you soon."
        );
        form.reset();
        setConcern("");
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to send your message. Try again.");
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      toast.error("Something went wrong while sending your message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-foreground mb-6">
        Submit a Request
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            type="email"
            id="email"
            name="email"
            placeholder="your@email.com"
            required
          />
        </div>

        {/* Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input type="text" id="firstName" name="firstName" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input type="text" id="lastName" name="lastName" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input type="text" id="phone" name="phone" />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">Issue Concern</Label>
          <select
            id="category"
            name="category"
            required
            value={concern}
            onChange={(e) => setConcern(e.target.value)}
            className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary bg-background text-foreground"
          >
            <option value="">Select a concern</option>
            <option value="general">General Inquiry</option>
            <option value="technical">Technical Problem</option>
            <option value="feedback">Feedback / Suggestions</option>
            <option value="payment">Payment Inquiry</option>
            <option value="booking">Booking Issue</option>
            <option value="account">Account & Login</option>
            <option value="billing">Billing & Payments</option>
            <option value="technical">Technical Issue</option>
            <option value="feature">Feature Request</option>
            <option value="bug">Report a Bug</option>
            <option value="other">Other</option>
          </select>
        </div>

        {concern === "booking" && (
          <div className="space-y-2">
            <Label htmlFor="subConcern">Booking Issue Type</Label>
            <select
              id="subConcern"
              name="subConcern"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a booking issue</option>
              <option value="cancel">Cancel Booking</option>
              <option value="reschedule">Move Date/Time</option>
              <option value="wrong_service">Wrong Service Selected</option>
              <option value="missing_booking">Booking Not Found</option>
              <option value="other">Other Booking Concern</option>
            </select>
          </div>
        )}

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="concern">Concern</Label>
          <Input
            type="text"
            id="concern"
            name="concern"
            placeholder="Brief description of your issue"
            required
          />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message">Detailed Description</Label>
          <Textarea
            id="message"
            name="message"
            placeholder="Please provide as much detail as possible to help us assist you better..."
            rows={5}
            required
          />
        </div>

        {/* Attachments Info */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Tip:</strong> Include screenshots or error messages to
            help us resolve your issue faster.
          </p>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-900 hover:bg-blue-900/90 text-primary-foreground font-semibold"
        >
          {loading ? "Submitting..." : "Submit Support Request"}
        </Button>
      </form>
    </div>
  );
}
