"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Loader2, Megaphone, RefreshCw, Send, TriangleAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CAMPAIGN_LIMITS,
  TEST_UNSUBSCRIBE_URL,
  buildCampaignHtml,
  campaignProblems,
  scheduleProblem,
  type CampaignContent,
} from "@/lib/marketing/campaignEmail";
import type { CampaignSummary } from "@/lib/marketing/campaignSend";

/*
  Admin → Campaigns. Write one email, check it in your own inbox, then send
  or schedule it to everyone who opted in to news and offers. Sending goes
  through Resend broadcasts (lib/marketing/campaignSend.ts), which add the
  unsubscribe link and skip anyone who opted out.
*/

interface Overview {
  subscribers: number;
  missingConfig: string[];
  campaigns: CampaignSummary[];
  campaignsError: string | null;
}

const EMPTY: CampaignContent = { subject: "", previewText: "", title: "", body: "", bannerUrl: "" };

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

async function call<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}

export default function CampaignsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [content, setContent] = useState<CampaignContent>(EMPTY);
  const [when, setWhen] = useState<"now" | "later">("now");
  const [localTime, setLocalTime] = useState("");
  const [busy, setBusy] = useState<"test" | "send" | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<CampaignSummary | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setOverview(await call<Overview>("/api/admin/campaigns"));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load campaigns.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof CampaignContent) => (value: string) => setContent((c) => ({ ...c, [key]: value }));

  const scheduledAt = when === "later" && localTime ? new Date(localTime).toISOString() : undefined;
  const contentProblems = campaignProblems(content);
  const timingProblem =
    when === "later" ? (localTime ? scheduleProblem(scheduledAt) : "Pick a date and time to send.") : null;
  const problems = timingProblem ? [...contentProblems, timingProblem] : contentProblems;
  const started = Boolean(content.subject || content.body);

  const subscribers = overview?.subscribers ?? 0;
  const notSetUp = (overview?.missingConfig.length ?? 0) > 0;
  const canSend = !busy && problems.length === 0 && !notSetUp && subscribers > 0;

  const previewHtml = useMemo(
    () =>
      buildCampaignHtml(
        {
          ...content,
          subject: content.subject || "Your subject line",
          body: content.body || "Your message shows here. One paragraph per line.",
        },
        { unsubscribeUrl: TEST_UNSUBSCRIBE_URL },
      ),
    [content],
  );

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  async function sendTest() {
    setBusy("test");
    try {
      const { sentTo } = await call<{ sentTo: string }>("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", content }),
      });
      toast.success(`Test sent to ${sentTo}. Check your inbox.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The test didn't send.");
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    setBusy("send");
    try {
      const result = await call<{ id: string; scheduledAt: string | null }>("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", content, scheduledAt }),
      });
      toast.success(
        result.scheduledAt
          ? `Scheduled for ${fmt(result.scheduledAt)}.`
          : `Sending to ${plural(subscribers, "customer")}. Resend delivers it over the next few minutes.`,
      );
      setConfirmOpen(false);
      setContent(EMPTY);
      setWhen("now");
      setLocalTime("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The campaign didn't send.");
      setConfirmOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await call(`/api/admin/campaigns?id=${encodeURIComponent(cancelTarget.id)}`, { method: "DELETE" });
      toast.success("Campaign cancelled. Nobody will get it.");
      setCancelTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel the campaign.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight md:text-3xl">
              <Megaphone aria-hidden className="size-7 text-primary" />
              Campaigns
            </h1>
            <p className="mt-1 max-w-prose text-muted-foreground">
              Email news and offers to customers who said yes to marketing emails. Every campaign has an
              unsubscribe link, and people who opted out never get it.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <Users aria-hidden className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold leading-none tabular-nums">
                {overview ? subscribers.toLocaleString() : "–"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">customers opted in</p>
            </div>
          </div>
        </header>

        {loadError && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
            <div className="flex-1">{loadError}</div>
            <Button size="sm" variant="outline" onClick={load}>
              Try again
            </Button>
          </div>
        )}

        {notSetUp && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>Campaigns aren&apos;t set up yet.</strong> Add{" "}
              {overview!.missingConfig.map((name, i) => (
                <span key={name}>
                  {i > 0 && " and "}
                  <code className="rounded bg-black/5 px-1 py-0.5 text-xs dark:bg-white/10">{name}</code>
                </span>
              ))}{" "}
              to the Vercel environment variables, then redeploy. You can still write a campaign and send yourself a test.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Compose */}
          <section aria-labelledby="compose" className="rounded-xl border bg-card">
            <div className="border-b px-5 py-4 md:px-6">
              <h2 id="compose" className="text-lg font-semibold">
                New campaign
              </h2>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              <Field
                id="subject"
                label="Subject line"
                value={content.subject}
                onChange={set("subject")}
                max={CAMPAIGN_LIMITS.subject}
                placeholder="Free tire shine with any wash this Saturday"
              />
              <Field
                id="preview"
                label="Preview text"
                optional
                hint="The short line shown next to the subject in the inbox."
                value={content.previewText ?? ""}
                onChange={set("previewText")}
                max={CAMPAIGN_LIMITS.previewText}
                placeholder="Saturday only, every wash and every plan"
              />
              <Field
                id="title"
                label="Heading"
                optional
                hint="The big title inside the email. Leave empty to use the subject."
                value={content.title ?? ""}
                onChange={set("title")}
                max={CAMPAIGN_LIMITS.title}
              />

              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-3">
                  <Label htmlFor="body">Message</Label>
                  <Counter value={content.body} max={CAMPAIGN_LIMITS.body} />
                </div>
                <Textarea
                  id="body"
                  rows={10}
                  value={content.body}
                  onChange={(e) => set("body")(e.target.value)}
                  aria-describedby="body-hint"
                  className="resize-y"
                  placeholder={"Hi there,\n\nThis Saturday every wash comes with a free tire shine.\n- Any wash, any plan\n- 8am to 6pm\n\nSee you soon,\nThe Launch Pad team"}
                />
                <p id="body-hint" className="text-xs text-muted-foreground">
                  One paragraph per line. Start a line with “-” for a bullet. A “Book a wash” button is added
                  at the end.
                </p>
              </div>

              <Field
                id="banner"
                label="Banner image link"
                optional
                hint="An image uploaded to our storage (a supabase.co link). Shown at the top."
                value={content.bannerUrl ?? ""}
                onChange={set("bannerUrl")}
                placeholder="https://….supabase.co/storage/v1/object/public/…"
              />

              <fieldset className="space-y-3">
                <legend className="text-sm font-medium">When</legend>
                <RadioGroup value={when} onValueChange={(v) => setWhen(v as "now" | "later")} className="gap-2">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 has-[:checked]:border-primary">
                    <RadioGroupItem value="now" id="when-now" />
                    <span className="text-sm">Send now</span>
                  </label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 has-[:checked]:border-primary">
                    <RadioGroupItem value="later" id="when-later" />
                    <span className="text-sm">Schedule for later</span>
                  </label>
                </RadioGroup>
                {when === "later" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="send-at" className="sr-only">
                      Send date and time
                    </Label>
                    <Input
                      id="send-at"
                      type="datetime-local"
                      value={localTime}
                      onChange={(e) => setLocalTime(e.target.value)}
                      className="h-11 max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your computer&apos;s time zone ({timeZone}). Up to 30 days ahead; you can cancel until it goes out.
                    </p>
                  </div>
                )}
              </fieldset>

              {started && problems.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground" aria-live="polite">
                  {problems.map((p) => (
                    <li key={p}>• {p}</li>
                  ))}
                </ul>
              )}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={sendTest}
                  disabled={!!busy || contentProblems.length > 0}
                >
                  {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Send test to me
                </Button>
                <Button className="h-11" onClick={() => setConfirmOpen(true)} disabled={!canSend}>
                  {when === "later" ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
                  {when === "later" ? "Schedule" : "Send"} to {plural(subscribers, "customer")}
                </Button>
              </div>
              {overview && subscribers === 0 && !notSetUp && (
                <p className="text-right text-xs text-muted-foreground">
                  Nobody has opted in yet, so there&apos;s no one to send to.
                </p>
              )}
            </div>
          </section>

          {/* Preview */}
          <section aria-labelledby="preview-heading" className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-5 py-4 md:px-6">
                <h2 id="preview-heading" className="text-lg font-semibold">
                  Preview
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{content.subject || "Your subject line"}</span>
                  {content.previewText ? ` · ${content.previewText}` : ""}
                </p>
              </div>
              <iframe
                title="Email preview"
                srcDoc={previewHtml}
                sandbox=""
                className="block h-[640px] w-full bg-white"
              />
            </div>
          </section>
        </div>

        {/* History */}
        <section aria-labelledby="history" className="rounded-xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4 md:px-6">
            <h2 id="history" className="text-lg font-semibold">
              Recent campaigns
            </h2>
            <Button variant="ghost" size="sm" onClick={load} aria-label="Refresh recent campaigns">
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
          {overview?.campaignsError ? (
            <p className="p-5 text-sm text-destructive md:px-6">{overview.campaignsError}</p>
          ) : !overview ? (
            <p className="p-5 text-sm text-muted-foreground md:px-6">Loading…</p>
          ) : overview.campaigns.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground md:px-6">
              No campaigns yet. The ones you send or schedule show up here.
            </p>
          ) : (
            <ul className="divide-y">
              {overview.campaigns.map((c) => {
                const state = campaignState(c);
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 md:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{state.when}</p>
                    </div>
                    <Badge variant={state.variant}>{state.label}</Badge>
                    {state.cancellable && (
                      <Button variant="outline" size="sm" onClick={() => setCancelTarget(c)}>
                        Cancel
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="border-t px-5 py-3 text-xs text-muted-foreground md:px-6">
            Opens, clicks and bounces for each campaign are in the Resend dashboard under Broadcasts.
          </p>
        </section>
      </div>

      {/* Confirm send */}
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !busy && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {scheduledAt
                ? `Schedule for ${plural(subscribers, "customer")}?`
                : `Send to ${plural(subscribers, "customer")} now?`}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  “<span className="font-medium text-foreground">{content.subject.trim()}</span>”
                </p>
                <p>
                  {scheduledAt
                    ? `It goes out ${fmt(scheduledAt)}. You can cancel it from Recent campaigns until then.`
                    : "Once it's sent it can't be taken back. Send yourself a test first if you haven't."}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!busy}>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              disabled={!!busy}
              onClick={(e) => {
                e.preventDefault(); // stay open while sending
                send();
              }}
            >
              {busy === "send" && <Loader2 className="size-4 animate-spin" />}
              {scheduledAt ? "Schedule campaign" : "Send campaign"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm cancel */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this scheduled campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              “{cancelTarget?.name}” won&apos;t be sent to anyone. To send it later, write it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep it scheduled</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                cancel();
              }}
            >
              {cancelling && <Loader2 className="size-4 animate-spin" />}
              Cancel campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function campaignState(c: CampaignSummary): {
  label: string;
  when: string;
  variant: "default" | "secondary" | "outline";
  cancellable: boolean;
} {
  if (c.status === "sent") {
    return { label: "Sent", when: `Sent ${fmt(c.sentAt ?? c.createdAt)}`, variant: "secondary", cancellable: false };
  }
  if (c.status === "queued" && c.scheduledAt && new Date(c.scheduledAt).getTime() > Date.now()) {
    return { label: "Scheduled", when: `Goes out ${fmt(c.scheduledAt)}`, variant: "default", cancellable: true };
  }
  if (c.status === "queued") {
    return { label: "Sending", when: `Started ${fmt(c.scheduledAt ?? c.createdAt)}`, variant: "outline", cancellable: false };
  }
  return { label: "Draft", when: `Created ${fmt(c.createdAt)}`, variant: "outline", cancellable: false };
}

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max;
  return (
    <span className={over ? "text-xs font-medium text-destructive tabular-nums" : "text-xs text-muted-foreground tabular-nums"}>
      {value.length}/{max}
    </span>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  max,
  hint,
  optional,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  hint?: string;
  optional?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {optional && <span className="ml-1.5 font-normal text-muted-foreground">(optional)</span>}
        </Label>
        {max && <Counter value={value} max={max} />}
      </div>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-11"
      />
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
