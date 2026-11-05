import { describe, expect, it } from "vitest";
import {
  buildBookingConfirmationEmail,
  buildContactReplyEmail,
  buildReceiptEmail,
  buildTipEmail,
  formatCalendarDate,
  formatClockTime,
} from "./booking-emails";

const EVIL = '<img src=x onerror="alert(1)">';
const EMOJI = /\p{Extended_Pictographic}/u;
const FLAME_BUTTON = /background:#fec92f/g;

const emails = {
  confirmation: buildBookingConfirmationEmail({
    customerName: EVIL,
    bookingId: "1a2b3c4d-0000-4000-8000-000000000000",
    servicePackage: EVIL,
    appointmentDate: "2026-11-08",
    appointmentTime: "10:30:00",
    addOns: [EVIL, "Tire shine"],
  }),
  tip: buildTipEmail({ customerName: EVIL, bookingId: "1a2b3c4d-0000-4000-8000-000000000000" }),
  receipt: buildReceiptEmail({
    customerName: EVIL,
    bookingId: "1a2b3c4d-0000-4000-8000-000000000000",
    servicePackageName: EVIL,
    servicePackagePrice: 49.99,
    addOns: [{ name: EVIL, price: "10" }],
    totalPrice: 59.99,
    paymentMethod: EVIL,
    completedAt: "2026-11-08T18:00:00Z",
  }),
  contactReply: buildContactReplyEmail({ firstName: EVIL, reply: `${EVIL}\nSecond line` }),
};

describe.each(Object.entries(emails))("%s email", (_name, email) => {
  it("escapes a malicious customer value", () => {
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("has no emoji in subject or html", () => {
    expect(email.subject).not.toMatch(EMOJI);
    expect(email.html).not.toMatch(EMOJI);
  });

  it("has exactly one primary flame button and one h1", () => {
    expect(email.html.match(FLAME_BUTTON)).toHaveLength(1);
    expect(email.html.match(/<h1/g)).toHaveLength(1);
  });
});

describe("booking confirmation", () => {
  it("renders the calendar date without shifting a day, in any server timezone", () => {
    expect(formatCalendarDate("2026-11-08")).toBe("Sun, Nov 8, 2026");
    expect(emails.confirmation.html).toContain("Nov 8");
    expect(emails.confirmation.subject).toContain("Nov 8");
    expect(emails.confirmation.html).not.toContain("Nov 7");
  });

  it("still renders Nov 8 when the server runs in America/Chicago", () => {
    const previous = process.env.TZ;
    process.env.TZ = "America/Chicago";
    try {
      // Sanity check: the naive parse really does shift a day in this zone.
      expect(new Date("2026-11-08").getDate()).toBe(7);
      expect(formatCalendarDate("2026-11-08")).toBe("Sun, Nov 8, 2026");
      const { html, subject } = buildBookingConfirmationEmail({
        customerName: "Ana",
        bookingId: 42,
        servicePackage: "Express detailing",
        appointmentDate: "2026-11-08",
        appointmentTime: "10:30",
      });
      expect(subject).toContain("Nov 8");
      expect(html).toContain("Sun, Nov 8, 2026");
    } finally {
      if (previous === undefined) delete process.env.TZ;
      else process.env.TZ = previous;
    }
  });

  it("formats the time in 12-hour form", () => {
    expect(formatClockTime("10:30")).toBe("10:30 AM");
    expect(formatClockTime("14:05:00")).toBe("2:05 PM");
    expect(formatClockTime("00:15")).toBe("12:15 AM");
    expect(formatClockTime("12:00")).toBe("12:00 PM");
    expect(emails.confirmation.html).toContain("10:30 AM");
  });

  it("links to directions and to the dashboard bookings", () => {
    expect(emails.confirmation.html).toContain("https://www.google.com/maps/dir/?api=1&amp;destination=10410+S+Main+St");
    expect(emails.confirmation.html).toContain("/dashboard/bookings");
    expect(emails.confirmation.html).toContain("#1a2b3c4d");
  });
});

describe("receipt", () => {
  it("is a real data table with column headers and the total", () => {
    const html = emails.receipt.html;
    expect(html.match(/<th scope="col"/g)).toHaveLength(2);
    expect(html).toContain("$49.99");
    expect(html).toContain("$10.00");
    expect(html).toContain("$59.99");
  });
});

describe("contact reply", () => {
  it("keeps the admin's line breaks", () => {
    expect(emails.contactReply.html).toContain("<br>Second line");
  });
});
