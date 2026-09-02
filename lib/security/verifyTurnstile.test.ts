import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./verifyTurnstile";

const SECRET = "0xTESTSECRET";

function mockSiteverify(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TURNSTILE_SECRET_KEY;
});

describe("verifyTurnstile", () => {
  it("passes when Cloudflare says the token is good", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    mockSiteverify({ success: true });
    await expect(verifyTurnstile("tok")).resolves.toEqual({ ok: true });
  });

  it("sends the secret and token to Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    const fetchMock = mockSiteverify({ success: true });
    await verifyTurnstile("tok-123");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("challenges.cloudflare.com");
    const sent = init.body as URLSearchParams;
    expect(sent.get("secret")).toBe(SECRET);
    expect(sent.get("response")).toBe("tok-123");
  });

  it("includes the caller IP when one is known", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    const fetchMock = mockSiteverify({ success: true });
    await verifyTurnstile("tok", "203.0.113.7");
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).get("remoteip")).toBe(
      "203.0.113.7"
    );
  });

  it("omits remoteip entirely when the IP is unknown", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    const fetchMock = mockSiteverify({ success: true });
    await verifyTurnstile("tok");
    // Sending an empty remoteip makes Cloudflare reject the whole call.
    expect((fetchMock.mock.calls[0][1].body as URLSearchParams).has("remoteip")).toBe(
      false
    );
  });

  it("fails when Cloudflare rejects the token", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    mockSiteverify({ success: false, "error-codes": ["invalid-input-response"] });
    await expect(verifyTurnstile("tok")).resolves.toMatchObject({ ok: false });
  });

  it("fails closed when no token was submitted", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    const fetchMock = mockSiteverify({ success: true });
    await expect(verifyTurnstile("")).resolves.toMatchObject({ ok: false });
    await expect(verifyTurnstile(undefined)).resolves.toMatchObject({ ok: false });
    // No point spending a network call on an obviously absent token.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed when the secret is not configured", async () => {
    mockSiteverify({ success: true });
    const result = await verifyTurnstile("tok");
    expect(result.ok).toBe(false);
    // A misconfigured server must not silently accept everything.
    if (!result.ok) expect(result.reason).toMatch(/not configured/i);
  });

  it("fails closed when Cloudflare is unreachable", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNRESET")));
    await expect(verifyTurnstile("tok")).resolves.toMatchObject({ ok: false });
  });

  it("fails closed on a non-200 from Cloudflare", async () => {
    process.env.TURNSTILE_SECRET_KEY = SECRET;
    mockSiteverify({}, false);
    await expect(verifyTurnstile("tok")).resolves.toMatchObject({ ok: false });
  });
});
