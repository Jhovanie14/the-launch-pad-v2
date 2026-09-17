"use client";

import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ImageOff,
  PackageX,
  Star,
  Boxes,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  LOW_STOCK_THRESHOLD,
  contentGaps,
  inventorySummary,
} from "@/lib/products/inventory";
import type { ProductRow } from "@/types/db";

/**
 * Catalog health at a glance.
 *
 * These are single headline numbers with nothing to compare against over time,
 * so they are stat tiles rather than charts — a bar chart of "4 featured, 2 out
 * of stock" would add ink without adding meaning.
 *
 * The three tiles that carry a state (out of stock, low stock, needs content)
 * always render an icon and a written label alongside the count, so the state
 * is never communicated by colour alone. When a count is zero the tile goes
 * green and says so, rather than sitting silently at 0.
 */

type Tone = "neutral" | "good" | "warning" | "critical";

const TONE_STYLES: Record<Tone, string> = {
  neutral: "text-muted-foreground",
  good: "text-emerald-600",
  warning: "text-amber-600",
  critical: "text-destructive",
};

function StatTile({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 shrink-0 ${TONE_STYLES[tone]}`} />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
        </div>
        {/* The number stays in body ink; the icon beside it carries the state. */}
        <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ProductStats({ products }: { products: ProductRow[] }) {
  const summary = inventorySummary(products);
  const gaps = contentGaps(products);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatTile
        label="Products"
        value={summary.total}
        detail={`${summary.active} live · ${summary.hidden} hidden`}
        icon={Boxes}
      />

      <StatTile
        label="Featured"
        value={summary.featured}
        detail={
          summary.featured > 6
            ? "More than 6 weakens the page"
            : "3–6 works best"
        }
        icon={Star}
        tone={summary.featured > 6 ? "warning" : "neutral"}
      />

      <StatTile
        label="Out of stock"
        value={summary.outOfStock}
        detail={summary.outOfStock === 0 ? "Everything in stock" : "Not buyable"}
        icon={summary.outOfStock === 0 ? CheckCircle2 : PackageX}
        tone={summary.outOfStock === 0 ? "good" : "critical"}
      />

      <StatTile
        label="Low stock"
        value={summary.lowStock}
        detail={
          summary.lowStock === 0
            ? "None running low"
            : `${LOW_STOCK_THRESHOLD} or fewer left`
        }
        icon={summary.lowStock === 0 ? CheckCircle2 : AlertTriangle}
        tone={summary.lowStock === 0 ? "good" : "warning"}
      />

      <StatTile
        label="Stock value"
        value={`$${summary.inventoryValue.toFixed(2)}`}
        detail="At selling price"
        icon={DollarSign}
      />

      <StatTile
        label="Needs content"
        value={gaps.incompleteProducts}
        detail={
          gaps.incompleteProducts === 0
            ? "All complete"
            : `${gaps.missingImage} image · ${gaps.missingVideo} video · ${gaps.missingDescription} copy`
        }
        icon={gaps.incompleteProducts === 0 ? CheckCircle2 : ImageOff}
        tone={gaps.incompleteProducts === 0 ? "good" : "warning"}
      />
    </div>
  );
}
