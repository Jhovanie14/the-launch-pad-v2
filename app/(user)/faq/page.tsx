"use client";

import { FAQSection } from "@/components/faq-section";
import { HelpCircle } from "lucide-react";

export default function FAQ() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="py-20">
          {/* FAQ Title */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-8 h-8 text-blue-900" />
              <h1 className="text-4xl md:text-5xl font-bold text-blue-900">
                FAQ
              </h1>
            </div>
            <p className="text-xl text-muted-foreground max-w-2xl">
              We're here to help. Find answers to common questions.
            </p>
          </div>

          {/* FAQ Items */}
          <div className="flex-1 space-y-1">
            <FAQSection />
          </div>
        </div>
      </div>
    </main>
  );
}
