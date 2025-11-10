"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "./ui/card";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
            >
              <h3 className="text-2xl font-bold mb-4 text-gray-900">
                Terms of Service
              </h3>

              <Card className="mb-6 p-4 bg-card max-h-[60vh] overflow-y-auto">
                {/* Example: Include introduction + sections here */}
                <p className="text-foreground leading-relaxed mb-4">
                  This Terms of Service Agreement (this "Agreement") is a
                  binding contract between you ("Customer," "you," or "your")
                  and The Launch Pad ("The Launch Pad," "we," "us," or "our").
                  This Agreement governs your access to and use of our car-wash
                  services, subscription plans, add-ons, and related offerings
                  (collectively, the "Services").
                </p>
                <p className="text-foreground leading-relaxed mb-4 font-semibold">
                  THIS AGREEMENT TAKES EFFECT WHEN YOU CLICK "ACCEPT," CREATE AN
                  ACCOUNT, OR ACCESS OR USE THE SERVICES (the "Effective Date").
                  BY DOING SO YOU AGREE TO BE LEGALLY BOUND BY IT.
                </p>

                {/* Section 1 Example */}
                <div className="space-y-2">
                  <h4 className="text-lg font-semibold">1. General Terms</h4>
                  <p className="text-foreground leading-relaxed">
                    The Launch Pad provides drive-through and related car-wash
                    services. Customers may purchase a Subscription to access
                    Services.
                  </p>
                  <h4 className="text-lg font-semibold">
                    1. Subscription Terms
                  </h4>
                  <p className="text-foreground leading-relaxed">
                    All subscriptions are{" "}
                    <span className="font-semibold">non-refundable</span>. You
                    may cancel your subscription at any time, and your access
                    will continue until the end of the current paid term. No
                    refunds or credits are issued for partial months.
                  </p>
                  <p className="text-foreground leading-relaxed">
                    Payment for your subscription is due upfront at the start of
                    each billing period monthly or yearly before access to the
                    services begins.
                    {/* Each vehicle requires its own separate subscription. */}
                  </p>
                </div>

                {/* You can continue embedding each section here */}
              </Card>

              <div className="mt-6 flex justify-end gap-3">
                <Button onClick={onClose}>Accept</Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
