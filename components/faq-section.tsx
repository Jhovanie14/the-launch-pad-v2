"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { faqData } from "@/lib/data/faq-data";

export function FAQSection() {
  const categories = Array.from(new Set(faqData.map((faq) => faq.category)));

  return (
    <div className="space-y-12">
      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {category}
          </h2>
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqData
              .filter((faqData) => faqData.category === category)
              .map((faqData) => (
                <AccordionItem
                  key={faqData.id}
                  value={faqData.id}
                  className="border border-border rounded-lg px-6 data-[state=open]:bg-muted"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <span className="text-left font-semibold text-foreground">
                      {faqData.question}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-4">
                    {faqData.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}
