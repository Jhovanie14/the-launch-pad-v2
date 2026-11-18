import { describe, expect, it, vi } from "vitest";
import { AuthError, requireAdmin, requireSuperAdmin, requireUser } from "./guards";

function fakeServerClient(user: any) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } };
}
function fakeAdminClient(role: string | null) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: role ? { role } : null }),
        }),
      }),
    }),
  };
}

describe("requireUser", () => {
  it("returns the user when authenticated", async () => {
    const user = { id: "u1", email: "a@b.com" };
    const result = await requireUser(fakeServerClient(user) as any);
    expect(result.id).toBe("u1");
  });

  it("throws AuthError(401) when not authenticated", async () => {
    await expect(requireUser(fakeServerClient(null) as any)).rejects.toMatchObject({
      status: 401,
    });
    expect(AuthError).toBeTruthy();
  });
});

describe("requireSuperAdmin", () => {
  const profileDb = (profile: any) =>
    ({
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: profile }) }),
        }),
      }),
    }) as any;

  it("returns the user for an admin who is a super admin", async () => {
    const result = await requireSuperAdmin(
      fakeServerClient({ id: "u1" }) as any,
      profileDb({ role: "admin", user_type: "super_admin" })
    );
    expect(result.id).toBe("u1");
  });

  it("refuses a regular admin and a customer with only user_type set", async () => {
    await expect(
      requireSuperAdmin(fakeServerClient({ id: "u1" }) as any, profileDb({ role: "admin", user_type: "admin" }))
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      requireSuperAdmin(fakeServerClient({ id: "u1" }) as any, profileDb({ role: "user", user_type: "super_admin" }))
    ).rejects.toMatchObject({ status: 403 });
  });

  it("refuses when signed out", async () => {
    await expect(
      requireSuperAdmin(fakeServerClient(null) as any, profileDb({ role: "admin", user_type: "super_admin" }))
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("requireAdmin", () => {
  it("returns the user when role is admin", async () => {
    const user = { id: "u1" };
    const result = await requireAdmin(
      fakeServerClient(user) as any,
      fakeAdminClient("admin") as any
    );
    expect(result.id).toBe("u1");
  });

  it("throws AuthError(403) when role is not admin", async () => {
    const user = { id: "u1" };
    await expect(
      requireAdmin(fakeServerClient(user) as any, fakeAdminClient("user") as any)
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws AuthError(401) when not authenticated", async () => {
    await expect(
      requireAdmin(fakeServerClient(null) as any, fakeAdminClient("admin") as any)
    ).rejects.toMatchObject({ status: 401 });
  });
});
