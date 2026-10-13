"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBlogPost, saveBlogPost, unpublishBlogPost } from "@/app/actions/blog";
import { CoverImageField } from "@/components/admin/blog/cover-image-field";
import { RichTextEditor } from "@/components/admin/blog/rich-text-editor";
import { SeoChecklistPanel } from "@/components/admin/blog/seo-checklist-panel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CTA_DESTINATIONS, ctaFor, normaliseCta, type BlogCta } from "@/lib/blog/cta";
import { BLOG_LIMITS, type BlogBody } from "@/lib/blog/post";
import { EMPTY_RICH_DOC, type RichDoc } from "@/lib/blog/rich-text";
import { META_DESCRIPTION_MAX, META_DESCRIPTION_MIN, SEO_TITLE_MAX, seoChecklist } from "@/lib/blog/seo-checklist";
import { SITE_HOST } from "@/lib/blog/site";
import { slugify } from "@/lib/blog/slug";
import { cn } from "@/lib/utils";

const INTERNAL_HOSTS = [SITE_HOST];

export type BlogEditorInitial = {
  id?: string;
  title: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  excerpt: string;
  slug: string;
  coverImage: string | null;
  coverImageAlt: string;
  categoryId: string;
  author: string;
  body: BlogBody;
  faq: { question: string; answer: string }[];
  cta: BlogCta | null;
  published: boolean;
  /** Ever published → slug locked. */
  slugLocked: boolean;
};

type Section = { key: string; heading: string; content: RichDoc };
type Faq = { key: string; question: string; answer: string };

/**
 * Keys for rows ADDED in the browser (click handlers only). Never call this
 * during render or in a useState initialiser: the server and the browser would
 * each draw a different random value, the section ids built from it would not
 * match, and React reports a hydration error. Rows that exist on first render
 * are keyed by position instead (`initialKey`).
 */
const key = () => Math.random().toString(36).slice(2, 10);
const initialKey = (kind: "s" | "f", i: number) => `${kind}${i}`;

const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * The templated post editor. Not a page builder: the fields ARE the template
 * (headline and search appearance → cover → intro → H2 sections → FAQs →
 * call to action), and the SEO checklist beside it runs the same pure function
 * the publish action uses.
 */
export function BlogEditor({
  initial,
  categories,
}: {
  initial: BlogEditorInitial;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [metaDescription, setMetaDescription] = useState(initial.metaDescription);
  const [focusKeyword, setFocusKeyword] = useState(initial.focusKeyword);
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [slug, setSlug] = useState(initial.slug);
  // A fresh post's address follows its title until someone edits it.
  const [slugTouched, setSlugTouched] = useState(
    initial.slugLocked || (!!initial.slug && initial.slug !== slugify(initial.title)),
  );
  const [coverImage, setCoverImage] = useState(initial.coverImage);
  const [coverImageAlt, setCoverImageAlt] = useState(initial.coverImageAlt);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [author, setAuthor] = useState(initial.author);
  const [intro, setIntro] = useState(initial.body.intro);
  const [sections, setSections] = useState<Section[]>(() =>
    initial.body.sections.length
      ? initial.body.sections.map((s, i) => ({ ...s, key: initialKey("s", i) }))
      : [{ key: initialKey("s", 0), heading: "", content: EMPTY_RICH_DOC }],
  );
  const [faq, setFaq] = useState<Faq[]>(() => initial.faq.map((f, i) => ({ ...f, key: initialKey("f", i) })));
  const [ctaDestination, setCtaDestination] = useState<string>(initial.cta?.destination ?? "");
  const [ctaButtonText, setCtaButtonText] = useState(initial.cta?.buttonText ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const effectiveSlug = initial.slugLocked ? initial.slug : slugTouched ? slug : slugify(title);

  const payload = useMemo(
    () => ({
      id: initial.id,
      title,
      seoTitle,
      metaDescription,
      focusKeyword,
      excerpt,
      slug: effectiveSlug,
      coverImage,
      coverImageAlt,
      categoryId: categoryId || null,
      author,
      body: { intro, sections: sections.map(({ heading, content }) => ({ heading, content })) },
      faq: faq.map(({ question, answer }) => ({ question, answer })),
      cta: { destination: ctaDestination || null, buttonText: ctaButtonText },
    }),
    [
      initial.id,
      title,
      seoTitle,
      metaDescription,
      focusKeyword,
      excerpt,
      effectiveSlug,
      coverImage,
      coverImageAlt,
      categoryId,
      author,
      intro,
      sections,
      faq,
      ctaDestination,
      ctaButtonText,
    ],
  );

  const checklist = useMemo(
    () =>
      seoChecklist({
        title,
        seoTitle,
        metaDescription,
        slug: effectiveSlug,
        focusKeyword,
        coverImage,
        coverImageAlt,
        body: payload.body,
        faq: payload.faq.filter((f) => f.question.trim() && f.answer.trim()),
        cta: normaliseCta(payload.cta),
        internalHosts: INTERNAL_HOSTS,
        slugLocked: initial.slugLocked,
      }),
    [title, seoTitle, metaDescription, effectiveSlug, focusKeyword, coverImage, coverImageAlt, payload, initial.slugLocked],
  );

  // Dirty tracking against what the server last accepted, so leaving the page
  // with unsaved work asks first.
  const serialised = JSON.stringify(payload);
  const [savedSnapshot, setSavedSnapshot] = useState(serialised);
  const dirty = serialised !== savedSnapshot;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const isPublished = initial.published;

  function submit(intent: "save" | "publish") {
    setFormError(null);
    setFieldErrors({});
    setBlockers([]);
    startTransition(async () => {
      const result = await saveBlogPost(payload, intent);
      if (!result.ok) {
        setFormError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        setBlockers(result.blockers ?? []);
        toast.error(result.error);
        return;
      }
      setSavedSnapshot(serialised);
      if (intent === "publish" && !isPublished) toast.success("Published — the post is live");
      else toast.success(isPublished ? "Saved — the live post is updated" : "Draft saved");
      if (!initial.id) router.replace(`/admin/blog/${result.id}`);
      else router.refresh();
    });
  }

  function unpublish() {
    if (!initial.id) return;
    startTransition(async () => {
      const result = await unpublishBlogPost(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Unpublished — the post is hidden from the site");
      router.refresh();
    });
  }

  function remove() {
    if (!initial.id) return;
    startTransition(async () => {
      const result = await deleteBlogPost(initial.id!);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSavedSnapshot(serialised);
      toast.success("Draft deleted");
      router.replace("/admin/blog");
    });
  }

  function updateSection(k: string, patch: Partial<Section>) {
    setSections((list) => list.map((s) => (s.key === k ? { ...s, ...patch } : s)));
  }
  function moveSection(index: number, by: -1 | 1) {
    setSections((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  }
  function updateFaq(k: string, patch: Partial<Faq>) {
    setFaq((list) => list.map((f) => (f.key === k ? { ...f, ...patch } : f)));
  }
  function moveFaq(index: number, by: -1 | 1) {
    setFaq((list) => {
      const next = [...list];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  }

  const seoTitleLength = (seoTitle.trim() || title.trim()).length;
  const metaLength = metaDescription.trim().length;
    const ctaPreview = ctaFor(normaliseCta(payload.cta));

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="grid min-w-0 gap-8">
        {/* 1 — Headline and search appearance */}
        <Step n={1} title="Headline and search appearance" hint="What readers and Google see first.">
          <Field
            label="Post title (the headline)"
            hint="Write it for a person, not a search engine — a clear promise of what they will learn."
            error={fieldErrors.title}
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={BLOG_LIMITS.title}
              placeholder="How often should you wash your car in Houston?"
            />
          </Field>

          <Field
            label="Focus keyword"
            hint="The one phrase someone would type into Google to find this post. The checklist looks for it."
            error={fieldErrors.focusKeyword}
          >
            <Input
              value={focusKeyword}
              onChange={(e) => setFocusKeyword(e.target.value)}
              maxLength={BLOG_LIMITS.focusKeyword}
              placeholder="car wash houston"
            />
          </Field>

          <Field
            label="SEO title"
            hint="The blue link in Google results. Leave empty to use the post title. Put the keyword near the start."
            error={fieldErrors.seoTitle}
            aside={
              <Counter
                value={seoTitleLength}
                status={seoTitleLength === 0 ? "idle" : seoTitleLength <= SEO_TITLE_MAX ? "ok" : "warn"}
                suffix={`/${SEO_TITLE_MAX}`}
              />
            }
          >
            <Input
              value={seoTitle}
              onChange={(e) => setSeoTitle(e.target.value)}
              maxLength={BLOG_LIMITS.seoTitle}
              placeholder={title || "How often to wash your car in Houston | Car care tips"}
            />
          </Field>

          <Field
            label="Meta description"
            hint="The two lines under the link in Google. Sell the click: what will they get from reading?"
            error={fieldErrors.metaDescription}
            aside={
              <Counter
                value={metaLength}
                status={
                  metaLength === 0
                    ? "idle"
                    : metaLength >= META_DESCRIPTION_MIN && metaLength <= META_DESCRIPTION_MAX
                      ? "ok"
                      : "warn"
                }
                suffix={` · aim ${META_DESCRIPTION_MIN}–${META_DESCRIPTION_MAX}`}
              />
            }
          >
            <Textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              maxLength={BLOG_LIMITS.metaDescription}
              rows={3}
              placeholder="Sun, pollen and road grime: how often a Houston car really needs washing, and when to add wax or book a detail."
            />
          </Field>

          <Field
            label="Web address"
            hint={
              initial.slugLocked
                ? "Fixed — this post has been published, and changing its address would break every link to it."
                : "Made from the title. Short and keyword-led is best. It is fixed for good once you publish."
            }
            error={fieldErrors.slug}
          >
            <div className="flex items-center overflow-hidden rounded-xl border border-border bg-card focus-within:border-ring">
              <span className="shrink-0 border-r border-border bg-muted/60 px-3 py-3 tabular-nums text-xs text-muted-foreground">
                /blog/
              </span>
              <input
                value={effectiveSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                }}
                onBlur={() => setSlug((s) => slugify(s))}
                readOnly={initial.slugLocked}
                aria-label="Web address"
                className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-foreground outline-none read-only:text-muted-foreground"
              />
            </div>
          </Field>

          <GooglePreview
            host={SITE_HOST}
            slug={effectiveSlug}
            title={seoTitle.trim() || title.trim() || "Your SEO title"}
            description={metaDescription.trim() || "Your meta description will appear here."}
          />
        </Step>

        {/* 2 — Cover */}
        <Step n={2} title="Cover image" hint="Shown at the top of the post and when it is shared on social media.">
          <CoverImageField
            url={coverImage}
            alt={coverImageAlt}
            onUrlChange={setCoverImage}
            onAltChange={setCoverImageAlt}
            error={fieldErrors.coverImage}
          />
        </Step>

        {/* 3 — Intro */}
        <Step
          n={3}
          title="Introduction"
          hint="Two or three sentences: who this is for and what they will learn. Use the focus keyword in the first sentence."
        >
          <Textarea
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            maxLength={BLOG_LIMITS.intro}
            rows={5}
            className="field-sizing-content max-h-[24rem]"
            aria-label="Introduction"
            placeholder="Houston sun, pollen and summer storms are hard on paint…"
          />
          <p className="text-xs text-muted-foreground">Leave a blank line between paragraphs.</p>
        </Step>

        {/* 4 — Sections */}
        <Step
          n={4}
          title="Sections"
          hint="Each section is a sub-heading (H2) and its text. Phrase headings as the questions readers ask — they become the table of contents."
        >
          <ol className="grid gap-6">
            {sections.map((section, i) => (
              <li key={section.key} className="rounded-xl border border-border bg-muted/40 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <span id={`section-${section.key}`} className="tabular-nums text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    {`Section ${i + 1}`}
                  </span>
                  <ReorderControls
                    index={i}
                    count={sections.length}
                    noun="section"
                    onMove={(by) => moveSection(i, by)}
                    onRemove={
                      sections.length > 1 ? () => setSections((list) => list.filter((s) => s.key !== section.key)) : undefined
                    }
                  />
                </div>
                <Input
                  value={section.heading}
                  onChange={(e) => updateSection(section.key, { heading: e.target.value })}
                  maxLength={BLOG_LIMITS.sectionHeading}
                  placeholder="How often should you wash your car?"
                  aria-label={`Section ${i + 1} heading`}
                  className="mt-3 text-base font-medium"
                />
                <div className="mt-3">
                  <RichTextEditor
                    initialContent={section.content}
                    onChange={(content) => updateSection(section.key, { content })}
                    labelledBy={`section-${section.key}`}
                  />
                </div>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="outline"
            onClick={() => setSections((list) => [...list, { key: key(), heading: "", content: EMPTY_RICH_DOC }])}
            disabled={sections.length >= BLOG_LIMITS.sections}
            className="justify-self-start"
          >
            <Plus className="size-4" aria-hidden /> Add a section
          </Button>
        </Step>

        {/* 5 — FAQ */}
        <Step
          n={5}
          title="Frequently asked questions"
          hint="Optional. Real questions people ask, each answered in two or three sentences. Shown at the end of the post and marked up for Google."
        >
          {faq.length > 0 && (
            <ol className="grid gap-4">
              {faq.map((f, i) => (
                <li key={f.key} className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="tabular-nums text-xs uppercase tracking-[0.14em] text-muted-foreground">{`Question ${i + 1}`}</span>
                    <ReorderControls
                      index={i}
                      count={faq.length}
                      noun="question"
                      onMove={(by) => moveFaq(i, by)}
                      onRemove={() => setFaq((list) => list.filter((x) => x.key !== f.key))}
                    />
                  </div>
                  <Input
                    value={f.question}
                    onChange={(e) => updateFaq(f.key, { question: e.target.value })}
                    maxLength={BLOG_LIMITS.faqQuestion}
                    placeholder="Is a touchless wash safe for ceramic coatings?"
                    aria-label={`Question ${i + 1}`}
                  />
                  <Textarea
                    value={f.answer}
                    onChange={(e) => updateFaq(f.key, { answer: e.target.value })}
                    maxLength={BLOG_LIMITS.faqAnswer}
                    rows={3}
                    placeholder="Yes — a touchless wash is the gentlest option…"
                    aria-label={`Answer ${i + 1}`}
                  />
                  {(!f.question.trim() || !f.answer.trim()) && (f.question.trim() || f.answer.trim()) && (
                    <p className="text-xs text-amber-700">A question needs both halves — this one will be left out until it has.</p>
                  )}
                </li>
              ))}
            </ol>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => setFaq((list) => [...list, { key: key(), question: "", answer: "" }])}
            disabled={faq.length >= BLOG_LIMITS.faqs}
            className="justify-self-start"
          >
            <Plus className="size-4" aria-hidden /> Add a question
          </Button>
        </Step>

        {/* 6 — CTA */}
        <Step
          n={6}
          title="Call to action"
          hint="Where readers go next. Pick the service the post is about — most posts should lead to booking."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Send readers to">
              <select
                value={ctaDestination}
                onChange={(e) => setCtaDestination(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Default — express detailing booking</option>
                {CTA_DESTINATIONS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Button text" hint="Leave empty for the default.">
              <Input
                value={ctaButtonText}
                onChange={(e) => setCtaButtonText(e.target.value)}
                maxLength={BLOG_LIMITS.ctaButton}
                placeholder={ctaFor(normaliseCta({ destination: ctaDestination || null, buttonText: "" })).buttonText}
              />
            </Field>
          </div>
          <div className="rounded-xl bg-blue-900 p-5 text-white">
            <p className="font-semibold">{ctaPreview.heading}</p>
            <p className="mt-1 text-sm text-white/80">{ctaPreview.body}</p>
            <p className="mt-3 text-xs text-white/70">
              {`Button “${ctaPreview.buttonText}” links to `}
              <a href={ctaPreview.href} target="_blank" rel="noreferrer" className="tabular-nums underline underline-offset-2">
                {ctaPreview.href}
              </a>
            </p>
          </div>
        </Step>

        {/* 7 — Listing details */}
        <Step n={7} title="Listing details" hint="How the post appears on the blog's front page.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Category"
              hint={categories.length === 0 ? "No categories yet — add some under Categories." : undefined}
              error={fieldErrors.categoryId}
            >
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={SELECT_CLASS}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Author" hint="Shown under the title.">
              <Input value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={BLOG_LIMITS.author} />
            </Field>
          </div>
          <Field
            label="Summary (optional)"
            hint="One or two sentences for the blog listing and under the headline. Falls back to the meta description."
          >
            <Textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={BLOG_LIMITS.excerpt}
              rows={2}
            />
          </Field>
        </Step>
      </div>

      {/* Actions + checklist */}
      <aside className="min-w-0">
        <div className="grid gap-5 xl:sticky xl:top-6">
          <section aria-label="Publishing" className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <span
                className={cn(
                  "inline-block size-2 rounded-full",
                  isPublished ? "bg-green-600" : "bg-stone",
                )}
                aria-hidden
              />
              <span className="font-medium">{isPublished ? "Published" : initial.slugLocked ? "Unpublished" : "Draft"}</span>
              {dirty && <span className="text-xs text-amber-700">· unsaved changes</span>}
            </p>

            <div className="mt-4 grid gap-2">
              {isPublished ? (
                <Button onClick={() => submit("save")} disabled={pending} className="bg-blue-900 text-white hover:bg-blue-800">
                  {pending ? "Saving…" : "Save changes"}
                </Button>
              ) : (
                <>
                  <Button onClick={() => submit("publish")} disabled={pending || !checklist.canPublish} className="bg-blue-900 text-white hover:bg-blue-800">
                    {pending ? "Working…" : "Publish"}
                  </Button>
                  <Button variant="outline" onClick={() => submit("save")} disabled={pending}>
                    Save draft
                  </Button>
                </>
              )}
              {initial.id && (
                <Button variant="ghost" asChild>
                  <Link href={`/blog/preview/${initial.id}`} target="_blank" rel="noreferrer">
                    <Eye className="size-4" aria-hidden /> {dirty ? "Preview last save" : "Preview"}
                  </Link>
                </Button>
              )}
              {isPublished && (
                <Button variant="ghost" asChild>
                  <Link href={`/blog/${initial.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4" aria-hidden /> View live post
                  </Link>
                </Button>
              )}
            </div>

            {!isPublished && !checklist.canPublish && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Publishing unlocks when everything under “Needed to publish” is ticked. You can save a draft at any time.
              </p>
            )}

            {(formError || blockers.length > 0) && (
              <div role="alert" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <p>{formError}</p>
                {blockers.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {(isPublished || initial.id) && (
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-4">
                {isPublished && (
                  <button
                    type="button"
                    onClick={unpublish}
                    disabled={pending}
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    Unpublish
                  </button>
                )}
                {initial.id && !initial.slugLocked && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" aria-hidden /> Delete draft
                  </button>
                )}
              </div>
            )}
          </section>

          <SeoChecklistPanel result={checklist} />
        </div>
      </aside>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>
              {`“${initial.title}” will be removed permanently. This cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Keep draft
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? "Deleting…" : "Delete draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-7">
      <header className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-900 tabular-nums text-xs text-white"
        >
          {n}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{hint}</p>
        </div>
      </header>
      <div className="mt-6 grid gap-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  aside,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {aside}
      </span>
      {children}
      {error ? (
        <span className="text-xs text-destructive">{error}</span>
      ) : hint ? (
        <span className="text-xs leading-relaxed text-muted-foreground">{hint}</span>
      ) : null}
    </label>
  );
}

function Counter({
  value,
  status,
  suffix,
}: {
  value: number;
  status: "idle" | "ok" | "warn";
  suffix: string;
}) {
  return (
    <span
      className={cn(
        "shrink-0 tabular-nums text-xs",
        status === "ok" && "text-green-700",
        status === "warn" && "text-amber-700",
        status === "idle" && "text-muted-foreground",
      )}
    >
      {`${value}${suffix}`}
    </span>
  );
}

function ReorderControls({
  index,
  count,
  noun,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  noun: string;
  onMove: (by: -1 | 1) => void;
  onRemove?: () => void;
}) {
  const btn =
    "flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30";
  return (
    <span className="flex items-center gap-0.5">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${noun} ${index + 1} up`}>
        <ArrowUp className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        className={btn}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={`Move ${noun} ${index + 1} down`}
      >
        <ArrowDown className="size-4" aria-hidden />
      </button>
      {onRemove && (
        <button type="button" className={cn(btn, "hover:text-destructive")} onClick={onRemove} aria-label={`Remove ${noun} ${index + 1}`}>
          <Trash2 className="size-4" aria-hidden />
        </button>
      )}
    </span>
  );
}

function GooglePreview({
  host,
  slug,
  title,
  description,
}: {
  host: string;
  slug: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">How it might look on Google</p>
      <p className="mt-3 truncate text-xs text-muted-foreground">{`${host} › blog › ${slug || "…"}`}</p>
      <p className="mt-1 line-clamp-1 text-base text-foreground">
        {title.length > SEO_TITLE_MAX ? `${title.slice(0, SEO_TITLE_MAX - 1).trimEnd()}…` : title}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
        {description.length > META_DESCRIPTION_MAX
          ? `${description.slice(0, META_DESCRIPTION_MAX - 1).trimEnd()}…`
          : description}
      </p>
    </div>
  );
}
