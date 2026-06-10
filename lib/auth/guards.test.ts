import { describe, expect, it, vi } from "vitest";
import { AuthError, requireAdmin, requireUser } from "./guards";

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
