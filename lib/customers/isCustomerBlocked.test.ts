import { describe, expect, it, vi } from "vitest";
import { isCustomerBlocked } from "./customerBlocks";

/** rpc → find_customer_block matches; from("customer_blocks") → rows made for an account. */
function fakeDb(opts: { emailMatch?: boolean; blocksByUser?: Record<string, number>; userError?: boolean }) {
  const rpc = vi.fn(async () => ({
    data: opts.emailMatch ? [{ kind: "email", value: "pat@example.com" }] : [],
    error: null,
  }));
  const from = vi.fn(() => {
    let userId = "";
    const chain = {
      select: () => chain,
      eq: (_c: string, v: string) => ((userId = v), chain),
      limit: () => chain,
      then: (resolve: (v: unknown) => void) =>
        resolve(
          opts.userError
            ? { data: null, error: { message: "boom" } }
            : { data: Array.from({ length: opts.blocksByUser?.[userId] ?? 0 }, (_, i) => ({ id: `${i}` })), error: null },
        ),
    };
    return chain;
  });
  return { rpc, from } as any;
}

describe("isCustomerBlocked", () => {
  it("is true when a block was made for their account", async () => {
    await expect(isCustomerBlocked(fakeDb({ blocksByUser: { u1: 2 } }), { userId: "u1", email: "x@example.com" })).resolves.toBe(true);
  });

  it("is true when their email is on the block list", async () => {
    await expect(isCustomerBlocked(fakeDb({ emailMatch: true }), { userId: "u1", email: "pat@example.com" })).resolves.toBe(true);
  });

  it("is false for anyone else", async () => {
    await expect(isCustomerBlocked(fakeDb({}), { userId: "u1", email: "pat@example.com" })).resolves.toBe(false);
  });

  it("checks the email alone when there's no account", async () => {
    await expect(isCustomerBlocked(fakeDb({ emailMatch: true }), { userId: null, email: "pat@example.com" })).resolves.toBe(true);
  });

  it("falls back to the email check when the account lookup errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      isCustomerBlocked(fakeDb({ userError: true, emailMatch: true }), { userId: "u1", email: "pat@example.com" }),
    ).resolves.toBe(true);
  });
});
