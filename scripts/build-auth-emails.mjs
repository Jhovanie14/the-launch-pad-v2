// Writes the Supabase account email templates to supabase/templates/.
// Run: node scripts/build-auth-emails.mjs
// Then paste each file into Supabase → Authentication → Email Templates.
import { mkdirSync, writeFileSync } from "node:fs";
import { createJiti } from "jiti";

process.env.NEXT_PUBLIC_SITE_URL ??= "https://www.thelaunchpadwash.com";
const jiti = createJiti(import.meta.url, { alias: { "@": process.cwd() } });
const { buildAuthTemplates } = await jiti.import("../lib/email/auth-templates.ts");

mkdirSync("supabase/templates", { recursive: true });
for (const t of buildAuthTemplates()) {
  writeFileSync(`supabase/templates/${t.file}`, t.html);
  console.log(`${t.dashboardName.padEnd(22)} supabase/templates/${t.file}   subject: ${t.subject}`);
}
