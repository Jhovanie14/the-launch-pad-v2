"use client";

import { useState } from "react";
import { HelpForm } from "@/components/user/help-form";
// import { FAQSection } from "@/components/faq-section";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle, MessageSquare, BookOpen } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { ResourceModal } from "@/components/resource-modal";

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("support");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "guide" | "tutorials" | "forum" | null
  >(null);

  const openModal = (type: "guide" | "tutorials" | "forum") => {
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
  };
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-8 h-8 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Help & Support
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl">
            We're here to help. Find answers to common questions or submit a
            support request.
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Support Request</span>
              <span className="sm:hidden">Request</span>
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">FAQ</span>
              <span className="sm:hidden">FAQ</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Resources</span>
              <span className="sm:hidden">Docs</span>
            </TabsTrigger>
          </TabsList>

          {/* Support Request Tab */}
          <TabsContent value="support" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Info Cards */}
              <div className="lg:col-span-1 space-y-4">
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Response Time
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We typically respond within 24 hours during business days.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Ticket Tracking
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    You'll receive an email to track your request status.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="font-semibold text-foreground mb-2">
                    Priority Support
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Premium members get priority response times.
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2">
                <HelpForm />
              </div>
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="mt-8">
            <FAQSection />
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button
                onClick={() => openModal("guide")}
                className="rounded-lg border border-border bg-card p-8 hover:shadow-md transition-shadow text-left"
              >
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Getting Started Guide
                </h3>
                <p className="text-muted-foreground mb-4">
                  Learn the basics and get up and running in minutes.
                </p>
                <span className="text-primary hover:underline font-medium">
                  Read Guide →
                </span>
              </button>

              <button
                onClick={() => openModal("tutorials")}
                className="rounded-lg border border-border bg-card p-8 hover:shadow-md transition-shadow text-left"
              >
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Video Tutorials
                </h3>
                <p className="text-muted-foreground mb-4">
                  Watch step-by-step tutorials for common tasks.
                </p>
                <span className="text-primary hover:underline font-medium">
                  Watch Videos →
                </span>
              </button>

              <button
                onClick={() => openModal("forum")}
                className="rounded-lg border border-border bg-card p-8 hover:shadow-md transition-shadow text-left"
              >
                <h3 className="text-lg font-semibold text-foreground mb-3">
                  Community Forum
                </h3>
                <p className="text-muted-foreground mb-4">
                  Connect with other users and share solutions.
                </p>
                <span className="text-primary hover:underline font-medium">
                  Join Forum →
                </span>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <ResourceModal isOpen={modalOpen} onClose={closeModal} type={modalType} />
    </main>
  );
}
