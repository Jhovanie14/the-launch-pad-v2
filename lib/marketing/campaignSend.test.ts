import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http/apiError";
import { FROM } from "@/lib/email/layout";
import { RESEND_UNSUBSCRIBE_URL, TEST_UNSUBSCRIBE_URL } from "./campaignEmail";
import {
  cancelCampaign,
  listCampaigns,
  missingCampaignConfig,
  sendCampaign,
  sendCampaignTest,
  type CampaignResendLike,
} from "./campaignSend";

const CFG = { segmentId: "seg_1", topicId: "topic_1" };
const NOW = new Date("2026-11-12T15:00:00.000Z");
const content = { subject: "  Free tire shine  ", body: "Saturday only." };

function fakeResend(over: Partial<{
  create: () => Promise<unknown>;
  list: () => Promise<unknown>;
  get: () => Promise<unknown>;
  remove: () => Promise<unknown>;
  send: () => Promise<unknown>;
}> = {}) {
  const create = vi.fn(over.create ?? (async () => ({ data: { id: "b_1" }, error: null })));
  const list = vi.fn(over.list ?? (async () => ({ data: { data: [] }, error: null })));
  const get = vi.fn(over.get ?? (async () => ({ data: null, error: null })));
  const remove = vi.fn(over.remove ?? (async () => ({ data: { id: "b_1" }, error: null })));
  const send = vi.fn(over.send ?? (async () => ({ data: { id: "e_1" }, error: null })));
  const resend = { broadcasts: { create, list, get, remove }, emails: { send } } as unknown as CampaignResendLike;
  return { resend, create, list, get, remove, send };
}

describe("missingCampaignConfig", () => {
  it("names each missing setting", () => {
    expect(missingCampaignConfig({})).toEqual(["RESEND_MARKETING_SEGMENT_ID", "RESEND_MARKETING_TOPIC_ID"]);
    expect(missingCampaignConfig(CFG)).toEqual([]);
  });
});

describe("sendCampaign", () => {
  it("sends one broadcast to the segment, narrowed to the opted-in topic", async () => {
    const { resend, create } = fakeResend();
    const result = await sendCampaign(resend, CFG, content, { now: NOW });
    expect(result).toEqual({ id: "b_1", scheduledAt: null });
    const payload = (create.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      name: "Free tire shine",
      from: FROM,
      subject: "Free tire shine",
      segmentId: "seg_1",
      topicId: "topic_1",
      send: true,
    });
    expect(payload).not.toHaveProperty("scheduledAt");
    expect(payload.html).toContain(RESEND_UNSUBSCRIBE_URL);
  });

  it("passes a valid schedule through", async () => {
    const { resend, create } = fakeResend();
    const at = "2026-11-14T15:00:00.000Z";
    const result = await sendCampaign(resend, CFG, content, { scheduledAt: at, now: NOW });
    expect(result.scheduledAt).toBe(at);
    expect((create.mock.calls as unknown[][])[0][0]).toMatchObject({ scheduledAt: at });
  });

  it("refuses an invalid campaign without calling Resend", async () => {
    const { resend, create } = fakeResend();
    await expect(sendCampaign(resend, CFG, { subject: "", body: "" }, { now: NOW })).rejects.toThrow(
      "Add a subject line. Write the message.",
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses a send time in the past", async () => {
    const { resend, create } = fakeResend();
    await expect(
      sendCampaign(resend, CFG, content, { scheduledAt: "2026-11-12T14:00:00.000Z", now: NOW }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses to send when the segment or topic is not set up", async () => {
    const { resend, create } = fakeResend();
    await expect(sendCampaign(resend, { topicId: "t" }, content, { now: NOW })).rejects.toThrow(
      /RESEND_MARKETING_SEGMENT_ID/,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses the same subject again within 10 minutes (double click, retry)", async () => {
    const { resend, create } = fakeResend({
      list: async () => ({
        data: { data: [{ id: "b_0", name: "Free tire shine", segment_id: "seg_1", status: "sent", created_at: "2026-11-12T14:55:00.000Z", scheduled_at: null, sent_at: null }] },
        error: null,
      }),
    });
    await expect(sendCampaign(resend, CFG, content, { now: NOW })).rejects.toThrow(/just sent/);
    expect(create).not.toHaveBeenCalled();
  });

  it("allows the same subject again after 10 minutes", async () => {
    const { resend, create } = fakeResend({
      list: async () => ({
        data: { data: [{ id: "b_0", name: "Free tire shine", segment_id: "seg_1", status: "sent", created_at: "2026-11-12T14:40:00.000Z", scheduled_at: null, sent_at: null }] },
        error: null,
      }),
    });
    await sendCampaign(resend, CFG, content, { now: NOW });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("reports a Resend failure as a client-safe error", async () => {
    const { resend } = fakeResend({ create: async () => ({ data: null, error: { message: "Invalid from" } }) });
    await expect(sendCampaign(resend, CFG, content, { now: NOW })).rejects.toThrow(
      "Resend didn't accept the campaign: Invalid from",
    );
  });
});

describe("sendCampaignTest", () => {
  it("emails only the given address, marked as a test", async () => {
    const { resend, send, create } = fakeResend();
    await sendCampaignTest(resend, "owner@example.com", content);
    const payload = (send.mock.calls as unknown[][])[0][0] as Record<string, string>;
    expect(payload.to).toBe("owner@example.com");
    expect(payload.subject).toBe("[Test] Free tire shine");
    expect(payload.html).toContain(TEST_UNSUBSCRIBE_URL);
    expect(payload.html).not.toContain(RESEND_UNSUBSCRIBE_URL);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("listCampaigns", () => {
  it("lists only this segment's broadcasts, newest first", async () => {
    const { resend } = fakeResend({
      list: async () => ({
        data: {
          data: [
            { id: "old", name: "Old", segment_id: "seg_1", status: "sent", created_at: "2026-11-01T00:00:00Z", scheduled_at: null, sent_at: "2026-11-01T00:01:00Z" },
            { id: "other", name: "Other list", segment_id: "seg_9", status: "sent", created_at: "2026-11-10T00:00:00Z", scheduled_at: null, sent_at: null },
            { id: "new", name: "New", segment_id: "seg_1", status: "queued", created_at: "2026-11-11T00:00:00Z", scheduled_at: "2026-11-14T15:00:00Z", sent_at: null },
          ],
        },
        error: null,
      }),
    });
    const rows = await listCampaigns(resend, CFG);
    expect(rows.map((r) => r.id)).toEqual(["new", "old"]);
    expect(rows[0]).toEqual({
      id: "new",
      name: "New",
      status: "queued",
      createdAt: "2026-11-11T00:00:00Z",
      scheduledAt: "2026-11-14T15:00:00Z",
      sentAt: null,
    });
  });
});

describe("cancelCampaign", () => {
  it("cancels a broadcast that is scheduled for later", async () => {
    const { resend, remove } = fakeResend({
      get: async () => ({ data: { id: "b_1", segment_id: "seg_1", status: "queued", scheduled_at: "2026-11-14T15:00:00Z" }, error: null }),
    });
    await cancelCampaign(resend, CFG, "b_1", NOW);
    expect(remove).toHaveBeenCalledWith("b_1");
  });

  it("refuses to cancel one that has already gone out", async () => {
    const { resend, remove } = fakeResend({
      get: async () => ({ data: { id: "b_1", segment_id: "seg_1", status: "sent", scheduled_at: null }, error: null }),
    });
    await expect(cancelCampaign(resend, CFG, "b_1", NOW)).rejects.toThrow("This campaign has already been sent.");
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses one whose send time has arrived", async () => {
    const { resend, remove } = fakeResend({
      get: async () => ({ data: { id: "b_1", segment_id: "seg_1", status: "queued", scheduled_at: "2026-11-12T14:59:00Z" }, error: null }),
    });
    await expect(cancelCampaign(resend, CFG, "b_1", NOW)).rejects.toThrow(/already sending/);
    expect(remove).not.toHaveBeenCalled();
  });

  it("refuses a broadcast that isn't one of our campaigns", async () => {
    const { resend, remove } = fakeResend({
      get: async () => ({ data: { id: "b_1", segment_id: "seg_9", status: "queued", scheduled_at: "2026-11-14T15:00:00Z" }, error: null }),
    });
    await expect(cancelCampaign(resend, CFG, "b_1", NOW)).rejects.toThrow("Campaign not found.");
    expect(remove).not.toHaveBeenCalled();
  });
});
