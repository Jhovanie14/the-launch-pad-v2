"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "./ui/card";
import { X, ExternalLink } from "lucide-react";
import Link from "next/link";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsModal({
  isOpen,
  onClose,
  onAccept,
}: TermsModalProps) {
  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };

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
            aria-hidden="true"
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              exit={{ y: -20 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3
                  id="terms-modal-title"
                  className="text-2xl font-bold text-gray-900"
                >
                  Terms of Service
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Close terms modal"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-6 flex-1">
                <div className="space-y-6 text-gray-700">
                  {/* Introduction */}
                  <section>
                    <p className="leading-relaxed mb-4">
                      This Terms of Service Agreement (this "Agreement") is a
                      binding contract between you ("Customer," "you," or
                      "your") and The Launch Pad ("The Launch Pad," "we," "us,"
                      or "our"). This Agreement governs your access to and use
                      of our car-wash services, subscription plans, add-ons, and
                      related offerings (collectively, the "Services").
                    </p>
                    <Card className="p-4 bg-yellow-50 border-yellow-300 mb-4">
                      <p className="font-semibold text-sm leading-relaxed">
                        THIS AGREEMENT TAKES EFFECT WHEN YOU CLICK "ACCEPT,"
                        CREATE AN ACCOUNT, OR ACCESS OR USE THE SERVICES. BY
                        DOING SO YOU AGREE TO BE LEGALLY BOUND BY IT. IF YOU DO
                        NOT AGREE, DO NOT USE THE SERVICES.
                      </p>
                    </Card>
                    <p className="font-semibold text-sm">
                      YOU ALSO AGREE TO THE ARBITRATION AGREEMENT AND CLASS
                      ACTION WAIVER IN SECTION 9.3 (EXCEPT FOR MATTERS THAT MAY
                      BE TAKEN TO SMALL CLAIMS COURT).
                    </p>
                  </section>

                  {/* Key Highlights */}
                  <section className="border-t pt-6">
                    <h4 className="text-lg font-bold mb-4 text-gray-900">
                      Key Terms Summary
                    </h4>
                    <div className="space-y-3">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          1. Services & Location
                        </h5>
                        <p className="text-sm leading-relaxed">
                          We operate at{" "}
                          <strong>10410 S Main St, Houston, TX 77025</strong>. We
                          offer drive-through car wash services, subscription
                          plans (monthly/yearly), and various add-ons.
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          2. Subscription Plans
                        </h5>
                        <ul className="text-sm space-y-2 ml-4 list-disc">
                          <li>
                            <strong>AutoPay (Opt-In):</strong> Recurring charges
                            until you cancel with 30 days' notice
                          </li>
                          <li>
                            <strong>Manual Renewal:</strong> Your access ends at
                            the term's close unless you proactively pay for the
                            next term
                          </li>
                          <li>
                            Each vehicle requires its own separate subscription
                          </li>
                        </ul>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          3. Cancellation & Refunds
                        </h5>
                        <ul className="text-sm space-y-2 ml-4 list-disc">
                          <li>
                            <strong>Individual Services:</strong> Cancel 24+
                            hours before for full refund
                          </li>
                          <li>
                            <strong>Subscriptions:</strong> No refunds for
                            partial months or unused time
                          </li>
                          <li>
                            <strong>AutoPay:</strong> Cancel with 30 days'
                            advance notice
                          </li>
                        </ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          4. Violation; Termination
                        </h5>
                        <ul className="text-sm space-y-2 ml-4 list-disc">
                          <li>
                            <strong>Investigation; Enforcement:</strong> We may
                            investigate violations of this Agreement or law and
                            pursue available remedies, including cooperating
                            with law enforcement.
                          </li>
                          <li>
                            <strong>Suspension; Cancellation:</strong> We may
                            suspend access or cancel your subscription and
                            terminate this Agreement if you breach it (including
                            non-payment, misuse, or abuse).
                          </li>
                          <li>
                            <strong>Refusal of Service:</strong> We may refuse
                            service or access to any person or vehicle at any
                            time for any lawful reason, including safety,
                            equipment limitations, or misuse.
                          </li>
                        </ul>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          5. Payment Terms
                        </h5>
                        <p className="text-sm leading-relaxed">
                          Payment is due at the start of each subscription term
                          (online or cash). If payment is not received, access
                          is paused until payment is made.
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          6. Limitation of Liability
                        </h5>
                        <p className="text-sm leading-relaxed font-semibold">
                          Services are provided "AS IS." We are not liable for
                          consequential damages. Maximum liability is limited to
                          3x your most recent payment or $100, whichever is
                          greater.
                        </p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-2">
                          7. Arbitration & Class Action Waiver
                        </h5>
                        <p className="text-sm leading-relaxed">
                          Disputes are resolved by binding arbitration (except
                          small claims matters). You agree not to participate in
                          class actions. You may opt out within 30 days by
                          mailing written notice to our address.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Contact Information */}
                  <section className="border-t pt-6">
                    <h4 className="text-lg font-bold mb-4 text-gray-900">
                      Contact Information
                    </h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm mb-2">
                        <strong>Address:</strong> 10410 S Main St, Houston, TX
                        77025
                      </p>
                      <p className="text-sm mb-2">
                        <strong>Phone:</strong>{" "}
                        <a
                          href="tel:832-219-8320"
                          className="text-blue-600 hover:underline"
                        >
                          832-219-8320
                        </a>
                      </p>
                      <p className="text-sm">
                        <strong>Email:</strong>{" "}
                        <a
                          href="mailto:info@thelaunchpadwash.com"
                          className="text-blue-600 hover:underline"
                        >
                          info@thelaunchpadwash.com
                        </a>
                      </p>
                    </div>
                  </section>

                  {/* Full Terms Link */}
                  <section className="border-t pt-6">
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <p className="text-sm text-gray-700 mb-3">
                        This is a summary of our key terms. For complete
                        details, please read the full Terms of Service.
                      </p>
                      <Link
                        href="/terms"
                        target="_blank"
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                      >
                        Read Full Terms of Service
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </Card>
                  </section>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="border-t border-gray-200 p-6 bg-gray-50 flex justify-between items-center gap-4">
                <p className="text-xs text-gray-500">
                  By clicking "I Accept," you agree to these terms
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAccept}
                    className="px-8 bg-blue-900 hover:bg-blue-800"
                  >
                    I Accept
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
