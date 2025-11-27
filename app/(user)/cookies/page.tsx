export default function CookiePolicyPage() {
  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Cookie Policy
          </h1>
          <p className="text-muted-foreground">
            Last Updated: October 26, 2025
          </p>
        </div>

        {/* Introduction */}
        <div className="bg-card border border-border rounded-lg p-6 mb-8">
          <p className="text-foreground leading-relaxed">
            This Cookie Policy explains how The Launch Pad ("we," "us," or
            "our") uses cookies and similar technologies on{" "}
            <a
              href="https://www.thelaunchpadwash.com"
              className="text-primary hover:underline"
            >
              https://www.thelaunchpadwash.com
            </a>{" "}
            (the "Website"). It should be read together with our Privacy Policy.
            By continuing to browse or by selecting your preferences in our
            cookie banner, you consent to our use of cookies as described here.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              1. Purpose and Scope
            </h2>
            <p className="text-foreground leading-relaxed">
              This Cookie Policy explains how The Launch Pad ("we," "us," or
              "our") uses cookies and similar technologies on
              https://www.thelaunchpadwash.com (the "Website"). It should be
              read together with our Privacy Policy. By continuing to browse or
              by selecting your preferences in our cookie banner, you consent to
              our use of cookies as described here.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              2. What Are Cookies?
            </h2>
            <p className="text-foreground leading-relaxed">
              Cookies are small text files placed on your device when you visit
              a website. They are widely used to make sites work, remember
              preferences, maintain secure sessions, and analyze how services
              are used. Related technologies (e.g., local storage, pixels, SDKs,
              and tags) perform similar functions; we refer to all of these as
              "cookies."
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              3. Why We Use Cookies
            </h2>
            <p className="text-foreground mb-4">We use cookies to:</p>
            <ul className="list-disc list-inside space-y-2 text-foreground">
              <li>
                Authenticate and keep you signed in to your The Launch Pad
                account.
              </li>
              <li>
                Operate essential site features (e.g., checkout, subscription
                management, add-on selections).
              </li>
              <li>
                Remember your choices (e.g., saved vehicle details, plan
                preferences).
              </li>
              <li>Enhance security and help prevent fraud.</li>
              <li>Measure performance and improve the Website (analytics).</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              4. Categories of Cookies We Use
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Strictly Necessary (Essential)
                </h3>
                <p className="text-foreground">
                  Required for the Website to function (e.g., sign-in, payment
                  session, CSRF protection). These cannot be switched off.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Functional (Preferences)
                </h3>
                <p className="text-foreground">
                  Remember settings and choices (e.g., saved vehicle
                  year/make/model/color, region).
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Performance/Analytics
                </h3>
                <p className="text-foreground">
                  Help us understand usage so we can improve site speed,
                  navigation, and features.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Advertising/Targeting (if enabled)
                </h3>
                <p className="text-foreground">
                  Used to deliver or measure ads and limit repetition. We do not
                  use these unless and until we implement advertising partners;
                  if used, you will have the option to opt out.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              5. First-Party vs. Third-Party Cookies
            </h2>
            <div className="space-y-3">
              <p className="text-foreground">
                <strong>First-party cookies</strong> are set by The Launch Pad.
              </p>
              <p className="text-foreground">
                <strong>Third-party cookies</strong> are set by service
                providers who support our operations (for example: secure
                payment gateways, analytics providers, or tag managers). These
                providers may use cookies to deliver their services to us and to
                you, subject to their own policies.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              6. Examples of Cookies and Similar Technologies
            </h2>
            <p className="text-foreground mb-4">
              The exact names can vary by browser and device. This table
              provides typical examples.
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">
                      Category
                    </th>
                    <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">
                      Example Purposes
                    </th>
                    <th className="border border-border px-4 py-2 text-left font-semibold text-foreground">
                      Typical Lifespan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Strictly Necessary
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Session ID, account authentication, CSRF token, load
                      balancing
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Session to 1 year
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Functional
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Remember vehicle details, subscription/add-on choices,
                      region
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      1 month to 1 year
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Performance/Analytics
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Aggregate traffic stats, page timing, feature usage
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Session to 2 years
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Advertising/Targeting (if used)
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Ad measurement, frequency capping, interest-based segments
                    </td>
                    <td className="border border-border px-4 py-2 text-foreground">
                      Session to 13 months
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-foreground">
              <strong>Payment processing:</strong> Our payment provider may set
              cookies or use local storage to enable secure checkout, fraud
              prevention, and tokenization of card details.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              7. Managing Your Cookie Preferences
            </h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Cookie Banner/Settings
                </h3>
                <p className="text-foreground">
                  Use our on-site controls (when presented) to accept, reject,
                  or customize non-essential cookies.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Browser Controls
                </h3>
                <p className="text-foreground">
                  You can block or delete cookies via your browser settings. If
                  you block essential cookies, some features (e.g., login,
                  checkout) may not function.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Global Privacy Control (GPC)
                </h3>
                <p className="text-foreground">
                  If your browser sends a recognized universal opt-out signal,
                  we will treat it as a request to opt out of targeted
                  advertising cookies to the extent required by Texas law.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              8. Do Not Track
            </h2>
            <p className="text-foreground">
              Many browsers offer "Do Not Track" (DNT). There is no common
              industry standard for DNT. We will continue to review developments
              and, where legally required, honor recognized signals for targeted
              advertising opt-outs (e.g., GPC).
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              9. Texas Privacy Rights (Summary)
            </h2>
            <p className="text-foreground">
              Under the Texas Data Privacy and Security Act (TDPSA), Texas
              residents may opt out of the processing of personal data for
              targeted advertising or sale of personal data. If we implement
              advertising cookies, you will be able to exercise this choice
              through our cookie banner or by contacting us (see Section 11).
              For detailed TDPSA rights (access, correction, deletion,
              portability, appeal), please see Your Texas Privacy Rights in our
              Privacy Policy.
            </p>
          </section>

          {/* Section 10 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              10. Changes to This Cookie Policy
            </h2>
            <p className="text-foreground">
              We may update this Cookie Policy to reflect changes to our
              practices or for legal, operational, or regulatory reasons.
              Updates will be posted here with a new "Last Updated" date. Your
              continued use of the Website after updates constitutes acceptance.
            </p>
          </section>

          {/* Section 11 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              11. Contact Us
            </h2>
            <div className="bg-card border border-border rounded-lg p-6">
              <p className="text-foreground mb-4">
                For questions about this Cookie Policy or your cookie
                preferences, contact:
              </p>
              <div className="space-y-2 text-foreground">
                <p className="font-semibold">The Launch Pad</p>
                <p>10410 South Main St, Houston, TX 77025, United States</p>
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
                    className="text-primary hover:underline"
                  >
                    https://www.thelaunchpadwash.com
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
