import { describe, expect, it } from "vitest";
import { authErrorMessage } from "./authErrorMessage";

describe("authErrorMessage", () => {
  describe("email send rate limit", () => {
    it("explains the throttle by code, naming the email the user was waiting for", () => {
      const msg = authErrorMessage({ code: "over_email_send_rate_limit" }, "signup");
      expect(msg).toMatch(/confirmation email/i);
      expect(msg).toMatch(/few minutes/i);
      // The raw Supabase wording must never reach the user.
      expect(msg).not.toMatch(/rate limit exceeded/i);
    });

    it("names the reset email instead when resetting a password", () => {
      const msg = authErrorMessage({ code: "over_email_send_rate_limit" }, "reset");
      expect(msg).toMatch(/reset email/i);
    });

    it("falls back to message matching when no code is present", () => {
      // Older gotrue responses carry only a message.
      const msg = authErrorMessage(
        { message: "email rate limit exceeded" },
        "signup"
      );
      expect(msg).toMatch(/confirmation email/i);
    });
  });

  describe("captcha", () => {
    it("maps captcha_failed to retry copy", () => {
      expect(authErrorMessage({ code: "captcha_failed" }, "signin")).toMatch(
        /captcha/i
      );
    });

    it("maps a captcha message without a code", () => {
      const msg = authErrorMessage(
        { message: "captcha protection: request disallowed (invalid-input-response)" },
        "signup"
      );
      expect(msg).toMatch(/captcha/i);
      // Cloudflare's internal reason is noise to an end user.
      expect(msg).not.toMatch(/invalid-input-response/);
    });
  });

  describe("request rate limit", () => {
    it("is distinct from the email throttle", () => {
      const requestLimit = authErrorMessage(
        { code: "over_request_rate_limit" },
        "signin"
      );
      const emailLimit = authErrorMessage(
        { code: "over_email_send_rate_limit" },
        "signup"
      );
      expect(requestLimit).toMatch(/too many/i);
      expect(requestLimit).not.toBe(emailLimit);
    });
  });

  describe("credential and account errors", () => {
    it("maps invalid_credentials without revealing which field was wrong", () => {
      const msg = authErrorMessage({ code: "invalid_credentials" }, "signin");
      expect(msg).toMatch(/email or password/i);
    });

    it("maps email_not_confirmed to a confirm prompt", () => {
      expect(authErrorMessage({ code: "email_not_confirmed" }, "signin")).toMatch(
        /confirm/i
      );
    });

    it("maps user_already_exists to a sign-in nudge", () => {
      expect(authErrorMessage({ code: "user_already_exists" }, "signup")).toMatch(
        /already registered/i
      );
    });

    it("maps weak_password", () => {
      expect(authErrorMessage({ code: "weak_password" }, "signup")).toMatch(
        /stronger/i
      );
    });

    it("maps email_address_invalid", () => {
      expect(
        authErrorMessage({ code: "email_address_invalid" }, "signup")
      ).toMatch(/valid email/i);
    });
  });

  describe("unknown errors", () => {
    it("returns generic copy rather than leaking an internal message", () => {
      const msg = authErrorMessage(
        { code: "some_new_code", message: "pq: duplicate key value violates constraint" },
        "signup"
      );
      expect(msg).toMatch(/something went wrong/i);
      expect(msg).not.toMatch(/pq:/);
    });

    it("tolerates null, undefined, and non-object errors", () => {
      for (const bad of [null, undefined, "boom", 42]) {
        expect(typeof authErrorMessage(bad, "signup")).toBe("string");
      }
    });
  });

  it("prefers the code over a conflicting message", () => {
    // A captcha code with a rate-limit-shaped message must resolve as captcha.
    const msg = authErrorMessage(
      { code: "captcha_failed", message: "email rate limit exceeded" },
      "signup"
    );
    expect(msg).toMatch(/captcha/i);
  });
});
