/**
 * Upgrade pre-template blog posts from the migration's first-pass conversion
 * (paragraphs only) to legacyContentToBody's structured one: real section
 * headings, lists, bold, and no repeated title.
 *
 * Only touches posts that are UNTOUCHED since the migration — whose stored
 * body is still exactly the first-pass result. Anything an editor has saved
 * is left alone. The legacy `content` column is the source and is never
 * modified, so this can be re-run.
 *
 *   node node_modules/jiti/lib/jiti-cli.mjs scripts/reconvert-legacy-blog.ts           # dry run
 *   node node_modules/jiti/lib/jiti-cli.mjs scripts/reconvert-legacy-blog.ts --apply   # write
 *
 * Order does not matter against supabase/migrations/20261008000000_blog_updated_at.sql:
 * while the dashboard's updated_at trigger exists, these writes re-stamp the
 * posts as "updated today", and that migration restores every date stamped on
 * 7–8 Oct 2026.
 */
import { createClient } from "@supabase/supabase-js";
import { introParagraphs, legacyContentToBody, normaliseBody, type BlogBody } from "../lib/blog/post";

process.loadEnvFile(".env.local");
const apply = process.argv.includes("--apply");

/** The SQL backfill's rule, reproduced to recognise bodies nobody has edited. */
function firstPassBody(content: string | null): BlogBody {
  const paragraphs = introParagraphs((content ?? "").replace(/\r\n?/g, "\n"));
  if (paragraphs.length === 0) return { intro: "", sections: [] };
  const [first, ...rest] = paragraphs;
  return normaliseBody({
    intro: first.slice(0, 3000),
    sections: rest.length
      ? [
          {
            heading: "",
            content: { type: "doc", content: rest.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })) },
          },
        ]
      : [],
  });
}

function countBlocks(body: BlogBody, type: string): number {
  return body.sections.reduce((n, s) => n + s.content.content.filter((b) => b.type === type).length, 0);
}

async function main() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: posts, error } = await db
    .from("blog_posts")
    .select("id, slug, title, content, body, updated_at, published_at, created_at")
    .order("created_at");
  if (error) throw error;

  const eligible = posts.filter(
    (p) => p.content?.trim() && JSON.stringify(normaliseBody(p.body)) === JSON.stringify(firstPassBody(p.content)),
  );
  console.log(`${posts.length} posts, ${eligible.length} untouched since the migration${apply ? "" : " (dry run)"}\n`);

  for (const p of eligible) {
    const next = legacyContentToBody(p.content, p.title);
    const headed = next.sections.filter((s) => s.heading).length;
    console.log(
      `${p.slug.slice(0, 60).padEnd(60)}  ${String(headed).padStart(2)} headings  ${String(countBlocks(next, "bulletList")).padStart(2)} lists  intro ${next.intro.length} chars`,
    );
  }

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to write.");
    return;
  }

  for (const p of eligible) {
    const { error: writeError } = await db
      .from("blog_posts")
      .update({ body: legacyContentToBody(p.content, p.title) })
      .eq("id", p.id)
      .eq("updated_at", p.updated_at); // skip it if someone saved it in the meantime
    if (writeError) throw writeError;
  }
  console.log(`\nUpdated ${eligible.length} post(s). Public pages pick it up within 5 minutes.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
