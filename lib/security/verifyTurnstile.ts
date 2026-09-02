/**
 * Server-side Cloudflare Turnstile verification.
 *
 * The auth forms don't need this — Supabase holds its own copy of the secret
 * and verifies those tokens itself. Routes we own have to do it here, which is
 * why the secret needs a home in our environment as well as in Supabase's.
 *
 * Every failure path returns `ok: false`, including a missing secret. A captcha
 * check that quietly passes everything when an env var is absent is worse than
 * no check at all, because it looks like protection.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerdict = { ok: true } | { ok: false; reason: string };

export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string
): Promise<TurnstileVerdict> {
  if (!token) return { ok: false, reason: "no captcha token submitted" };

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, reason: "TURNSTILE_SECRET_KEY is not configured" };
  }

  const body = new URLSearchParams({ secret, response: token });
  // Cloudflare rejects the request outright if remoteip is present but empty,
  // so only send it when we actually resolved one.
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(SITEVERIFY, { method: "POST", body });
    if (!res.ok) {
      return { ok: false, reason: `siteverify returned ${res.status}` };
    }

    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success) return { ok: true };

    return {
      ok: false,
      reason: data["error-codes"]?.join(", ") || "captcha rejected",
    };
  } catch (err) {
    // Network trouble reaching Cloudflare is not a reason to let a bot in.
    return { ok: false, reason: `siteverify unreachable: ${String(err)}` };
  }
}
