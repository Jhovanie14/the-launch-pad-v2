import { describe, expect, it } from "vitest";
import {
  QUEUE_STATUS_LABEL, dayCounts, firstName, formatTime12, isNewBooking, isShortRefTerm,
  matchesShortRef, nextWaitingId, queueStatus, shortName, shortRef, timeMinutes, tookLabel,
  applyBookingChange, dayLabel, monthBounds, monthGrid, monthOf, shiftMonth, sortSearchResults,
} from "./bookingQueue";

describe("queueStatus", () => {
  it("maps database statuses to the attendant's words", () => {
    expect(queueStatus("pending")).toBe("waiting");
    expect(queueStatus("confirmed")).toBe("in_progress");
    expect(queueStatus("in_progress")).toBe("in_progress");
    expect(queueStatus("completed")).toBe("done");
    expect(queueStatus("cancelled")).toBe("cancelled");
    expect(QUEUE_STATUS_LABEL).toEqual({ waiting: "Waiting", in_progress: "In progress", done: "Done", cancelled: "Cancelled" });
  });
});

describe("names", () => {
  it("shortens to first name and last initial", () => {
    expect(shortName("James Carter")).toBe("James C.");
    expect(shortName("Devon Bankett ")).toBe("Devon B.");
    expect(shortName("  Maria  de la Cruz ")).toBe("Maria C.");
    expect(shortName("Madonna")).toBe("Madonna");
    expect(shortName(null)).toBe("Guest");
    expect(shortName("   ")).toBe("Guest");
  });
  it("first name for calendar cells", () => {
    expect(firstName("James Carter")).toBe("James");
    expect(firstName(undefined)).toBe("Guest");
  });
});

describe("short reference", () => {
  const id = "1a2b3c4d-1111-2222-3333-444455556666";
  it("is the first 8 characters, upper case", () => {
    expect(shortRef(id)).toBe("1A2B3C4D");
  });
  it("recognises a typed reference, with or without #", () => {
    expect(isShortRefTerm("#1a2b3c4d")).toBe(true);
    expect(isShortRefTerm("1A2B3C4D")).toBe(true);
    expect(isShortRefTerm("1a2b3c4")).toBe(false);
    expect(isShortRefTerm("James Ca")).toBe(false);
  });
  it("matches a booking id by its reference", () => {
    expect(matchesShortRef(id, "#1A2B3C4D")).toBe(true);
    expect(matchesShortRef(id, "ffffffff")).toBe(false);
  });
});

describe("times", () => {
  it("reads 24-hour and legacy 12-hour values", () => {
    expect(timeMinutes("14:30:00")).toBe(870);
    expect(timeMinutes("09:05")).toBe(545);
    expect(timeMinutes("10:10 PM")).toBe(1330);
    expect(timeMinutes("12:15 AM")).toBe(15);
    expect(timeMinutes("garbage")).toBe(Number.MAX_SAFE_INTEGER);
    expect(timeMinutes(null)).toBe(Number.MAX_SAFE_INTEGER);
  });
  it("formats as 12-hour", () => {
    expect(formatTime12("14:30:00")).toBe("2:30 PM");
    expect(formatTime12("00:15")).toBe("12:15 AM");
    expect(formatTime12("10:10 PM")).toBe("10:10 PM");
    expect(formatTime12(null)).toBe("—");
  });
  it("says how long a finished wash took", () => {
    expect(tookLabel("2026-11-13T15:00:00Z", "2026-11-13T15:00:45Z")).toBe("45 sec");
    expect(tookLabel("2026-11-13T15:00:00Z", "2026-11-13T15:18:00Z")).toBe("18 min");
    expect(tookLabel("2026-11-13T15:00:00Z", "2026-11-13T17:05:00Z")).toBe("2 hr");
    expect(tookLabel(null, "2026-11-13T15:18:00Z")).toBeNull();
    expect(tookLabel("2026-11-13T15:18:00Z", "2026-11-13T15:00:00Z")).toBeNull();
  });
  it("calls a booking new for 10 minutes after it was made", () => {
    const now = new Date("2026-11-13T15:10:00Z");
    expect(isNewBooking("2026-11-13T15:01:00Z", now)).toBe(true);
    expect(isNewBooking("2026-11-13T14:59:00Z", now)).toBe(false);
    expect(isNewBooking(null, now)).toBe(false);
  });
});

describe("day summary", () => {
  const rows = [
    { id: "a", status: "pending" as const, appointment_time: "10:30:00" },
    { id: "b", status: "pending" as const, appointment_time: "09:00:00" },
    { id: "c", status: "confirmed" as const, appointment_time: "08:30:00" },
    { id: "d", status: "completed" as const, appointment_time: "08:00:00" },
    { id: "e", status: "cancelled" as const, appointment_time: "07:00:00" },
  ];
  it("counts waiting, in progress and done, never cancelled", () => {
    expect(dayCounts(rows)).toEqual({ waiting: 2, inProgress: 1, done: 1 });
  });
  it("finds the earliest waiting car", () => {
    expect(nextWaitingId(rows)).toBe("b");
    expect(nextWaitingId([rows[3]])).toBeNull();
  });
});

describe("month grid", () => {
  it("covers November 2026 in Monday-first weeks", () => {
    const g = monthGrid("2026-11");
    expect(g).toHaveLength(6);
    expect(g[0][0]).toBe("2026-10-26");
    expect(g[0][6]).toBe("2026-11-01");
    expect(g[5][6]).toBe("2026-12-06");
    expect(monthBounds("2026-11")).toEqual({ gte: "2026-10-26", lte: "2026-12-06" });
  });
  it("uses exactly 4 weeks when the month fits", () => {
    expect(monthGrid("2027-02")).toHaveLength(4);
    expect(monthGrid("2027-02")[0][0]).toBe("2027-02-01");
  });
  it("moves between months and years", () => {
    expect(monthOf("2026-11-13")).toBe("2026-11");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("applyBookingChange", () => {
  const row = (id: string, date: string, time: string) => ({ id, appointment_date: date, appointment_time: time });
  const onDay = (r: { appointment_date: string }) => r.appointment_date === "2026-11-13";
  const list = [row("a", "2026-11-13", "09:00:00"), row("b", "2026-11-13", "11:00:00")];
  it("removes a deleted booking", () => {
    expect(applyBookingChange(list, "a", null, onDay).map((r) => r.id)).toEqual(["b"]);
  });
  it("adds a booking moved onto the day, in time order", () => {
    const moved = row("c", "2026-11-13", "10:10 AM");
    expect(applyBookingChange(list, "c", moved, onDay).map((r) => r.id)).toEqual(["a", "c", "b"]);
  });
  it("drops a booking moved off the day", () => {
    expect(applyBookingChange(list, "b", row("b", "2026-11-14", "11:00:00"), onDay).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("sortSearchResults", () => {
  it("puts today and upcoming first (soonest first), then past (latest first)", () => {
    const rows = [
      { id: "past-old", appointment_date: "2026-10-01", appointment_time: "09:00:00" },
      { id: "next-week", appointment_date: "2026-11-20", appointment_time: "09:00:00" },
      { id: "past-recent", appointment_date: "2026-11-12", appointment_time: "09:00:00" },
      { id: "today-late", appointment_date: "2026-11-13", appointment_time: "15:00:00" },
      { id: "today-early", appointment_date: "2026-11-13", appointment_time: "08:00:00" },
    ];
    expect(sortSearchResults(rows, "2026-11-13").map((r) => r.id)).toEqual([
      "today-early", "today-late", "next-week", "past-recent", "past-old",
    ]);
  });
});

describe("dayLabel", () => {
  it("names a calendar date without shifting it by time zone", () => {
    expect(dayLabel("2026-11-13")).toBe("Fri, Nov 13");
    expect(dayLabel("2027-01-01")).toBe("Fri, Jan 1");
  });
});
