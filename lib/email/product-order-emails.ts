import { Resend } from "resend";
import {
  EMAIL_COLORS,
  FROM,
  SITE_URL,
  button,
  details,
  emailLayout,
  heading,
  money,
  paragraph,
  signoff,
  text,
} from "./layout";

const resend = new Resend(process.env.RESEND_API_KEY);

export const STORE_ADDRESS = "10410 S Main St, Houston, TX 77025";
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";
const ORDERS_URL = `${SITE_URL}/dashboard/orders`;

const FOOTER_NOTE = "You're getting this email because you placed an order on thelaunchpadwash.com.";

const C = EMAIL_COLORS;

interface OrderEmailItem {
  name: string;
  quantity: number;
  unit_price: number;
}

export interface BuiltEmail {
  subject: string;
  html: string;
}

/** The short order number the dashboard shows ("Order 1A2B3C4D"). */
function orderRef(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

const cell = `padding:10px 0;border-bottom:1px solid ${C.lineSoft};font-size:15px;vertical-align:top;`;

/** Body rows (one per item) for the itemized order table. Pure so it can be unit tested. */
export function orderItemsRowsHtml(items: OrderEmailItem[]): string {
  return items
    .map(
      (i) => `<tr>
      <td style="${cell}color:${C.ink};font-weight:600;">${text(i.name)}</td>
      <td align="center" style="${cell}color:${C.inkMuted};white-space:nowrap;">&times;${i.quantity}</td>
      <td align="right" style="${cell}color:${C.ink};white-space:nowrap;">${money(i.unit_price * i.quantity)}</td>
    </tr>`,
    )
    .join("\n");
}

/** The order as a real data table: column headers, item rows, then totals. */
function orderItemsTable(args: {
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
}): string {
  const th = `padding:0 0 8px;border-bottom:1px solid ${C.line};font-size:13px;font-weight:600;color:${C.inkMuted};`;
  const totalRow = (label: string, value: string, strong = false) => `<tr>
      <th scope="row" colspan="2" align="left" style="padding:${strong ? "10px" : "6px"} 0 0;font-size:${strong ? "16px" : "14px"};font-weight:${strong ? "900" : "500"};color:${strong ? C.ink : C.inkMuted};">${label}</th>
      <td align="right" style="padding:${strong ? "10px" : "6px"} 0 0;font-size:${strong ? "18px" : "15px"};font-weight:${strong ? "900" : "600"};color:${C.ink};white-space:nowrap;">${value}</td>
    </tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-collapse:collapse;">
  <caption style="text-align:left;padding:0 0 8px;font-size:18px;font-weight:800;color:${C.ink};">Your order</caption>
  <thead>
    <tr>
      <th scope="col" align="left" style="${th}">Item</th>
      <th scope="col" align="center" style="${th}">Qty</th>
      <th scope="col" align="right" style="${th}">Price</th>
    </tr>
  </thead>
  <tbody>
    ${orderItemsRowsHtml(args.items)}
  </tbody>
  <tfoot>
    ${totalRow("Subtotal", money(args.subtotal))}
    ${args.deliveryFee > 0 ? totalRow("Delivery fee", money(args.deliveryFee)) : ""}
    ${totalRow("Total", money(args.total), true)}
  </tfoot>
</table>`;
}

async function send(to: string, { subject, html }: BuiltEmail, label: string) {
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error(`[email] ${label} send error:`, error);
  else console.log(`[email] ${label} email sent to:`, to);
}

type ConfirmationArgs = {
  to: string;
  name: string;
  orderId: string;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfillmentMethod: "pickup" | "delivery";
};

export function buildProductOrderConfirmationEmail(args: ConfirmationArgs): BuiltEmail {
  const isDelivery = args.fulfillmentMethod === "delivery";
  const ref = orderRef(args.orderId);
  const nextStep = isDelivery
    ? paragraph(`We're getting your order ready now. We'll email you again when it's <strong>out for delivery</strong> to the address you gave at checkout.`)
    : paragraph(`We're getting your order ready now. We'll email you again when it's <strong>ready for pickup</strong> at ${text(STORE_ADDRESS)}.`);
  const body = [
    heading("Your order is confirmed"),
    paragraph(`Hi ${text(args.name)}, thanks for your order. Here's what you bought.`),
    details([
      ["Order", text(ref)],
      ["Fulfillment", isDelivery ? "Local delivery" : "Pickup at the store"],
    ]),
    orderItemsTable(args),
    nextStep,
    button(ORDERS_URL, "Track your order"),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} is confirmed`,
    html: emailLayout({
      title: "Your order is confirmed",
      preheader: `Order ${ref}, ${money(args.total)}. We'll let you know when it's ${isDelivery ? "on its way" : "ready for pickup"}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

type StatusArgs = { to: string; name: string; orderId: string };

export function buildProductOrderReadyForPickupEmail(args: StatusArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const body = [
    heading("Your order is ready for pickup"),
    paragraph(`Hi ${text(args.name)}, your order is packed and waiting for you at The Launch Pad.`),
    details([
      ["Order", text(ref)],
      ["Pick up at", text(STORE_ADDRESS)],
    ]),
    button(DIRECTIONS_URL, "Get directions"),
    paragraph(`You can see your order any time in <a href="${ORDERS_URL}">your dashboard</a>.`, { muted: true, small: true }),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} is ready for pickup`,
    html: emailLayout({
      title: "Your order is ready for pickup",
      preheader: `Order ${ref} is waiting for you at ${STORE_ADDRESS}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

export function buildProductOrderOutForDeliveryEmail(args: StatusArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const body = [
    heading("Your order is on its way"),
    paragraph(`Hi ${text(args.name)}, your order has left The Launch Pad and is headed to the address you gave at checkout.`),
    details([
      ["Order", text(ref)],
      ["Status", "Out for delivery"],
    ]),
    button(ORDERS_URL, "Track your order"),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} is out for delivery`,
    html: emailLayout({
      title: "Your order is on its way",
      preheader: `Order ${ref} is out for delivery.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

export function buildProductOrderRefundedEmail(args: StatusArgs & { total: number }): BuiltEmail {
  const ref = orderRef(args.orderId);
  const body = [
    heading("Your order has been refunded"),
    paragraph(`Hi ${text(args.name)}, we've refunded your order to the card you paid with.`),
    details(
      [
        ["Order", text(ref)],
        ["Refunded", money(args.total)],
      ],
      { emphasizeLast: true },
    ),
    paragraph(`Depending on your bank, it can take 5&ndash;10 business days to show on your statement.`),
    paragraph(
      `Questions about this refund? Call us at <a href="tel:+18322198320">(832) 219-8320</a> or email <a href="mailto:info@thelaunchpadwash.com">info@thelaunchpadwash.com</a>.`,
    ),
    button(ORDERS_URL, "View your orders"),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} has been refunded`,
    html: emailLayout({
      title: "Your order has been refunded",
      preheader: `We've refunded ${money(args.total)} for order ${ref}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

export async function sendProductOrderConfirmationEmail(args: ConfirmationArgs) {
  await send(args.to, buildProductOrderConfirmationEmail(args), "product order confirmation");
}

export async function sendProductOrderReadyForPickupEmail(args: StatusArgs) {
  await send(args.to, buildProductOrderReadyForPickupEmail(args), "ready for pickup");
}

export async function sendProductOrderOutForDeliveryEmail(args: StatusArgs) {
  await send(args.to, buildProductOrderOutForDeliveryEmail(args), "out for delivery");
}

export async function sendProductOrderRefundedEmail(args: StatusArgs & { total: number }) {
  await send(args.to, buildProductOrderRefundedEmail(args), "order refunded");
}
