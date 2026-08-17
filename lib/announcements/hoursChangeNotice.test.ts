import { describe, expect, it } from "vitest";
import {
  HOURS_NOTICE_KEYS,
  HOURS_NOTICE_RETIRE_AT,
  shouldShowHoursNotice,
} from "./hoursChangeNotice";

const BEFORE = new Date("2026-08-20T12:00:00Z");
const AFTER = new Date("2026-10-02T12:00:00Z");

describe("shouldShowHoursNotice", () => {
  it("shows for a first-time visitor before the notice retires", () => {
    expect(shouldShowHoursNotice({ dismissed: false, now: BEFORE })).toBe(true);
  });

  it("stays hidden once the visitor has dismissed it", () => {
    expect(shouldShowHoursNotice({ dismissed: true, now: BEFORE })).toBe(false);
  });

  it("retires itself after the cutoff even if never dismissed", () => {
    expect(shouldShowHoursNotice({ dismissed: false, now: AFTER })).toBe(false);
  });

  it("treats the retire moment itself as retired", () => {
    expect(
      shouldShowHoursNotice({ dismissed: false, now: HOURS_NOTICE_RETIRE_AT })
    ).toBe(false);
  });

  it("still shows one millisecond before the cutoff", () => {
    const justBefore = new Date(HOURS_NOTICE_RETIRE_AT.getTime() - 1);
    expect(shouldShowHoursNotice({ dismissed: false, now: justBefore })).toBe(
      true
    );
  });
});

describe("HOURS_NOTICE_KEYS", () => {
  it("uses a distinct storage key per surface", () => {
    // Dismissing the informational popup as a logged-out visitor must not
    // suppress the actionable dashboard copy they see after signing in.
    expect(HOURS_NOTICE_KEYS.landing).not.toBe(HOURS_NOTICE_KEYS.dashboard);
  });

  it("versions each key by the effective date so a future notice is a fresh key", () => {
    for (const key of Object.values(HOURS_NOTICE_KEYS)) {
      expect(key).toContain("2026-09-18");
    }
  });
});
