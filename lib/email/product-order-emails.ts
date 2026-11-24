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
  salutation,
  signoff,
  text,
} from "./layout";
import { PAID_VIA_LABEL, type PaidVia } from "@/lib/products/orderFlow";

const resend = new Resend(process.env.RESEND_API_KEY);

export const STORE_ADDRESS = "10410 S Main St, Houston, TX 77025";
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/?api=1&destination=10410+S+Main+St,+Houston,+TX+77025";
const ORDERS_URL = `${SITE_URL}/dashboard/orders`;

const FOOTER_NOTE = "You are receiving this email because you placed an order on thelaunchpadwash.com.";

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

const cell = `padding:11px 0;border-bottom:1px solid ${C.rule};font-size:14px;vertical-align:top;`;

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
      <th scope="row" colspan="2" align="left" style="padding:${strong ? "10px" : "6px"} 0 0;font-size:${strong ? "15px" : "14px"};font-weight:${strong ? "600" : "400"};color:${strong ? C.night : C.inkMuted};">${label}</th>
      <td align="right" style="padding:${strong ? "10px" : "6px"} 0 0;font-size:${strong ? "16px" : "14px"};font-weight:${strong ? "600" : "500"};color:${C.night};white-space:nowrap;">${value}</td>
    </tr>`;
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-collapse:collapse;">
  <caption style="text-align:left;padding:0 0 8px;font-size:17px;font-weight:600;color:${C.night};">Your order</caption>
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
  /** store_settings.pickup_hours; null means not set, so no hours line. */
  pickupHours?: string | null;
};

/** The "Pickup hours" detail row, only when the owner has set them. */
function hoursRow(pickupHours: string | null | undefined): [string, string][] {
  return pickupHours ? [["Pickup hours", text(pickupHours)]] : [];
}

export function buildProductOrderConfirmationEmail(args: ConfirmationArgs): BuiltEmail {
  const isDelivery = args.fulfillmentMethod === "delivery";
  const ref = orderRef(args.orderId);
  const nextStep = isDelivery
    ? paragraph(`We are preparing your order now and will email you again when it is <strong>out for delivery</strong> to the address you gave at checkout.`)
    : paragraph(`Paid. We are preparing your order now and will email you again when it is <strong>ready for pickup</strong> at ${text(STORE_ADDRESS)}.`);
  const body = [
    heading("Your order is confirmed"),
    salutation(args.name),
    paragraph("Thank you for your order. The details are below."),
    details([
      ["Order", text(ref)],
      ["Fulfillment", isDelivery ? "Local delivery" : "Pickup at the store"],
      ...(isDelivery ? [] : hoursRow(args.pickupHours)),
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
      preheader: `Order ${ref}, ${money(args.total)}. We will let you know when it is ${isDelivery ? "on its way" : "ready for pickup"}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

type StatusArgs = { to: string; name: string; orderId: string };

type ReadyArgs = StatusArgs & {
  /** Set for an unpaid pay-at-store order: what to pay at the counter. */
  amountDue?: number | null;
  /** "Thu, Nov 26": the Houston date the hold lasts through. */
  holdDate?: string | null;
  pickupHours?: string | null;
};

export function buildProductOrderReadyForPickupEmail(args: ReadyArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const due = args.amountDue != null && args.amountDue > 0;
  const body = [
    heading("Your order is ready for pickup"),
    salutation(args.name),
    paragraph(`Your order is packed and ready to collect at The Launch Pad. Show reference <strong>${text(ref)}</strong> at the counter.`),
    ...(due
      ? [
          paragraph(
            `${money(args.amountDue!)} to pay at the counter (cash, card or QR).` +
              (args.holdDate ? ` We will hold it until ${text(args.holdDate)}.` : ""),
          ),
        ]
      : []),
    details([
      ["Order", text(ref)],
      ["Pick up at", text(STORE_ADDRESS)],
      ...hoursRow(args.pickupHours),
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
    salutation(args.name),
    paragraph("Your order has left The Launch Pad and is on its way to the address you gave at checkout."),
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

type RefundArgs = StatusArgs & { total: number; where?: "card" | "store" };

export function buildProductOrderRefundedEmail(args: RefundArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const atStore = args.where === "store";
  const body = [
    heading("Your order has been refunded"),
    salutation(args.name),
    paragraph(atStore ? "We have refunded your order at the store." : "We have refunded your order to the card you paid with."),
    details(
      [
        ["Order", text(ref)],
        ["Refunded", money(args.total)],
      ],
      { emphasizeLast: true },
    ),
    ...(atStore ? [] : [paragraph(`Depending on your bank, it can take 5&ndash;10 business days to show on your statement.`)]),
    paragraph(
      `Should you have any questions about this refund, please call us at <a href="tel:+18322198320">(832) 219-8320</a> or email <a href="mailto:info@thelaunchpadwash.com">info@thelaunchpadwash.com</a>.`,
    ),
    button(ORDERS_URL, "View your orders"),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} has been refunded`,
    html: emailLayout({
      title: "Your order has been refunded",
      preheader: `We have refunded ${money(args.total)} for order ${ref}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

const SHOP_URL = `${SITE_URL}/products`;

type ReservedArgs = StatusArgs & {
  items: OrderEmailItem[];
  subtotal: number;
  total: number;
  pickupHours: string | null;
};

/** Pay-at-store order placed: nothing charged yet. */
export function buildProductOrderReservedEmail(args: ReservedArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const body = [
    heading("Your order is reserved"),
    salutation(args.name),
    paragraph(`Reserved: pay ${money(args.total)} at the counter when you collect. We will email you when it is ready.`),
    details([
      ["Order", text(ref)],
      ["Pick up at", text(STORE_ADDRESS)],
      ...hoursRow(args.pickupHours),
    ]),
    orderItemsTable({ items: args.items, subtotal: args.subtotal, deliveryFee: 0, total: args.total }),
    button(ORDERS_URL, "Track your order"),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} is reserved`,
    html: emailLayout({
      title: "Your order is reserved",
      preheader: `Order ${ref}: pay ${money(args.total)} at the counter when you collect.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

type ReminderArgs = StatusArgs & { total: number; holdDate: string; pickupHours: string | null };

/** The Houston day before an unpaid reservation's hold ends. */
export function buildProductOrderHoldReminderEmail(args: ReminderArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const body = [
    heading("Your order is waiting for you"),
    salutation(args.name),
    paragraph(
      `Your order is held until tomorrow, ${text(args.holdDate)}. Pay ${money(args.total)} at the counter when you collect, and show reference <strong>${text(ref)}</strong>.`,
    ),
    details([
      ["Order", text(ref)],
      ["Pick up at", text(STORE_ADDRESS)],
      ...hoursRow(args.pickupHours),
    ]),
    button(DIRECTIONS_URL, "Get directions"),
    paragraph(`Changed your mind? You can cancel the reservation in <a href="${ORDERS_URL}">your orders</a>.`, { muted: true, small: true }),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref} is held until tomorrow`,
    html: emailLayout({
      title: "Your order is waiting for you",
      preheader: `Order ${ref} is held until tomorrow, ${args.holdDate}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

type ReleasedArgs = StatusArgs & { byCustomer: boolean };

/** Unpaid reservation released (hold ended, staff, or the customer cancelled). */
export function buildProductOrderReleasedEmail(args: ReleasedArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const lead = args.byCustomer
    ? `You cancelled reservation ${text(ref)}. Nothing was charged.`
    : `We have released your reservation. Nothing was charged.`;
  const body = [
    heading(args.byCustomer ? "Your reservation is cancelled" : "Your reservation has been released"),
    salutation(args.name),
    paragraph(lead),
    details([["Order", text(ref)]]),
    button(SHOP_URL, "Shop products"),
    signoff(),
  ].join("\n");
  return {
    subject: args.byCustomer ? `Your Launch Pad reservation ${ref} is cancelled` : `Your Launch Pad reservation ${ref} has been released`,
    html: emailLayout({
      title: args.byCustomer ? "Your reservation is cancelled" : "Your reservation has been released",
      preheader: `Order ${ref}. Nothing was charged.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

type CollectedArgs = StatusArgs & { items: OrderEmailItem[]; total: number; paidVia: PaidVia };

/** Handed over at the counter: a receipt. */
export function buildProductOrderCollectedEmail(args: CollectedArgs): BuiltEmail {
  const ref = orderRef(args.orderId);
  const body = [
    heading("Thanks for picking up your order"),
    salutation(args.name),
    paragraph("Here is your receipt."),
    details([
      ["Order", text(ref)],
      ["Paid by", PAID_VIA_LABEL[args.paidVia] ?? "Card"],
    ]),
    orderItemsTable({ items: args.items, subtotal: args.total, deliveryFee: 0, total: args.total }),
    button(ORDERS_URL, "View your orders"),
    signoff(),
  ].join("\n");
  return {
    subject: `Your Launch Pad order ${ref}: receipt`,
    html: emailLayout({
      title: "Thanks for picking up your order",
      preheader: `Receipt for order ${ref}, ${money(args.total)}.`,
      body,
      footerNote: FOOTER_NOTE,
    }),
  };
}

export async function sendProductOrderReservedEmail(args: ReservedArgs) {
  await send(args.to, buildProductOrderReservedEmail(args), "order reserved");
}

export async function sendProductOrderHoldReminderEmail(args: ReminderArgs) {
  await send(args.to, buildProductOrderHoldReminderEmail(args), "hold reminder");
}

export async function sendProductOrderReleasedEmail(args: ReleasedArgs) {
  await send(args.to, buildProductOrderReleasedEmail(args), "reservation released");
}

export async function sendProductOrderCollectedEmail(args: CollectedArgs) {
  await send(args.to, buildProductOrderCollectedEmail(args), "order collected");
}

export async function sendProductOrderConfirmationEmail(args: ConfirmationArgs) {
  await send(args.to, buildProductOrderConfirmationEmail(args), "product order confirmation");
}

export async function sendProductOrderReadyForPickupEmail(args: ReadyArgs) {
  await send(args.to, buildProductOrderReadyForPickupEmail(args), "ready for pickup");
}

export async function sendProductOrderOutForDeliveryEmail(args: StatusArgs) {
  await send(args.to, buildProductOrderOutForDeliveryEmail(args), "out for delivery");
}

export async function sendProductOrderRefundedEmail(args: RefundArgs) {
  await send(args.to, buildProductOrderRefundedEmail(args), "order refunded");
}
