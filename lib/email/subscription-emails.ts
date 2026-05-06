import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "The Launch Pad Wash <noreply@thelaunchpadwash.com>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.thelaunchpadwash.com";

// Shared base styles reused across all three emails
const BASE_STYLES = `
  body { margin:0; padding:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',sans-serif; background:#f8f8f8; }
  .wrap { max-width:600px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08); }
  .header { padding:40px 24px; text-align:center; color:#ffffff; }
  .header h1 { margin:0; font-size:26px; font-weight:700; line-height:1.2; }
  .header p { margin:10px 0 0; font-size:15px; opacity:0.92; }
  .body { padding:36px 32px; }
  .body p { font-size:15px; color:#374151; line-height:1.6; margin:0 0 16px; }
  .card { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:20px 24px; margin:20px 0; }
  .card p { margin:0; font-size:14px; color:#6b7280; line-height:1.6; }
  .btn { display:inline-block; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px; color:#ffffff !important; }
  .cta { text-align:center; margin:28px 0; }
  .list { margin:16px 0; padding:0; list-style:none; }
  .list li { display:flex; align-items:flex-start; gap:10px; font-size:14px; color:#4b5563; line-height:1.6; margin-bottom:10px; }
  .footer { padding:20px 32px; background:#f9fafb; border-top:1px solid #e5e7eb; text-align:center; font-size:12px; color:#9ca3af; line-height:1.6; }
  .footer a { color:#6b7280; }
  @media(max-width:600px){ .body{padding:24px 20px;} .header{padding:32px 20px;} }
`;

function emailWrapper(headerBg: string, headerContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f8f8f8;">
    <tr><td align="center" style="padding:20px 0;">
      <table cellpadding="0" cellspacing="0" border="0" class="wrap">
        <tr><td class="header" style="background:${headerBg};">${headerContent}</td></tr>
        <tr><td class="body">${bodyContent}</td></tr>
        <tr>
          <td class="footer">
            <p style="margin:0;">The Launch Pad Wash &nbsp;·&nbsp; <a href="${SITE_URL}">thelaunchpadwash.com</a></p>
            <p style="margin:6px 0 0;">This is an automated notification about your subscription.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 1. PAYMENT FAILED — update card urgency email
// ─────────────────────────────────────────────────────────────
export async function sendPaymentFailedEmail({
  to,
  name,
  attemptCount,
}: {
  to: string;
  name: string;
  attemptCount?: number;
}) {
  const isLastAttempt = (attemptCount ?? 1) >= 3;
  const updateUrl = `${SITE_URL}/dashboard/billing`;

  const header = `
    <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
    <h1>Payment Failed</h1>
    <p>${isLastAttempt ? "Final notice — action required today" : "We couldn't charge your card"}</p>
  `;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>
      We attempted to process your monthly subscription payment but were unable to
      complete the charge. To keep your Express Detailing benefits active, please
      update your payment method as soon as possible.
    </p>

    <div class="card" style="border-left:4px solid #ef4444;">
      <p><strong style="color:#ef4444;">What happens if you don't act:</strong></p>
      <ul class="list" style="margin-top:10px;">
        <li><span>❌</span> Your subscription will be suspended after failed retries</li>
        <li><span>❌</span> You'll lose access to unlimited express washes</li>
        <li><span>❌</span> Your family vehicle discounts will be removed</li>
      </ul>
    </div>

    <div class="cta">
      <a href="${updateUrl}" class="btn" style="background:linear-gradient(135deg,#ef4444,#dc2626);">
        Update Payment Method
      </a>
    </div>

    <p style="font-size:14px;color:#6b7280;text-align:center;">
      Takes less than a minute. Your subscription resumes immediately after a
      successful charge.
    </p>

    <p>If you have any questions, just reply to this email or visit our
      <a href="${SITE_URL}/contact" style="color:#1d4ed8;">support page</a>.
      We're happy to help.
    </p>

    <p>— The Launch Pad Wash Team 🚀</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: isLastAttempt
      ? "🚨 Final notice: Your subscription will be cancelled — update your card now"
      : "⚠️ Action needed: Your payment failed — update your card",
    html: emailWrapper(
      "linear-gradient(135deg,#ef4444 0%,#b91c1c 100%)",
      header,
      body
    ),
  });

  if (error) console.error("[email] payment failed send error:", error);
  else console.log("[email] payment failed email sent to:", to);
}

// ─────────────────────────────────────────────────────────────
// 2. CANCELLATION SCHEDULED — retention email
// ─────────────────────────────────────────────────────────────
export async function sendCancellationScheduledEmail({
  to,
  name,
  periodEndDate,
}: {
  to: string;
  name: string;
  periodEndDate: string; // human-readable e.g. "June 15, 2025"
}) {
  const billingUrl = `${SITE_URL}/dashboard/billing`;

  const header = `
    <div style="font-size:48px;margin-bottom:12px;">😢</div>
    <h1>We'll Miss You</h1>
    <p>Your plan is scheduled to cancel on ${periodEndDate}</p>
  `;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>
      You've requested to cancel your Express Detailing subscription. We completely
      understand — and we want to make sure you know you still have full access
      until <strong>${periodEndDate}</strong>.
    </p>

    <div class="card">
      <p><strong>What you'll lose when your plan ends:</strong></p>
      <ul class="list" style="margin-top:10px;">
        <li><span>🚗</span> Unlimited express car washes every month</li>
        <li><span>💰</span> 35% family discount on additional vehicles</li>
        <li><span>⚡</span> Priority service — skip the regular queue</li>
        <li><span>📅</span> Flexible walk-in bookings — no appointment needed</li>
      </ul>
    </div>

    <p>
      Changed your mind? You can keep your subscription active with one click —
      no re-enrollment needed, and your vehicles stay linked.
    </p>

    <div class="cta">
      <a href="${billingUrl}" class="btn" style="background:linear-gradient(135deg,#1d4ed8,#1e40af);">
        Keep My Subscription
      </a>
    </div>

    <p style="font-size:14px;color:#6b7280;text-align:center;">
      Your plan is still active until ${periodEndDate}. You can reactivate anytime
      before then from your billing page.
    </p>

    <p>
      If there's something we could have done better, we'd genuinely love to hear it.
      Just reply to this email — your feedback helps us improve.
    </p>

    <p>— The Launch Pad Wash Team 🚀</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `Your plan ends ${periodEndDate} — keep your subscription active`,
    html: emailWrapper(
      "linear-gradient(135deg,#1d4ed8 0%,#1e3a8a 100%)",
      header,
      body
    ),
  });

  if (error) console.error("[email] cancellation scheduled send error:", error);
  else console.log("[email] cancellation scheduled email sent to:", to);
}

// ─────────────────────────────────────────────────────────────
// 3. SUBSCRIPTION CANCELLED — win-back email
// ─────────────────────────────────────────────────────────────
export async function sendSubscriptionCancelledEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const plansUrl = `${SITE_URL}/dashboard/pricing`;

  const header = `
    <div style="font-size:48px;margin-bottom:12px;">👋</div>
    <h1>Your Subscription Has Ended</h1>
    <p>We hope to see you again soon</p>
  `;

  const body = `
    <p>Hi <strong>${name}</strong>,</p>
    <p>
      Your Express Detailing subscription has officially ended. We're grateful for
      the time you were a member — it was genuinely great having you.
    </p>

    <div class="card">
      <p><strong>What's waiting for you when you come back:</strong></p>
      <ul class="list" style="margin-top:10px;">
        <li><span>✨</span> <span><strong>Unlimited washes</strong> — keep your car spotless every week</span></li>
        <li><span>💸</span> <span><strong>Save vs. pay-per-wash</strong> — members save an average of $40/month</span></li>
        <li><span>👨‍👩‍👧</span> <span><strong>Family plan</strong> — add up to 4 extra vehicles at 35% off</span></li>
        <li><span>⚡</span> <span><strong>Priority service</strong> — no waiting in the regular line</span></li>
      </ul>
    </div>

    <p>
      Re-subscribing takes under a minute. Your vehicles and history are still
      saved — just pick a plan and you're back in.
    </p>

    <div class="cta">
      <a href="${plansUrl}" class="btn" style="background:linear-gradient(135deg,#059669,#047857);">
        View Plans &amp; Re-Subscribe
      </a>
    </div>

    <p style="font-size:14px;color:#6b7280;text-align:center;">
      No commitment required. Cancel anytime, just like before.
    </p>

    <p>
      We're always improving — if something could have been better, we'd love to know.
      Reply to this email and a real person will read it.
    </p>

    <p>Hope to see you back at the pad soon.</p>
    <p>— The Launch Pad Wash Team 🚀</p>
  `;

  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "Your Launch Pad subscription has ended — come back anytime 👋",
    html: emailWrapper(
      "linear-gradient(135deg,#374151 0%,#1f2937 100%)",
      header,
      body
    ),
  });

  if (error) console.error("[email] cancelled send error:", error);
  else console.log("[email] cancelled email sent to:", to);
}
