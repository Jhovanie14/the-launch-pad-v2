"use client";

import { Suspense, useState } from "react";
import { HelpForm } from "@/components/user/help-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, ChevronRight, HelpCircle, Mail, MapPin, MessageSquare, Phone } from "lucide-react";
import { FAQSection } from "@/components/faq-section";
import { ResourceModal } from "@/components/resource-modal";
import { DIRECTIONS_URL } from "@/components/dashboard-home/now-card";
import { cn } from "@/lib/utils";

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const TAB = cn(
  "min-h-11 gap-2 rounded-lg border-0 px-4 text-sm font-semibold text-ink-muted",
  "data-[state=active]:bg-paper data-[state=active]:text-ink data-[state=active]:shadow-none data-[state=active]:ring-1 data-[state=active]:ring-line",
  "focus-visible:ring-0",
  FOCUS,
);
const CONTACT_LINK = cn(
  "flex min-h-11 items-center gap-3 rounded-lg px-2 font-semibold text-ink hover:bg-line-soft",
  FOCUS,
);

export default function HelpPage() {
  const [activeTab, setActiveTab] = useState("support");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<
    "guide" | "tutorials" | null
  >(null);

  const openModal = (type: "guide" | "tutorials") => {
    setModalType(type);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalType(null);
  };

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight text-ink">Help and support</h1>
      <p className="mt-1 max-w-prose text-ink-muted">
        Send us a message, find a quick answer, or read how things work.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6 w-full gap-0">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl bg-line-soft p-1 sm:inline-grid sm:w-auto">
          <TabsTrigger value="support" className={TAB}>
            <MessageSquare aria-hidden className="size-4" />
            Contact us
          </TabsTrigger>
          <TabsTrigger value="faq" className={TAB}>
            <HelpCircle aria-hidden className="size-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="resources" className={TAB}>
            <BookOpen aria-hidden className="size-4" />
            Guides
          </TabsTrigger>
        </TabsList>

        {/* Contact */}
        <TabsContent value="support" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            {/* HelpForm reads ?topic= to pre-fill vehicle change requests */}
            <Suspense
              fallback={<div aria-hidden className="h-[36rem] animate-pulse rounded-2xl bg-line motion-reduce:animate-none" />}
            >
              <HelpForm />
            </Suspense>

            <aside
              aria-labelledby="reach-heading"
              className="rounded-2xl bg-paper p-5 ring-1 ring-line lg:sticky lg:top-24"
            >
              <h2 id="reach-heading" className="text-base font-black tracking-tight text-ink">
                Other ways to reach us
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                We answer messages by email, at the address you give in the form.
              </p>
              <div className="mt-3 -mx-2 border-t border-line-soft pt-2 text-sm">
                <a href="tel:+18322198320" className={CONTACT_LINK}>
                  <Phone aria-hidden className="size-4 shrink-0 text-brand-blue" />
                  (832) 219-8320
                </a>
                <a href="mailto:info@thelaunchpadwash.com" className={CONTACT_LINK}>
                  <Mail aria-hidden className="size-4 shrink-0 text-brand-blue" />
                  <span className="min-w-0 break-all">info@thelaunchpadwash.com</span>
                </a>
                <a href={DIRECTIONS_URL} target="_blank" rel="noreferrer" className={CONTACT_LINK}>
                  <MapPin aria-hidden className="size-4 shrink-0 text-brand-blue" />
                  <span>
                    10410 S Main St, Houston
                    <span className="block font-medium text-ink-muted">Get directions</span>
                  </span>
                </a>
              </div>
              <dl className="mt-3 space-y-2 border-t border-line-soft pt-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-ink-muted">Self-service bays</dt>
                  <dd className="font-semibold text-ink">Open 24/7</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-ink-muted">Express detailing</dt>
                  <dd className="text-right font-semibold text-ink">
                    Thu–Sun
                    <span className="block font-medium text-ink-muted">9:30 AM–6:30 PM</span>
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq" className="mt-6">
          <FAQSection />
        </TabsContent>

        {/* Guides */}
        <TabsContent value="resources" className="mt-6">
          <section aria-label="Guides" className="max-w-2xl rounded-2xl bg-paper p-2 ring-1 ring-line sm:p-3">
            <ul className="divide-y divide-line-soft">
              <li>
                <GuideRow
                  title="Getting started"
                  body="Booking a detail, the self-service bays, membership and the shop."
                  onOpen={() => openModal("guide")}
                />
              </li>
              <li>
                <GuideRow
                  title="How do I…"
                  body="Add or unsubscribe a vehicle, update your card, cancel, and more."
                  onOpen={() => openModal("tutorials")}
                />
              </li>
            </ul>
          </section>
        </TabsContent>
      </Tabs>

      <ResourceModal isOpen={modalOpen} onClose={closeModal} type={modalType} />
    </div>
  );
}

function GuideRow({ title, body, onOpen }: { title: string; body: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-3 py-4 text-left hover:bg-line-soft",
        FOCUS,
      )}
    >
      <span>
        <span className="block font-bold text-ink">{title}</span>
        <span className="mt-0.5 block text-sm text-ink-muted">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-subtle" />
    </button>
  );
}
