"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "guide" | "tutorials" | "forum" | null;
}

export function ResourceModal({ isOpen, onClose, type }: ResourceModalProps) {
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const renderContent = () => {
    switch (type) {
      case "guide":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Getting Started Guide
            </h2>
            <div className="space-y-3 text-muted-foreground">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  1. Create Your Account
                </h3>
                <p>
                  Sign up with your email and set up your profile. It takes less
                  than 2 minutes.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  2. Browse Services
                </h3>
                <p>
                  Explore our car wash packages and select the one that fits
                  your needs.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  3. Schedule Your Appointment
                </h3>
                <p>
                  Choose your preferred date and time. We offer flexible
                  scheduling throughout the week.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  4. Complete Payment
                </h3>
                <p>
                  Securely pay with your preferred method. We accept all major
                  credit cards.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  5. Enjoy Your Service
                </h3>
                <p>
                  Arrive at your scheduled time and let our professionals take
                  care of your vehicle.
                </p>
              </div>
            </div>
          </div>
        );
      case "tutorials":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Video Tutorials
            </h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  How to Book Your First Appointment
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  A quick walkthrough of the booking process.
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Watch Video (5 min)
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Understanding Our Service Packages
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Learn the differences between our wash packages.
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Watch Video (8 min)
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Managing Your Subscriptions
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  How to upgrade, downgrade, or cancel your membership.
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Watch Video (6 min)
                </Button>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Payment & Billing FAQ
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Everything you need to know about payments.
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Watch Video (7 min)
                </Button>
              </div>
            </div>
          </div>
        );
      case "forum":
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Community Forum
            </h2>
            <div className="space-y-6 text-muted-foreground">
              <p>
                Join our active community of car wash enthusiasts and service
                users. Share tips, ask questions, and connect with others.
              </p>
              <div className="rounded-lg border border-border bg-muted p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Popular Topics
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>• Best practices for car maintenance</li>
                  <li>• Seasonal car care tips</li>
                  <li>• Member experiences and reviews</li>
                  <li>• Service recommendations</li>
                  <li>• Membership benefits discussion</li>
                </ul>
              </div>
              <div className="rounded-lg border border-border bg-muted p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Community Guidelines
                </h3>
                <p className="text-sm">
                  Be respectful, helpful, and constructive. Our moderators
                  ensure a positive environment for all members.
                </p>
              </div>
              <Link
                href="/dashboard/forum"
                className="w-full bg-blue-900 p-3 rounded-lg text-white font-medium"
              >
                Join Our Forum
              </Link>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-background p-8 z-50"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>

            {renderContent()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
