"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, DollarSign, Info, Sparkles, X } from "lucide-react";
import { motion } from "motion/react";
import { pageRise, pageStagger } from "@/lib/motion";
import { useRouter } from "next/navigation";
import PricingCard from "@/components/pricing-plan";
import { useAuth } from "@/context/auth-context";
import { useSelfService } from "@/hooks/useSelfService";
import LoadingDots from "@/components/loading";
import { useState } from "react";
import AuthPromptModal from "@/components/user/authPromptModal";
import {
  BAY_AVERAGE_SPEND,
  BAY_CARD_HOLD,
  BAY_CARD_HOLD_RELEASE,
  BAY_MINIMUM_CARD,
  BAY_MINIMUM_CASH,
  usd,
} from "@/lib/pricing/selfServiceRates";

export default function SelfServicePage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { plan, subscription, usedToday, loading } = useSelfService(user);
  const [authOpen, setAuthOpen] = useState(false);

  const handleCheckout = (planId: string) => {
    if (!user) {
      setAuthOpen(true);
    } else {
      router.push("/dashboard/pricing/self-service-cart");
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      {/* Promo Banner */}
      {/* <motion.div
        className="bg-linear-to-r from-red-500 to-red-600 text-white text-center py-4 px-4 shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl md:text-3xl font-bold">
            Get 20% Off When You Apply Promo Code LAUNCHPAD20 at Checkout
          </span>
        </div>
      </motion.div> */}
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-blue-900/5" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            variants={pageStagger}
            initial="hidden"
            animate="show"
            className="mx-auto max-w-3xl text-center"
          >
            <motion.h1
              variants={pageRise}
              className="text-balance text-4xl font-black leading-[1.02] tracking-[-0.03em] text-blue-900 sm:text-5xl md:text-6xl"
            >
              Self-Service Bay Membership
            </motion.h1>
            <motion.p
              variants={pageRise}
              className="mt-5 text-lg text-slate-600 md:text-xl"
            >
              DIY car wash — from {usd(BAY_MINIMUM_CASH)} a visit with coins, or
              unlimited daily access for just $19.99/month
            </motion.p>
            <motion.p
              variants={pageRise}
              className="mt-2 text-lg font-bold text-blue-900"
            >
              That's only $0.67 per day when you subscribe
            </motion.p>
            <motion.ul
              variants={pageRise}
              className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-600"
            >
              {["Use once per day", "Cancel anytime", "Professional equipment"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle
                      className="h-4 w-4 text-green-600"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                )
              )}
            </motion.ul>
          </motion.div>
        </div>
      </section>

      {/* Pricing Comparison Section - NEW */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-blue-900 mb-8">
              Pay-Per-Use vs. Membership
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Pay Per Use */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col rounded-xl border-2 border-slate-200 bg-slate-50 p-6"
              >
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">
                    Pay-per-use
                  </h3>
                  <div className="text-4xl font-bold text-slate-900">
                    from {usd(BAY_MINIMUM_CASH)}
                  </div>
                  <p className="text-slate-600 text-sm">
                    with coins &middot; {usd(BAY_MINIMUM_CARD)} with tap-to-pay
                  </p>
                </div>
                <ul className="flex-1 space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700">
                      {usd(BAY_MINIMUM_CASH)} minimum with quarters or dollar
                      coins &mdash; the machine takes both
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700">
                      {usd(BAY_MINIMUM_CARD)} minimum with tap-to-pay
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700">
                      Most customers spend about {usd(BAY_AVERAGE_SPEND)} a
                      visit &mdash; you pay only for the time you use
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gray-600 mt-0.5 shrink-0" />
                    <span className="text-slate-700">No commitment needed</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-slate-700">Higher cost per wash</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <X className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-slate-700">
                      No daily wash guarantee
                    </span>
                  </li>
                </ul>
                <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <Info
                    className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-relaxed text-slate-800">
                    <strong className="text-amber-800">
                      Paying by card? Your bank places a temporary{" "}
                      {usd(BAY_CARD_HOLD)} hold.
                    </strong>{" "}
                    Whatever you don&apos;t spend is released in{" "}
                    {BAY_CARD_HOLD_RELEASE}. It is an authorization from your
                    bank, not a charge from us, and we can&apos;t release it any
                    sooner. Paying with coins avoids the hold entirely.
                  </p>
                </div>

                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-slate-800">
                    <strong className="text-red-600">
                      4 visits a month at the {usd(BAY_AVERAGE_SPEND)} average:
                      about {usd(BAY_AVERAGE_SPEND * 4)}
                    </strong>
                    <br />
                    <span className="text-red-600 text-xs font-semibold">
                      Roughly {usd(BAY_AVERAGE_SPEND * 4 - 20)} more than the
                      membership
                    </span>
                  </p>
                </div>
              </motion.div>

              {/* Membership - Highlighted */}
              {loading ? (
                <LoadingDots />
              ) : plan ? (
                <>
                  <div className="border-4 rounded-xl border-yellow-400 shadow-xl">
                    <PricingCard
                      plan={plan}
                      pricing="monthly"
                      subscription={subscription}
                      handleCheckout={handleCheckout}
                    />
                  </div>
                  <AuthPromptModal
                    open={authOpen}
                    onClose={() => setAuthOpen(false)}
                    next={`/dashboard/pricing/self-service-cart`}
                  />
                  {/* Daily usage info below the card - only show for logged in users with active subscription */}
                  {user && subscription && (
                    <div className="mt-6 p-6 bg-white rounded-lg border border-slate-200 shadow-sm">
                      <p className="font-semibold text-slate-900 mb-2">
                        Status: <span className="text-green-600">Active</span>
                      </p>
                      <p className="text-slate-600 text-sm mb-2">
                        Started:{" "}
                        {new Date(subscription.started_at).toLocaleDateString()}
                      </p>
                      <p className="text-slate-600 text-sm mb-4">
                        {usedToday ? (
                          <span className="text-green-600 font-medium">
                            ✓ Used today
                          </span>
                        ) : (
                          <span className="text-slate-500">
                            Not used yet today
                          </span>
                        )}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full border-blue-900 text-blue-900 hover:bg-blue-50"
                        onClick={() =>
                          router.push("/dashboard/selfservice/use")
                        }
                      >
                        Log a Visit
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-600">Loading plan information...</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Service Bay Image Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl max-w-5xl mx-auto"
          >
            {/* Was a stock Unsplash photo of someone else's wash, captioned as
                if it were this location. Swapped for the real bay photograph
                already in /public. */}
            <div className="relative h-100 w-full md:h-125">
              <Image
                src="/self-service-wash-1.jpg"
                alt="A self-service wash bay at The Launch Pad in Houston"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
            <div className="absolute inset-0 bg-linear-to-t from-blue-900/80 via-blue-900/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                Your Personal Wash Bay Awaits
              </h2>
              <p className="text-lg md:text-xl text-blue-50">
                State-of-the-art equipment • Clean facilities • Available 7 days
                a week
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-blue-900 mb-12">
            Why Choose Self-Service Membership?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center p-6"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-blue-900" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Incredible Savings
              </h3>
              <p className="text-slate-600">
                Pay just $19.99/month for unlimited daily 10-minute washes.
                That's only{" "}
                <strong className="text-blue-900">¢0.67 per day</strong> — way
                cheaper than 10 per visit!
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center p-6"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-900" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                On Your Schedule
              </h3>
              <p className="text-slate-600">
                Wash whenever you want, once per day. No appointments needed, no
                waiting in line. Your bay is ready when you are.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center p-6"
            >
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-900" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Pro Equipment
              </h3>
              <p className="text-slate-600">
                Access the same high-quality equipment used by professionals,
                including high-pressure wash, foam brush, and spot-free rinse.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-blue-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-blue-900 mb-12">
            How It Works
          </h2>
          <div className="max-w-3xl mx-auto space-y-6">
            {[
              {
                step: 1,
                title: "Sign Up",
                description:
                  "Create your account and subscribe to the Self-Service Bay membership for $19.99/month",
              },
              {
                step: 2,
                title: "Visit Anytime",
                description:
                  "Come to our facility once per day, any day of the week from 9:30AM to 6:30PM",
              },
              {
                step: 3,
                title: "Wash & Go",
                description:
                  "Use our professional equipment for 10 minutes to wash, rinse, and detail your car",
              },
              {
                step: 4,
                title: "Repeat Daily",
                description:
                  "Return tomorrow for another wash - it's all included! Just $0.67 per day.",
              },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * item.step }}
                className="flex gap-4 items-start p-6 rounded-lg bg-white border border-blue-100 shadow-sm"
              >
                <div className="bg-blue-900 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-slate-600">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Save Big?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join hundreds of members who keep their cars spotless for just
              $0.67/day with our Self-Service Bay membership
            </p>
            <Button
              size="lg"
              className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-lg px-8 py-6 rounded-full shadow-xl hover:scale-105 transition-transform"
              onClick={() => handleCheckout(plan?.id || "")}
            >
              {user && subscription
                ? "Manage Subscription"
                : "Start Your Membership Today"}
            </Button>
            <p className="text-blue-200 text-sm mt-4">
              Cancel anytime • No contracts • No hidden fees
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
