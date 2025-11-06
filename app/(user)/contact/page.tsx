"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { HelpForm } from "@/components/user/help-form";

export default function Contact() {
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
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left container */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-blue-900">
                Contact us
              </h1>
              <p className="text-xl text-muted-foreground">
                Our friendly team would love to hear from you.
              </p>
            </div>

            <div>
              <div className="flex items-center space-x-4">
                <Mail className="w-6 h-6 text-muted-foreground" />
                <a
                  href="mailto:thelaunchpadht@gmail.com"
                  className="text-muted-foreground hover:text-blue-900 font-medium"
                >
                  info@thelaunchpadht.com
                </a>
              </div>
              <div className="flex items-center space-x-4">
                <Phone className="w-6 h-6 text-muted-foreground" />
                <a
                  href="tel:+1-832-219-8320"
                  className="text-muted-foreground hover:text-blue-900 font-medium"
                >
                  832-219-8320
                </a>
              </div>
              <div className="flex items-center space-x-4">
                <MapPin className="w-6 h-6 text-muted-foreground" />
                <span className="text-foreground font-medium">
                  10410 S Main St, Houston, TX 77025
                </span>
              </div>
            </div>
          </div>

          {/* Right Container - Form */}
          <HelpForm />
        </div>
      </div>
    </main>
  );
}
