import { describe, expect, it } from "vitest";
import { isTriageAction, statusForAction } from "./status";

describe("isTriageAction", () => {
  it("accepts the actions staff can take from the inbox", () => {
    expect(isTriageAction("spam")).toBe(true);
    expect(isTriageAction("archive")).toBe(true);
    expect(isTriageAction("restore")).toBe(true);
  });

  it("rejects anything else, including statuses set by other flows", () => {
    expect(isTriageAction("replied")).toBe(false);
    expect(isTriageAction("new")).toBe(false);
    expect(isTriageAction("")).toBe(false);
    expect(isTriageAction(undefined)).toBe(false);
  });
});

describe("statusForAction", () => {
  it("files spam and archived messages out of the inbox", () => {
    expect(statusForAction("spam", { status: "new", replied_at: null })).toBe("spam");
    expect(statusForAction("archive", { status: "new", replied_at: null })).toBe(
      "archived"
    );
  });

  it("restores an unanswered message to New", () => {
    expect(statusForAction("restore", { status: "spam", replied_at: null })).toBe(
      "new"
    );
  });

  it("restores a message that was already answered to Replied", () => {
    expect(
      statusForAction("restore", {
        status: "archived",
        replied_at: "2026-09-01T10:00:00Z",
      })
    ).toBe("replied");
  });
});
