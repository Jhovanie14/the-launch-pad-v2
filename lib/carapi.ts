// lib/carapi.ts
let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getCarApiToken() {
  // if token exists & not expired, reuse
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch("https://carapi.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_token: process.env.CARAPI_TOKEN,
      api_secret: process.env.CARAPI_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CarAPI token: ${res.statusText}`);
  }

  // CarAPI returns plain text JWT
  const token = (await res.text()).trim();

  // decode expiry from JWT (optional safety)
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
    if (decoded.exp) {
      tokenExpiry = decoded.exp * 1000; // ms
    }
  } catch {
    // fallback: cache for 15 min
    tokenExpiry = Date.now() + 15 * 60 * 1000;
  }

  cachedToken = token;
  return token;
}
