"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { FOCUS_ON_LIGHT, SURFACE } from "@/components/booking/ui/focus";
import { DEFAULT_POUCH, type Pouch } from "@/lib/shipping/parcel";
import { getShippingSettings } from "@/lib/shipping/settings";

type PouchDraft = { name: string; length_in: string; width_in: string; height_in: string; max_weight_oz: string };

const toDraft = (p: Pouch): PouchDraft => ({
  name: p.name,
  length_in: String(p.length_in),
  width_in: String(p.width_in),
  height_in: String(p.height_in),
  max_weight_oz: String(p.max_weight_oz),
});

const INPUT = cn("h-11 w-full rounded-lg bg-paper px-3 text-base ring-1 ring-line placeholder:text-ink-subtle", FOCUS_ON_LIGHT);
const MAX_POUCHES = 5;
const QUICK_STATES = [
  { code: "AK", name: "Alaska" },
  { code: "HI", name: "Hawaii" },
];

/** Pouches staff pack into and the states we don't ship to. Saved to store_settings. */
export function ShippingSettingsPanel() {
  const supabase = createClient();
  const [pouches, setPouches] = useState<PouchDraft[]>([toDraft(DEFAULT_POUCH)]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [other, setOther] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getShippingSettings(supabase).then((s) => {
      setPouches(s.pouches.map(toDraft));
      setExcluded(s.excludedStates.filter((c) => QUICK_STATES.some((q) => q.code === c)));
      setOther(s.excludedStates.filter((c) => !QUICK_STATES.some((q) => q.code === c)).join(", "));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPouch = (i: number, key: keyof PouchDraft, value: string) =>
    setPouches((list) => list.map((p, j) => (j === i ? { ...p, [key]: value } : p)));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const excluded_states = [
        ...excluded,
        ...other
          .split(/[\s,]+/)
          .map((c) => c.trim())
          .filter(Boolean),
      ];
      const res = await fetch("/api/admin/store-settings/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pouches: pouches.map((p) => ({
            name: p.name,
            length_in: Number(p.length_in),
            width_in: Number(p.width_in),
            height_in: Number(p.height_in),
            max_weight_oz: Number(p.max_weight_oz),
          })),
          excluded_states,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the settings");
      toast.success("Shipping settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <details className={cn(SURFACE, "p-4 sm:p-5")}>
      <summary className={cn("cursor-pointer rounded text-base font-bold", FOCUS_ON_LIGHT)}>Shipping settings</summary>
      <form onSubmit={save} className="mt-4 space-y-5">
        <fieldset>
          <legend className="text-sm font-semibold">Pouches</legend>
          <p className="text-sm text-ink-muted">
            The pouches Armando packs into. Each order goes in the smallest pouch that holds its weight.
          </p>
          <ul className="mt-3 space-y-3">
            {pouches.map((p, i) => (
              <li key={i} className="grid grid-cols-2 gap-2 rounded-xl bg-canvas p-3 ring-1 ring-line sm:grid-cols-[2fr_repeat(4,1fr)_auto]">
                <label className="col-span-2 sm:col-span-1">
                  <span className="text-xs font-semibold text-ink-muted">Name</span>
                  <input value={p.name} onChange={(e) => setPouch(i, "name", e.target.value)} maxLength={40} className={INPUT} />
                </label>
                {(
                  [
                    ["length_in", "Length (in)"],
                    ["width_in", "Width (in)"],
                    ["height_in", "Height (in)"],
                    ["max_weight_oz", "Holds up to (oz)"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key}>
                    <span className="text-xs font-semibold text-ink-muted">{label}</span>
                    <input inputMode="decimal" value={p[key]} onChange={(e) => setPouch(i, key, e.target.value)} className={INPUT} />
                  </label>
                ))}
                <button
                  type="button"
                  aria-label={`Remove pouch ${p.name || i + 1}`}
                  disabled={pouches.length === 1}
                  onClick={() => setPouches((list) => list.filter((_, j) => j !== i))}
                  className={cn(
                    "inline-flex size-11 items-center justify-center self-end rounded-lg text-ink-muted hover:bg-line-soft hover:text-ink disabled:opacity-40",
                    FOCUS_ON_LIGHT,
                  )}
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          {pouches.length < MAX_POUCHES && (
            <button
              type="button"
              onClick={() => setPouches((list) => [...list, { name: "", length_in: "", width_in: "", height_in: "", max_weight_oz: "" }])}
              className={cn("mt-2 inline-flex h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-brand-blue hover:bg-line-soft", FOCUS_ON_LIGHT)}
            >
              <Plus aria-hidden className="size-4" />
              Add a pouch
            </button>
          )}
        </fieldset>

        <fieldset>
          <legend className="text-sm font-semibold">Don&apos;t ship to</legend>
          <p className="text-sm text-ink-muted">US territories and military addresses are never offered.</p>
          <div className="mt-2 flex flex-wrap gap-4">
            {QUICK_STATES.map((s) => (
              <label key={s.code} className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={excluded.includes(s.code)}
                  onChange={(e) => setExcluded((list) => (e.target.checked ? [...list, s.code] : list.filter((c) => c !== s.code)))}
                  className={cn("size-5 accent-brand-blue", FOCUS_ON_LIGHT)}
                />
                {s.name}
              </label>
            ))}
          </div>
          <label className="mt-2 block">
            <span className="text-xs font-semibold text-ink-muted">Other states (two-letter codes, separated by commas)</span>
            <input value={other} onChange={(e) => setOther(e.target.value)} placeholder="For example: NY, NJ" className={INPUT} />
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={saving}
          className={cn(
            "inline-flex h-11 items-center rounded-lg bg-night px-4 text-sm font-bold text-on-night hover:bg-dusk disabled:opacity-60",
            FOCUS_ON_LIGHT,
          )}
        >
          Save shipping settings
        </button>
      </form>
    </details>
  );
}
