import { describe, expect, it } from "vitest";
import { createUnsubscribeToken, unsubscribeUrl, verifyUnsubscribeToken } from "./unsubscribeToken";

const SECRET = "test-secret-at-least-32-characters-long";

describe("unsubscribe tokens", () => {
  it("round-trips the email it was made for", () => {
    const token = createUnsubscribeToken("Sam@Example.com", SECRET);
    expect(verifyUnsubscribeToken(token, SECRET)).toBe("Sam@Example.com");
  });

  it("is URL-safe", () => {
    expect(createUnsubscribeToken("a+b/c=d@example.com", SECRET)).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("rejects a token signed with another secret", () => {
    const token = createUnsubscribeToken("sam@example.com", "another-secret-of-decent-length-xx");
    expect(verifyUnsubscribeToken(token, SECRET)).toBeNull();
  });

  it("rejects a token whose email was swapped", () => {
    const [, sig] = createUnsubscribeToken("sam@example.com", SECRET).split(".");
    const forged = `${Buffer.from("victim@example.com").toString("base64url")}.${sig}`;
    expect(verifyUnsubscribeToken(forged, SECRET)).toBeNull();
  });

  it("rejects garbage and missing values", () => {
    expect(verifyUnsubscribeToken("", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("nodot", SECRET)).toBeNull();
    expect(verifyUnsubscribeToken(undefined, SECRET)).toBeNull();
    expect(verifyUnsubscribeToken("a.b", "")).toBeNull();
  });

  it("builds the page link on our site", () => {
    const url = unsubscribeUrl("sam@example.com", SECRET, "https://www.thelaunchpadwash.com");
    expect(url).toMatch(/^https:\/\/www\.thelaunchpadwash\.com\/unsubscribe\?t=[A-Za-z0-9_.-]+$/);
  });
});
