"use client";

import { AlertTriangle, Check, X } from "lucide-react";
import type { ChecklistResult, CheckItem } from "@/lib/blog/seo-checklist";
import { cn } from "@/lib/utils";

/**
 * The live SEO checklist. Renders lib/blog/seo-checklist.ts's result — the
 * same function the publish action runs — so a green panel and a successful
 * publish always agree.
 */
export function SeoChecklistPanel({ result }: { result: ChecklistResult }) {
  const required = result.items.filter((i) => i.required);
  const advice = result.items.filter((i) => !i.required);
  const passed = advice.filter((i) => i.status === "pass").length;

  return (
    <section aria-labelledby="seo-checklist" className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 id="seo-checklist" className="text-lg font-semibold text-foreground">
        SEO checklist
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Updates as you type. Only the first group is needed to publish — the rest is advice.
      </p>

      <h3 className="mt-5 tabular-nums text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {result.canPublish ? "Ready to publish" : `Needed to publish · ${result.blockers.length} to go`}
      </h3>
      <ul className="mt-2 grid gap-2">
        {required.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>

      <h3 className="mt-6 tabular-nums text-xs uppercase tracking-[0.14em] text-muted-foreground">
        {`Recommendations · ${passed} of ${advice.length}`}
      </h3>
      <ul className="mt-2 grid gap-2">
        {advice.map((item) => (
          <Row key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function Row({ item }: { item: CheckItem }) {
  const Icon = item.status === "pass" ? Check : item.status === "fail" ? X : AlertTriangle;
  return (
    <li className="flex gap-2.5">
      <span
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          item.status === "pass" && "bg-green-100 text-green-700",
          item.status === "warn" && "bg-amber-50 text-amber-700",
          item.status === "fail" && "bg-destructive/10 text-destructive",
        )}
      >
        <Icon className="size-3" aria-hidden />
        <span className="sr-only">
          {item.status === "pass" ? "Done:" : item.status === "fail" ? "Needed:" : "Suggestion:"}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{item.label}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{item.detail}</span>
      </span>
    </li>
  );
}
