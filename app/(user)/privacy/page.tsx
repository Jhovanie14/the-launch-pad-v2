import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Privacy Policy | The Launch Pad",
  description: "Privacy Policy for The Launch Pad car wash services",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 text-foreground">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last Modified: October 26, 2025
          </p>
        </div>

        {/* Introduction */}
        <Card className="mb-8 p-6 bg-card">
          <p className="text-foreground leading-relaxed">
            This Privacy Policy describes how The Launch Pad ("The Launch Pad,"
            "we," "us," or "our") collects, uses, discloses, and safeguards
            information when individuals ("you" or "users") create an account,
            purchase or manage a subscription, select services or add-ons, and
            otherwise use our online services at{" "}
            <a
              href="https://www.thelaunchpadwash.com"
              className="text-primary hover:underline"
            >
              https://www.thelaunchpadwash.com
            </a>{" "}
            (the "Website"). By accessing the Website or maintaining an account,
            you acknowledge and consent to the practices described herein.
          </p>
        </Card>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              1. Children's Privacy
            </h2>
            <p className="text-foreground leading-relaxed">
              Our Website and services are not directed to individuals under 16
              years of age, and we do not knowingly collect personal information
              from minors. If you believe a minor has provided personal
              information to us, please contact us promptly so we may delete it.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              2. Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  2.1 Information You Provide (Account and Transactions)
                </h3>
                <p className="text-foreground leading-relaxed">
                  When you register, sign in, subscribe, or manage services, you
                  may provide: your full name; email address and password
                  (account credentials); payment information (including
                  cardholder name and card details processed through our payment
                  provider); country or region; vehicle information (year, make,
                  model, color); subscription selections; add-on selections;
                  license plate number (optional, for vehicle identification);
                  and appointment date and time (where applicable).
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  2.2 Information Collected Automatically
                </h3>
                <p className="text-foreground leading-relaxed">
                  When you access the Website, we may automatically collect
                  technical and usage information, including IP address, device
                  identifiers, browser type and version, operating system, pages
                  viewed, session duration, referring URLs, and related
                  analytics data. We utilize cookies and similar technologies to
                  support authentication, maintain session state, enhance
                  performance, and improve security and user experience.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              3. Cookies and Similar Technologies
            </h2>
            <p className="text-foreground leading-relaxed">
              We use cookies, pixels, and local storage to: keep you signed in;
              remember preferences (e.g., saved vehicle details); support secure
              payment sessions; and analyze traffic and performance. You may
              control cookies via your browser settings; however, disabling
              cookies may impair certain Website functionality (including
              sign-in persistence and checkout).
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              4. How We Use Information
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              We process information for the following purposes:
            </p>
            <ul className="space-y-3 text-foreground">
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Account Administration:
                </span>
                <span>
                  to create, authenticate, and maintain user accounts.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Subscriptions and Payments:
                </span>
                <span>
                  to manage memberships, process transactions and renewals, and
                  provide invoices or confirmations.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Service Delivery:
                </span>
                <span>
                  to enable service selection, add-ons, appointment scheduling,
                  and related customer support.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">Communications:</span>
                <span>
                  to send service confirmations, essential notices, policy
                  updates, and—where permitted—limited marketing communications.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Integrity and Security:
                </span>
                <span>
                  to detect, investigate, and mitigate fraud, abuse, or security
                  incidents.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Improvement and Analytics:
                </span>
                <span>
                  to operate, optimize, and enhance the Website and our
                  offerings.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Legal Compliance:
                </span>
                <span>
                  to comply with applicable laws, regulations, and lawful
                  requests.
                </span>
              </li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4">
              We do not sell or rent personal information.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              5. Disclosure of Information
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              We disclose information only as reasonably necessary to operate
              our business and as permitted by law:
            </p>
            <ul className="space-y-3 text-foreground">
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Service Providers:
                </span>
                <span>
                  to vetted third parties that perform services on our behalf
                  (e.g., hosting, payments, analytics, customer support) under
                  contractual confidentiality and security obligations.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Legal and Compliance:
                </span>
                <span>
                  to courts, regulators, or law enforcement when required or
                  appropriate to comply with law or protect rights, safety, or
                  property.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Business Transactions:
                </span>
                <span>
                  to counterparties and advisors in connection with mergers,
                  acquisitions, or other corporate reorganizations, subject to
                  customary safeguards.
                </span>
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              6. Data Security
            </h2>
            <p className="text-foreground leading-relaxed">
              We implement reasonable administrative, technical, and physical
              safeguards designed to protect personal information against
              unauthorized access, alteration, disclosure, or destruction.
              Payment transactions are encrypted and handled by PCI-compliant
              processors. Despite our efforts, no method of transmission or
              storage is entirely secure; information is provided at your own
              risk.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              7. Data Retention
            </h2>
            <p className="text-foreground leading-relaxed">
              We retain personal information for as long as necessary to fulfill
              the purposes described in this Policy, including to provide
              services, comply with legal obligations, resolve disputes, and
              enforce agreements. Retention periods may vary based on the nature
              of the data and our regulatory or operational requirements.
            </p>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              8. Your Choices and Rights
            </h2>
            <p className="text-foreground leading-relaxed">
              You may review and update account details (including vehicle
              information, subscription, and add-ons) by logging into your
              account. You may opt out of marketing emails by using the
              unsubscribe link in those communications. You may also request
              access to or deletion of your personal information, subject to
              applicable legal and operational retention obligations. Requests
              may be submitted to the contact information below.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              9. Third-Party Links and Services
            </h2>
            <p className="text-foreground leading-relaxed">
              The Website may contain links to third-party sites or integrations
              (e.g., payment gateways, social media). Those sites are governed
              by their own privacy policies. We are not responsible for the
              content, security, or privacy practices of third parties.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              10. Your Texas Privacy Rights (TDPSA)
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              If you are a Texas resident, you may exercise the following rights
              with respect to your personal data, subject to applicable law:
            </p>
            <ul className="space-y-3 text-foreground mb-6">
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Right to Know/Access:
                </span>
                <span>
                  Request confirmation of whether we process your personal data
                  and access to such data.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Right to Correction:
                </span>
                <span>
                  Request correction of inaccuracies in your personal data.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Right to Deletion:
                </span>
                <span>Request deletion of your personal data.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Right to Data Portability:
                </span>
                <span>
                  Obtain a copy of your personal data in a portable and, to the
                  extent technically feasible, readily usable format.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Right to Opt Out:
                </span>
                <span>
                  Direct us to cease processing your personal data for (a)
                  targeted advertising, (b) the sale of personal data, or (c)
                  certain profiling that produces legal or similarly significant
                  effects. We honor recognized universal opt-out mechanisms
                  (e.g., Global Privacy Control) as required under Texas law.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-semibold min-w-fit">
                  Right to Appeal:
                </span>
                <span>
                  If we decline to act on your request, you may appeal; we will
                  respond to appeals within 60 days.
                </span>
              </li>
            </ul>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  How to Submit a Request:
                </h3>
                <p className="text-foreground leading-relaxed">
                  Email{" "}
                  <a
                    href="mailto:thelaunchpadht@gmail.com"
                    className="text-primary hover:underline"
                  >
                    thelaunchpadht@gmail.com
                  </a>{" "}
                  with the subject line "Texas Privacy Request" and indicate
                  which right(s) you wish to exercise. Certain preferences may
                  also be managed in your account.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Verification:
                </h3>
                <p className="text-foreground leading-relaxed">
                  To protect your information, we will take reasonable steps to
                  verify your identity (e.g., by matching account details)
                  before fulfilling a request. If we cannot verify your request,
                  we will explain why.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Timing and Fees:
                </h3>
                <p className="text-foreground leading-relaxed">
                  We will respond within 45 days of receiving your request. When
                  reasonably necessary, we may extend our response time once by
                  an additional 45 days and will notify you within the initial
                  period with the reason for the extension. We do not charge a
                  fee to process or respond to your request unless it is
                  excessive, repetitive, or manifestly unfounded.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  Authorized Agents:
                </h3>
                <p className="text-foreground leading-relaxed">
                  You may authorize an agent to submit an opt-out request on
                  your behalf, consistent with Texas requirements.
                </p>
              </div>
            </div>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              11. Changes to This Policy
            </h2>
            <p className="text-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. The updated
              version will be posted on this page with the "Last Modified" date
              revised accordingly. Your continued use of the Website after any
              update constitutes acceptance of the revised Policy.
            </p>
          </section>

          {/* Section 12 - Contact */}
          <section className="bg-muted p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              12. Contact Information
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              For questions, requests, or concerns regarding this Privacy
              Policy, please contact:
            </p>
            <div className="space-y-2 text-foreground">
              <p className="font-semibold">The Launch Pad</p>
              <p>10410 S Main St, Houston, TX 77025, United States</p>
              <p>
                Phone:{" "}
                <a
                  href="tel:832-219-8320"
                  className="text-primary hover:underline"
                >
                  832-219-8320
                </a>
              </p>
              <p>
                Email:{" "}
                <a
                  href="mailto:thelaunchpadht@gmail.com"
                  className="text-primary hover:underline"
                >
                  thelaunchpadht@gmail.com
                </a>
              </p>
              <p>
                Website:{" "}
                <a
                  href="https://www.thelaunchpadwash.com"
                  className="text-blue-600 hover:underline"
                >
                  https://www.thelaunchpadwash.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
