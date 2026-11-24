// Product text as the shop shows it. The owner types names and descriptions
// in admin (often pasted from a marketplace listing, with emoji); these pure
// helpers make them readable without ever changing the stored text.

/** The short display name when set, otherwise the full name. */
export function productTitle(p: { name: string; display_name?: string | null }): string {
  return p.display_name?.trim() || p.name;
}

// Pictographs plus the joiners and variation selectors that build them.
const EMOJI = /[\p{Extended_Pictographic}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}]/gu;
// "Size: 15.75 × 15.75 inches" — a short label, then a short value.
const SPEC_LINE = /^([A-Za-z][A-Za-z &/]{0,23}):\s*(.+)$/;
const MAX_SPEC_VALUE = 60;

export interface ParsedDescription {
  about: string[];
  specs: { label: string; value: string }[];
}

/** Labelled lines become specs; everything else becomes paragraphs. */
export function parseDescription(text: string | null): ParsedDescription {
  const about: string[] = [];
  const specs: ParsedDescription["specs"] = [];
  for (const raw of (text ?? "").split(/\r?\n/)) {
    const line = raw.replace(EMOJI, "").replace(/\s+/g, " ").trim();
    if (!line) continue;
    const spec = line.match(SPEC_LINE);
    if (spec && spec[2].length <= MAX_SPEC_VALUE) {
      specs.push({ label: spec[1].trim(), value: spec[2].trim() });
    } else {
      about.push(line);
    }
  }
  return { about, specs };
}

/** The card's detail line: weight and size, when the description has them. */
export function cardMeta(text: string | null): string | null {
  const { specs } = parseDescription(text);
  const find = (re: RegExp) => specs.find((s) => re.test(s.label))?.value;
  const parts = [find(/^weight$/i), find(/^(size|dimensions?)$/i)].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
