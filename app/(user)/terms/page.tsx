import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Terms of Service | The Launch Pad",
  description: "Terms of Service for The Launch Pad car wash services",
};

export default function TermsOfServicePage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last Modified: October 26, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8 p-6 bg-card">
          <p className="text-foreground leading-relaxed mb-4">
            This Terms of Service Agreement (this "Agreement") is a binding
            contract between you ("Customer," "you," or "your") and The Launch
            Pad ("The Launch Pad," "we," "us," or "our"). This Agreement governs
            your access to and use of our car-wash services, subscription plans,
            add-ons, and related offerings (collectively, the "Services").
          </p>
          <p className="text-foreground leading-relaxed mb-4">
            THIS AGREEMENT TAKES EFFECT WHEN YOU CLICK "ACCEPT," CREATE AN
            ACCOUNT, OR ACCESS OR USE THE SERVICES (the "Effective Date"). BY
            DOING SO YOU (A) ACKNOWLEDGE THAT YOU HAVE READ AND UNDERSTAND THIS
            AGREEMENT; (B) REPRESENT THAT YOU HAVE AUTHORITY TO ENTER IT; AND
            (C) AGREE TO BE LEGALLY BOUND BY IT. IF YOU DO NOT AGREE, DO NOT USE
            THE SERVICES.
          </p>
          <p className="text-foreground font-semibold">
            YOU ALSO AGREE TO THE ARBITRATION AGREEMENT AND CLASS ACTION WAIVER
            IN SECTION 9.3 (EXCEPT FOR MATTERS THAT MAY BE TAKEN TO SMALL CLAIMS
            COURT).
          </p>
        </Card>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              1. General Terms
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.1 Services; Accounts
                </h3>
                <p className="text-foreground leading-relaxed">
                  The Launch Pad provides drive-through and related car-wash
                  services (the "Services"). Customers may purchase a
                  Subscription (monthly or yearly) to access Services. Customers
                  may manage their account ("Account") and vehicle(s) by phone
                  at{" "}
                  <a
                    href="tel:832-219-8320"
                    className="text-primary hover:underline"
                  >
                    832-219-8320
                  </a>{" "}
                  or online at{" "}
                  <a
                    href="https://www.thelaunchpadwash.com"
                    className="text-primary hover:underline"
                  >
                    https://www.thelaunchpadwash.com
                  </a>
                  .
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.2 Location; Service Availability; Add-Ons; Products
                </h3>
                <p className="text-foreground leading-relaxed mb-3">
                  We operate a single car-wash location at 10410 Main St,
                  Houston, TX 77025. Hours, equipment availability, and service
                  uptime may vary (including for maintenance or weather). We
                  utilize biodegradable soaps, water-reclamation systems, and
                  other eco-friendly products across our Services.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  We may offer Add-Ons such as Interior Shampoo, Air Freshener,
                  and Deep Cleaning (availability, timing, and pricing may
                  vary).
                </p>
                <p className="text-foreground leading-relaxed">
                  We may sell Products including Interior Detailer Max; Ceramic
                  Wax Ultimate (Paint Protection); Interior Care Ceramic Wax;
                  Ultimate Exterior Care; Tire Shine Pro. We do not guarantee
                  that add-ons or products will be available at all times.
                  Additional charges may apply.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.3 Subscription Plans and Payments
                </h3>
                <p className="text-foreground leading-relaxed mb-3">
                  We offer Subscription plans in monthly or yearly terms.
                  Customers may choose to pay online (via our payment provider)
                  or pay cash on-site.
                </p>
                <ul className="space-y-3 text-foreground ml-4">
                  <li className="flex gap-3">
                    <span className="font-semibold min-w-fit">
                      AutoPay (Opt-In):
                    </span>
                    <span>
                      If you opt in to AutoPay, you authorize recurring charges
                      to your selected payment method each billing period until
                      you cancel under Section 5.2(c).
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold min-w-fit">
                      Manual Renewal:
                    </span>
                    <span>
                      If you do not opt in to AutoPay, your access ends at the
                      end of the current paid term unless you proactively pay
                      for the next term (online or cash).
                    </span>
                  </li>
                </ul>
                <p className="text-foreground leading-relaxed mt-3">
                  Payment is due at the start of each subscription term. If
                  payment is not received by the start of a new term, access is
                  paused until payment is made. Each vehicle requires its own
                  separate subscription.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.4 Acceptance; Compliance
                </h3>
                <p className="text-foreground leading-relaxed">
                  By using the Services, you agree this Agreement is enforceable
                  and that you will comply with all applicable laws and our
                  posted policies, which we may update under Section 4.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.5 Eligibility; Representations
                </h3>
                <p className="text-foreground leading-relaxed">
                  You represent and warrant that you are at least 18 years old,
                  are not prohibited from having an Account, are not using the
                  Services to compete with us, have authority to enter this
                  Agreement, will not infringe our intellectual property, and
                  will provide, at your cost, anything necessary to use the
                  Services.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.6 Use Guidelines; Vehicle Coverage
                </h3>
                <p className="text-foreground leading-relaxed mb-3">
                  We service all vehicle types supported by our equipment. You
                  are responsible for preparing your vehicle (e.g., removing or
                  securing loose accessories). For safety or
                  equipment-protection reasons, we may decline service or
                  propose an alternative if a vehicle condition poses risk
                  (e.g., exposed parts, leaks, unsecured racks, oversized
                  attachments).
                </p>
                <p className="text-foreground leading-relaxed">
                  Each subscription applies only to the specific registered
                  vehicle and is not transferable; additional vehicles require
                  separate subscriptions.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.7 Access Credentials
                </h3>
                <p className="text-foreground leading-relaxed">
                  You are responsible for safeguarding your login and other
                  credentials ("Access Credentials"). Do not share or sell them.
                  Notify us promptly of any unauthorized access or suspected
                  compromise.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  1.8 Environmental Practices; Green Wash Option
                </h3>
                <p className="text-foreground leading-relaxed">
                  We implement sustainability measures designed to reduce
                  environmental impact, including use of biodegradable soaps,
                  water-reclamation systems, and eco-friendly products in the
                  provision of Services. We also offer a Green Wash option that
                  uses 100% environmentally safe products and minimal water
                  consumption, subject to operational availability and
                  suitability for your vehicle and selected service package. The
                  Green Wash option may be unavailable due to supply
                  constraints, maintenance, weather, or equipment downtime.
                  Nothing in this Agreement guarantees any particular
                  environmental outcome or certification.
                </p>
              </div>
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              2. Violation; Termination
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  2.1 Investigation; Enforcement
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may investigate violations of this Agreement or law and
                  pursue available remedies, including cooperating with law
                  enforcement.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  2.2 Suspension; Cancellation
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may suspend access or cancel your subscription and
                  terminate this Agreement if you breach it (including
                  non-payment, misuse, or abuse).
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  2.3 Refusal of Service
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may refuse service or access to any person or vehicle at
                  any time for any lawful reason, including safety, equipment
                  limitations, or misuse.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              3. Fees, Payments, and Refunds
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  3.1 Fees
                </h3>
                <p className="text-foreground leading-relaxed">
                  You agree to pay the fees posted in our then-current pricing
                  (e.g.,{" "}
                  <a
                    href="https://www.thelaunchpadwash.com/pricing"
                    className="text-primary hover:underline"
                  >
                    https://www.thelaunchpadwash.com/pricing
                  </a>{" "}
                  or as otherwise provided), which may vary by subscription
                  term, add-on, or product and are subject to change under
                  Section 4.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  3.2 Payment Methods; Authorization; Taxes; Refunds
                </h3>
                <div className="space-y-3 text-foreground">
                  <div>
                    <p className="font-semibold mb-1">Payment Methods</p>
                    <p className="leading-relaxed">
                      You may pay online (processed by our payment provider) or
                      in cash on-site. If you opt in to AutoPay, you authorize
                      recurring charges to your selected payment method each
                      billing period until you cancel under Section 5.2(c). If
                      you do not opt in to AutoPay, no automatic charges occur
                      and you must proactively pay each new term.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Taxes</p>
                    <p className="leading-relaxed">
                      Prices are exclusive of applicable taxes; you are
                      responsible for all taxes, duties, and levies.
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold mb-1">Refunds</p>
                    <ul className="space-y-2 ml-4 mt-2">
                      <li className="flex gap-3">
                        <span className="font-semibold min-w-fit">
                          Individual Services:
                        </span>
                        <span>
                          Prepaid online appointments cancelled 2 or more hours
                          before the scheduled start time receive a full refund
                          to the original payment method. Cancellations made not
                          less than 24 hours before the scheduled start time and
                          no-shows are non-refundable.
                        </span>
                      </li>
                      <li className="flex gap-3">
                        <span className="font-semibold min-w-fit">
                          Subscriptions:
                        </span>
                        <span>
                          No refunds or credits for partial months or unused
                          time within a term. If we terminate an active, fully
                          paid subscription without cause, we may, in our
                          discretion, issue a prorated refund for the unused
                          portion of the current term only where required by
                          law.
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              4. Modifications
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  4.1 Changes to Services, Pricing, and Terms
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may modify Services, features, pricing, and this Agreement.
                  Modified terms are effective upon posting at
                  https://www.thelaunchpadwash.com/terms (or successor URL). We
                  will endeavor to provide at least seven (7) days' advance
                  notice of changes we reasonably anticipate may materially
                  reduce service levels. Continued use after the effective date
                  constitutes acceptance.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  4.2 Service Changes; No Liability
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may modify, suspend, or discontinue any Service or feature
                  temporarily or permanently. We are not liable for damages
                  resulting from such actions.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  4.3 Notices
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may notify you via the email tied to your Account (and any
                  other contact you provided). You are responsible for keeping
                  contact details current.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              5. Plan Changes and Cancellation
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  5.1 Upgrades / Downgrades
                </h3>
                <p className="text-foreground leading-relaxed">
                  Upgrades are charged immediately for the difference in plan
                  price; downgrades take effect at the next subscription term.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  5.2 Cancellation and Renewal
                </h3>
                <ul className="space-y-3 text-foreground">
                  <li className="flex gap-3">
                    <span className="font-semibold min-w-fit">
                      (a) Individual Services:
                    </span>
                    <span>
                      You may cancel a scheduled appointment at any time. If you
                      cancel 2+ hours before the scheduled start time, you will
                      receive a full refund if you prepaid online. Cancellations
                      under 2 hours and no-shows are non-refundable.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold min-w-fit">
                      (b) Subscriptions without AutoPay:
                    </span>
                    <span>
                      Your access ends at the close of the current paid monthly
                      or yearly term unless you proactively pay for the next
                      term (online or cash). If you request immediate
                      cancellation before the term ends, access ends
                      immediately; no refunds or credits apply (including
                      partial-month).
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold min-w-fit">
                      (c) AutoPay Subscriptions:
                    </span>
                    <span>
                      You may cancel at any time with 30 days' advance notice.
                      Cancellations can be submitted through our app or in
                      person at our location (10410 Main St, Houston, TX 77025).
                      AutoPay charges may continue through the 30-day notice
                      period; service remains available during that period. No
                      refunds or credits are issued for partial months. To avoid
                      the next recurring charge after the notice period, ensure
                      your notice is received at least 30 days before your next
                      billing date.
                    </span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  5.3 Account Deactivation; Data
                </h3>
                <p className="text-foreground leading-relaxed">
                  When a subscription ends or is cancelled, your Account may be
                  deactivated. You are responsible for preserving any
                  information you wish to retain. We may keep certain records
                  consistent with our Privacy Policy and legal obligations. You
                  may request deletion as described in our Privacy Policy.
                </p>
              </div>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              6. Disclaimer of Warranties
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  6.1 "As Is"
                </h3>
                <p className="text-foreground leading-relaxed font-semibold">
                  THE SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE." WE
                  DISCLAIM ALL WARRANTIES, EXPRESS, IMPLIED, AND STATUTORY,
                  INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
                  AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT ANY FEATURE OR
                  OUR LOCATION WILL BE AVAILABLE AT ALL TIMES.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  6.2 Assumption of Risk
                </h3>
                <p className="text-foreground leading-relaxed font-semibold">
                  YOU USE THE SERVICES AT YOUR OWN RISK. YOU ARE RESPONSIBLE FOR
                  ANY RESULTING LIABILITIES, DAMAGES, LOSSES, OR EXPENSES.
                </p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              7. Limitation of Liability
            </h2>
            <p className="text-foreground leading-relaxed font-semibold">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE LAUNCH PAD AND ITS
              OFFICERS, DIRECTORS, MANAGERS, EMPLOYEES, AND AGENTS SHALL NOT BE
              LIABLE FOR: (A) ANY CONSEQUENTIAL, INCIDENTAL, PUNITIVE,
              EXEMPLARY, SPECIAL, OR INDIRECT DAMAGES (INCLUDING LOST PROFITS,
              REVENUE, OR BUSINESS); OR (B) ANY AMOUNT EXCEEDING THREE TIMES
              YOUR MOST RECENT SUBSCRIPTION PAYMENT OR $100, WHICHEVER IS
              GREATER. THESE LIMITATIONS APPLY EVEN IF A LIMITED REMEDY FAILS OF
              ITS ESSENTIAL PURPOSE.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              8. Indemnification
            </h2>
            <p className="text-foreground leading-relaxed">
              You agree to indemnify and hold harmless The Launch Pad and its
              officers, directors, managers, employees, and agents from and
              against all claims, losses, damages, liabilities, and costs
              (including reasonable attorneys' fees) arising out of or related
              to (i) your breach of this Agreement, or (ii) your negligence,
              willful misconduct, or unauthorized use of the Services.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              9. Miscellaneous
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.1 Privacy Policy
                </h3>
                <p className="text-foreground leading-relaxed">
                  By using the Services and providing information, you
                  acknowledge and accept our Privacy Policy (available at
                  https://www.thelaunchpadwash.com/privacy-policy), including
                  our processing activities as described therein.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.2 Governing Law
                </h3>
                <p className="text-foreground leading-relaxed">
                  This Agreement and any claim relating to the Services are
                  governed by the laws of the State of Texas, without regard to
                  conflict-of-laws principles.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.3 Arbitration; Class Action Waiver
                </h3>
                <p className="text-foreground leading-relaxed mb-3 font-semibold">
                  EXCEPT FOR SMALL-CLAIMS MATTERS OR EQUITABLE RELIEF UNDER
                  SECTION 9.6, ANY DISPUTE BETWEEN YOU AND THE LAUNCH PAD WILL
                  BE RESOLVED BY BINDING ARBITRATION BEFORE A SINGLE ARBITRATOR
                  UNDER THE CURRENT RULES OF THE AMERICAN ARBITRATION
                  ASSOCIATION. THE FEDERAL ARBITRATION ACT GOVERNS
                  ARBITRABILITY.
                </p>
                <p className="text-foreground leading-relaxed mb-3">
                  TO OPT OUT, MAIL A WRITTEN NOTICE TO:
                </p>
                <div className="bg-muted p-4 rounded mb-3 text-foreground">
                  <p className="font-semibold">The Launch Pad</p>
                  <p>10410 Main St, Houston, TX 77025, United States</p>
                  <p className="mt-2 text-sm">
                    WITHIN 30 DAYS OF THE EFFECTIVE DATE, STATING YOU DO NOT
                    AGREE TO ARBITRATION.
                  </p>
                </div>
                <p className="text-foreground leading-relaxed font-semibold">
                  YOU ALSO AGREE NOT TO PARTICIPATE IN CLASS ACTIONS, CLASS-WIDE
                  ARBITRATION, REPRESENTATIVE CLAIMS, OR CONSOLIDATED CLAIMS
                  INVOLVING ANOTHER PERSON'S ACCOUNT IF WE ARE A PARTY. THE
                  ARBITRATOR MAY DECIDE ISSUES OF INTERPRETATION AND
                  ENFORCEABILITY OF THIS PROVISION.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.4 Severability
                </h3>
                <p className="text-foreground leading-relaxed">
                  If any provision is held invalid or unenforceable, it will be
                  modified to the minimum extent necessary to make it
                  enforceable, and the remainder will remain in full force.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.5 Entire Agreement
                </h3>
                <p className="text-foreground leading-relaxed">
                  This Agreement, together with posted policies referenced
                  herein (including pricing and the Privacy Policy), is the
                  entire agreement between you and us regarding the Services and
                  supersedes prior or contemporaneous understandings.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.6 Equitable Relief
                </h3>
                <p className="text-foreground leading-relaxed">
                  Notwithstanding Section 9.3, we may seek injunctive or other
                  equitable relief without bond or proof of damages.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.7 Assignment
                </h3>
                <p className="text-foreground leading-relaxed">
                  We may assign this Agreement in whole or part at any time. You
                  may not assign it without our prior written consent.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.8 Waiver
                </h3>
                <p className="text-foreground leading-relaxed">
                  A failure to enforce any provision is not a waiver of future
                  enforcement of that or any other provision.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.9 Headings
                </h3>
                <p className="text-foreground leading-relaxed">
                  Headings are for convenience only and do not affect
                  interpretation.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  9.10 Questions
                </h3>
                <p className="text-foreground leading-relaxed">
                  Questions about this Agreement:{" "}
                  <a
                    href="mailto:thelaunchpadht@gmail.com"
                    className="text-primary hover:underline"
                  >
                    thelaunchpadht@gmail.com
                  </a>{" "}
                  or{" "}
                  <a
                    href="tel:832-219-8320"
                    className="text-primary hover:underline"
                  >
                    832-219-8320
                  </a>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
