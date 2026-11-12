/**
 * Sends campaigns as Resend broadcasts. One broadcast per campaign, addressed
 * to the campaign segment and narrowed by the "product news & offers" topic,
 * so only people who opted in receive it and Resend handles the per-recipient
 * unsubscribe link, throttling and delivery stats. Nothing is stored on our
 * side: the campaign history is Resend's broadcast list for that segment.
 */
import { ApiError } from "@/lib/http/apiError";
import { FROM } from "@/lib/email/layout";
import {
  RESEND_UNSUBSCRIBE_URL,
  TEST_UNSUBSCRIBE_URL,
  buildCampaignHtml,
  campaignProblems,
  scheduleProblem,
  type CampaignContent,
} from "./campaignEmail";

export interface CampaignConfig {
  segmentId?: string;
  topicId?: string;
}

export function campaignConfigFromEnv(): CampaignConfig {
  return {
    segmentId: process.env.RESEND_MARKETING_SEGMENT_ID || undefined,
    topicId: process.env.RESEND_MARKETING_TOPIC_ID || undefined,
  };
}

export type CampaignStatus = "draft" | "queued" | "sent";

/** Same subject to the same list this soon is almost certainly a double click or retry. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  createdAt: string;
  scheduledAt: string | null;
  sentAt: string | null;
}

type Result<T> = Promise<{ data: T | null; error: { message?: string } | null | unknown }>;

interface BroadcastRow {
  id: string;
  name: string;
  segment_id: string | null;
  status: CampaignStatus;
  created_at: string;
  scheduled_at: string | null;
  sent_at: string | null;
}

/** The slice of the Resend SDK this module uses; tests pass fakes. */
export interface CampaignResendLike {
  broadcasts: {
    create(o: Record<string, unknown>): Result<{ id: string }>;
    list(): Result<{ data: BroadcastRow[] }>;
    get(id: string): Result<Pick<BroadcastRow, "id" | "segment_id" | "status" | "scheduled_at">>;
    remove(id: string): Result<{ id: string }>;
  };
  emails: {
    send(o: { from: string; to: string; subject: string; html: string }): Result<{ id: string }>;
  };
}

/** Env var names still missing; campaigns can't be sent until this is empty. */
export function missingCampaignConfig(cfg: CampaignConfig): string[] {
  const missing: string[] = [];
  if (!cfg.segmentId) missing.push("RESEND_MARKETING_SEGMENT_ID");
  if (!cfg.topicId) missing.push("RESEND_MARKETING_TOPIC_ID");
  return missing;
}

function trimmed(c: CampaignContent): CampaignContent {
  return {
    subject: c.subject?.trim() ?? "",
    previewText: c.previewText?.trim() || undefined,
    title: c.title?.trim() || undefined,
    body: c.body?.trim() ?? "",
    bannerUrl: c.bannerUrl?.trim() || undefined,
  };
}

function assertValid(c: CampaignContent) {
  const problems = campaignProblems(c);
  if (problems.length) throw new ApiError(problems.join(" "), 400);
}

function resendMessage(error: unknown): string {
  const message = (error as { message?: string } | null)?.message;
  return message ? `: ${message}` : ".";
}

export async function sendCampaign(
  resend: CampaignResendLike,
  cfg: CampaignConfig,
  input: CampaignContent,
  opts: { scheduledAt?: string; now?: Date } = {},
): Promise<{ id: string; scheduledAt: string | null }> {
  const content = trimmed(input);
  assertValid(content);

  const timing = scheduleProblem(opts.scheduledAt, opts.now);
  if (timing) throw new ApiError(timing, 400);

  const missing = missingCampaignConfig(cfg);
  if (missing.length) {
    throw new ApiError(`Campaigns aren't set up yet. Missing: ${missing.join(", ")}.`, 503);
  }

  const now = opts.now ?? new Date();
  const recent = await listCampaigns(resend, cfg);
  const duplicate = recent.find(
    (b) => b.name === content.subject && now.getTime() - new Date(b.createdAt).getTime() < DUPLICATE_WINDOW_MS,
  );
  if (duplicate) {
    throw new ApiError(
      "A campaign with this subject was just sent. Check the list below before sending again, or change the subject.",
      409,
    );
  }

  const { data, error } = await resend.broadcasts.create({
    name: content.subject,
    from: FROM,
    subject: content.subject,
    ...(content.previewText ? { previewText: content.previewText } : {}),
    html: buildCampaignHtml(content, { unsubscribeUrl: RESEND_UNSUBSCRIBE_URL }),
    segmentId: cfg.segmentId,
    topicId: cfg.topicId,
    send: true,
    ...(opts.scheduledAt ? { scheduledAt: opts.scheduledAt } : {}),
  });
  if (error || !data) {
    throw new ApiError(`Resend didn't accept the campaign${resendMessage(error)}`, 502);
  }
  return { id: data.id, scheduledAt: opts.scheduledAt ?? null };
}

/** One copy to one address (the admin), so they can check it in a real inbox. */
export async function sendCampaignTest(
  resend: CampaignResendLike,
  to: string,
  input: CampaignContent,
): Promise<void> {
  const content = trimmed(input);
  assertValid(content);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: `[Test] ${content.subject}`,
    html: buildCampaignHtml(content, { unsubscribeUrl: TEST_UNSUBSCRIBE_URL }),
  });
  if (error) throw new ApiError(`Resend didn't send the test${resendMessage(error)}`, 502);
}

export async function listCampaigns(
  resend: CampaignResendLike,
  cfg: CampaignConfig,
): Promise<CampaignSummary[]> {
  if (!cfg.segmentId) return [];
  const { data, error } = await resend.broadcasts.list();
  if (error || !data) throw new ApiError(`Couldn't load past campaigns from Resend${resendMessage(error)}`, 502);
  return data.data
    .filter((b) => b.segment_id === cfg.segmentId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 25)
    .map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      createdAt: b.created_at,
      scheduledAt: b.scheduled_at,
      sentAt: b.sent_at,
    }));
}

/** Cancels a scheduled campaign. Deleting a scheduled broadcast in Resend stops it. */
export async function cancelCampaign(
  resend: CampaignResendLike,
  cfg: CampaignConfig,
  id: string,
  now: Date = new Date(),
): Promise<void> {
  const { data, error } = await resend.broadcasts.get(id);
  if (error || !data || !cfg.segmentId || data.segment_id !== cfg.segmentId) {
    throw new ApiError("Campaign not found.", 404);
  }
  if (data.status === "sent") throw new ApiError("This campaign has already been sent.", 409);
  if (!data.scheduled_at || new Date(data.scheduled_at).getTime() <= now.getTime()) {
    throw new ApiError("This campaign is already sending, so it can't be cancelled.", 409);
  }
  const removed = await resend.broadcasts.remove(id);
  if (removed.error) throw new ApiError(`Resend didn't cancel the campaign${resendMessage(removed.error)}`, 502);
}
