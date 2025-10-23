"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { UserNavbar } from "@/components/user/navbar";
import { Footer } from "@/components/user/footer";

const faqData = [
  {
    id: 1,
    question: "What services does The Launch Pad offer?",
    answer:
      "We offer a comprehensive range of car care services including exterior wash packages, interior detailing, paint protection, ceramic coating, wax treatments, and premium detailing services. Our packages range from basic wash to full-service premium detailing.",
  },
  {
    id: 2,
    question: "How long does a typical car wash take?",
    answer:
      "Service times vary by package: Basic wash takes 15-20 minutes, Premium wash takes 30-45 minutes, and Full detailing services can take 2-4 hours depending on your vehicle's condition and selected services.",
  },
  {
    id: 3,
    question: "Do you offer membership or subscription plans?",
    answer:
      "Yes! We offer monthly unlimited wash memberships starting at $49.99/month for sedan's premium wash, $89.99/month for Suv's premium wash, and $149.99/month for our small trucks premium package. Members also receive priority service and exclusive discounts.",
    //  "Yes! We offer monthly unlimited wash memberships starting at $49.99/month for sedan's premium wash, $89.99/month for Suv's premium wash, and $149.99/month for our complete care package. Members also receive priority service and exclusive discounts.",
  },
  {
    id: 4,
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, MasterCard, American Express, Discover), debit cards, cash, Apple Pay, Google Pay, and contactless payments. Monthly memberships are automatically charged to your preferred payment method.",
  },
  {
    id: 5,
    question:
      "Do you provide services for large vehicles like trucks and SUVs?",
    answer:
      "We accommodate vehicles of all sizes including trucks, SUVs, vans, and commercial vehicles. Pricing may vary based on vehicle size, and we recommend calling ahead for oversized vehicles to ensure availability.",
  },
  {
    id: 6,
    question: "What's your cancellation and refund policy?",
    answer:
      "For individual services, cancellations made 2+ hours in advance receive full refunds. Membership cancellations require 30 days notice and can be processed through our app or by visiting our location. No refunds on partial months for memberships.",
  },
  {
    id: 7,
    question: "Do you offer eco-friendly car wash options?",
    answer:
      "Yes! We use biodegradable soaps, water reclamation systems, and eco-friendly products in all our services. Our green wash option uses 100% environmentally safe products and minimal water consumption.",
  },
  {
    id: 8,
    question: "Can I wait in my car during the wash?",
    answer:
      "For safety reasons, we require customers to exit their vehicles during automated wash cycles. However, you're welcome to wait in our comfortable customer lounge with complimentary Wi-Fi, refreshments, and charging stations.",
  },
  {
    id: 9,
    question: "Do you offer any guarantees on your services?",
    answer:
      "We stand behind our work with a 100% satisfaction guarantee. If you're not completely satisfied with any service, let us know within 24 hours and we'll make it right with a complimentary re-wash or full refund.",
  },
  {
    id: 10,
    question:
      "I have additional questions not covered here, who can I contact?",
    answer:
      "Our friendly team is here to help! You can reach us at (832) 219-8320, email us at info@thelaunchpadwash.com, or visit us at 10410 Main St, Houston, TX, United States, Texas. ",
    // You can also use our live chat feature on our website or mobile app.
  },
];

export default function FAQ() {
  const [openItem, setOpenItem] = useState<number | null>(1);

  const toggleItem = (id: number) => {
    setOpenItem(openItem === id ? null : id);
  };

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="py-20">
          <div className="flex flex-col sm:flex-row lg:flex-row items-start gap-8 lg:gap-16">
            {/* FAQ Title */}
            <div className="flex-shrink-0">
              <h2 className="text-6xl lg:text-8xl font-bold text-blue-900 tracking-tight">
                FAQ
              </h2>
            </div>

            {/* FAQ Items */}
            <div className="flex-1 space-y-1">
              {faqData.map((item) => (
                <div key={item.id} className="border-b border-border">
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full py-6 flex items-center justify-between text-left hover:bg-muted/50 transition-colors group"
                  >
                    <h3 className="text-lg lg:text-xl font-medium text-foreground pr-4 text-balance">
                      {item.question}
                    </h3>
                    <div className="flex-shrink-0">
                      {openItem === item.id ? (
                        <X className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      ) : (
                        <Plus className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      )}
                    </div>
                  </button>

                  {openItem === item.id && (
                    <div className="pb-6 pr-8">
                      <p className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
