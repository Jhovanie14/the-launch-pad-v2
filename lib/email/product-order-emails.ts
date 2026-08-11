import { Resend } from "resend";
import { escapeHtml } from "./escapeHtml";
import { emailWrapper, FROM, SITE_URL } from "./subscription-emails";

const resend = new Resend(process.env.RESEND_API_KEY);

export const STORE_ADDRESS = "10410 S Main St, Houston, TX 77025";

const FOOTER_NOTE = "This is an automated notification about your product order.";

interface OrderEmailItem {
  name: string;
  quantity: number;
  unit_price: number;
}

/** Table rows for the itemized order summary. Pure so it can be unit tested. */
export function orderItemsRowsHtml(items: OrderEmailItem[]): string {
  return items
    .map(
      (i) => `
        <tr>
          <td style="padding:6px 0;">${escapeHtml(i.name)} <span style="color:#6b7280;">&times;${i.quantity}</span></td>
          <td style="padding:6px 0; text-align:right;">$${(i.unit_price * i.quantity).toFixed(2)}</td>
        </tr>`,
    )
    .join("");
}

function orderSummaryCard(args: {
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}): string {
  const feeRow =
    args.deliveryFee > 0
      ? `<tr><td style="padding:6px 0; color:#6b7280;">Delivery fee</td><td style="padding:6px 0; text-align:right;">$${args.deliveryFee.toFixed(2)}</td></tr>`
      : "";
  return `
    <div class="card">
      <table role="presentation" width="100%" style="border-collapse:collapse;">
        ${orderItemsRowsHtml(args.items)}
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb; padding:0;"></td></tr>
        <tr><td style="padding:6px 0; color:#6b7280;">Subtotal</td><td style="padding:6px 0; text-align:right;">$${args.subtotal.toFixed(2)}</td></tr>
        ${feeRow}
        <tr><td style="padding:6px 0; font-weight:bold;">Total</td><td style="padding:6px 0; text-align:right; font-weight:bold;">$${args.total.toFixed(2)}</td></tr>
      </table>
    </div>`;
}

async function send(to: string, subject: string, html: string, label: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error(`[email] ${label} send error:`, error);
  else console.log(`[email] ${label} email sent to:`, to);
}

export async function sendProductOrderConfirmationEmail(args: {
  to: string;
  name: string;
  orderId: string;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfillmentMethod: "pickup" | "delivery";
}) {
  const isDelivery = args.fulfillmentMethod === "delivery";
  const header = `<h1 style="margin:0; font-size:24px;">Order confirmed 🎉</h1>`;
  const nextStep = isDelivery
    ? `<p>We're getting your order ready. You'll get another email when it's <strong>out for delivery</strong>.</p>`
    : `<p>We're getting your order ready. You'll get another email when it's <strong>ready for pickup</strong> at:</p>
       <p style="font-weight:bold;">${STORE_ADDRESS}</p>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>Thanks for your purchase! Here's what you ordered:</p>
    ${orderSummaryCard(args)}
    ${nextStep}
    <p class="cta"><a class="btn" style="background:#1e3a8a;" href="${SITE_URL}/dashboard/orders">View your orders</a></p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "✅ Your Launch Pad order is confirmed",
    emailWrapper(
      "linear-gradient(135deg,#16a34a 0%,#15803d 100%)",
      header,
      body,
      FOOTER_NOTE,
    ),
    "product order confirmation",
  );
}

export async function sendProductOrderReadyForPickupEmail(args: {
  to: string;
  name: string;
  orderId: string;
}) {
  const header = `<h1 style="margin:0; font-size:24px;">Ready for pickup 📦</h1>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>Your order is ready! Come grab it whenever suits you at:</p>
    <p style="font-weight:bold;">${STORE_ADDRESS}</p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "📦 Your Launch Pad order is ready for pickup",
    emailWrapper(
      "linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)",
      header,
      body,
      FOOTER_NOTE,
    ),
    "ready for pickup",
  );
}

export async function sendProductOrderOutForDeliveryEmail(args: {
  to: string;
  name: string;
  orderId: string;
}) {
  const header = `<h1 style="margin:0; font-size:24px;">Out for delivery 🚚</h1>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>Your order is on its way to the address you gave at checkout.</p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "🚚 Your Launch Pad order is out for delivery",
    emailWrapper(
      "linear-gradient(135deg,#1e3a8a 0%,#1e40af 100%)",
      header,
      body,
      FOOTER_NOTE,
    ),
    "out for delivery",
  );
}

export async function sendProductOrderRefundedEmail(args: {
  to: string;
  name: string;
  orderId: string;
  total: number;
}) {
  const header = `<h1 style="margin:0; font-size:24px;">Order refunded</h1>`;
  const body = `
    <p>Hi ${escapeHtml(args.name)},</p>
    <p>We've refunded <strong>$${args.total.toFixed(2)}</strong> for your order. Depending on your bank it can take 5&ndash;10 business days to appear.</p>
    <p>If you have any questions, just reply to this email or call us at (832) 219-8320.</p>
    <p style="color:#6b7280; font-size:13px;">Order ID: ${escapeHtml(args.orderId)}</p>`;
  await send(
    args.to,
    "Your Launch Pad order has been refunded",
    emailWrapper(
      "linear-gradient(135deg,#6b7280 0%,#4b5563 100%)",
      header,
      body,
      FOOTER_NOTE,
    ),
    "order refunded",
  );
}
