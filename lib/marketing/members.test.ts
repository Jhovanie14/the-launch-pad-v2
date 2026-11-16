import { describe, expect, it } from "vitest";
import { findMemberAccounts } from "./members";
import { fakeDb } from "./testing/fakeDb";

describe("findMemberAccounts", () => {
  it("finds a member by account id", async () => {
    const db = fakeDb({ user_subscription: [{ user_id: "u1", status: "active" }] });
    const isMember = await findMemberAccounts(db, ["a@example.com"], ["u1"]);
    expect(isMember("a@example.com", ["u1"])).toBe(true);
    expect(isMember("b@example.com", ["u2"])).toBe(false);
  });

  it("finds a member by profile email, in any case", async () => {
    const db = fakeDb({
      profiles: [{ id: "u9", email: "Pat@Example.com" }],
      user_subscription: [{ user_id: "u9", status: "active" }],
    });
    const isMember = await findMemberAccounts(db, ["Pat@Example.com"], []);
    expect(isMember("pat@example.com", [])).toBe(true);
  });

  it("ignores plans that aren't active", async () => {
    const db = fakeDb({ user_subscription: [{ user_id: "u1", status: "canceled" }] });
    const isMember = await findMemberAccounts(db, [], ["u1"]);
    expect(isMember("a@example.com", ["u1"])).toBe(false);
  });

  it("checks self-service plans too", async () => {
    const db = fakeDb({ self_service_subscriptions: [{ user_id: "u1", status: "active" }] });
    const isMember = await findMemberAccounts(db, [], ["u1"]);
    expect(isMember("a@example.com", ["u1"])).toBe(true);
  });

  it("queries nothing when given nobody", async () => {
    const db = fakeDb({});
    const isMember = await findMemberAccounts(db, [], []);
    expect(isMember("a@example.com", [])).toBe(false);
    expect(db.from).not.toHaveBeenCalled();
  });
});
