// A small typed client for the Shippo REST API. Keys come only from env and
// are never logged. Spec: docs/superpowers/specs/2026-11-25-shippo-shipping-design.md

export type ShippoFetch = (method: "GET" | "POST", path: string, body?: unknown) => Promise<any>;

export class ShippoError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Shippo request failed (${status})`);
    this.name = "ShippoError";
    this.status = status;
    this.body = body;
  }
}

const BASE = "https://api.goshippo.com";

export function createShippoClient(apiKey: string): ShippoFetch {
  return async (method, path, body) => {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: `ShippoToken ${apiKey}`,
        "Content-Type": "application/json",
        "Shippo-API-Version": "2018-02-08",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new ShippoError(res.status, json);
    return json;
  };
}

/** Shipping is offered only when a Shippo key is configured. */
export function shippoConfigured(): boolean {
  return Boolean(process.env.SHIPPO_API_KEY);
}

export function shippoFromEnv(): ShippoFetch {
  const key = process.env.SHIPPO_API_KEY;
  if (!key) throw new Error("SHIPPO_API_KEY is not set");
  return createShippoClient(key);
}
