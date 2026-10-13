"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createBlogCategory,
  deleteBlogCategory,
  updateBlogCategory,
  type BlogCategoryFormState,
} from "@/app/actions/blog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminBlogCategory } from "@/lib/blog/admin-queries";

const initial: BlogCategoryFormState = { ok: false };

/** Add a category. The web address is made from the name and then fixed. */
export function NewCategoryForm() {
  const [state, action, pending] = useActionState(createBlogCategory, initial);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const handled = useRef<BlogCategoryFormState | null>(null);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast.success("Category added");
      form.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={form} action={action} className="grid gap-4 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">Add a category</h2>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Name</span>
        <Input name="name" required maxLength={60} placeholder="Paint protection" />
        {state.fieldErrors?.name && <span className="text-xs text-destructive">{state.fieldErrors.name}</span>}
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Web address (optional)</span>
        <Input name="slug" maxLength={80} placeholder="paint-protection" />
        <span className={state.fieldErrors?.slug ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {state.fieldErrors?.slug ?? "Made from the name if left empty. It cannot be changed afterwards."}
        </span>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-foreground">Description</span>
        <Textarea name="description" rows={2} maxLength={300} placeholder="Shown at the top of the category page and used as its Google summary." />
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} className="bg-blue-900 text-white hover:bg-blue-800">
          {pending ? "Adding…" : "Add category"}
        </Button>
        {state.formError && <span className="text-sm text-destructive">{state.formError}</span>}
      </div>
    </form>
  );
}

export function CategoryRow({ category }: { category: AdminBlogCategory }) {
  const [state, action, pending] = useActionState(updateBlogCategory, initial);
  // The action state at the moment editing began. A NEW successful state
  // means the save landed, which closes the form — derived, not set in an
  // effect (react-hooks/set-state-in-effect).
  const [editingFrom, setEditingFrom] = useState<BlogCategoryFormState | null>(null);
  const [deleting, startDelete] = useTransition();
  const router = useRouter();
  const handled = useRef<BlogCategoryFormState | null>(null);

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state;
      toast.success("Category saved");
      router.refresh();
    }
  }, [state, router]);

  function remove() {
    startDelete(async () => {
      const result = await deleteBlogCategory(category.id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Category deleted");
      router.refresh();
    });
  }

  const showForm = editingFrom !== null && !(state.ok && state !== editingFrom);

  return (
    <li className="border-t border-border py-5 first:border-t-0">
      {showForm ? (
        <form action={action} className="grid gap-3">
          <input type="hidden" name="id" value={category.id} />
          <Input name="name" defaultValue={category.name} required maxLength={60} aria-label="Name" />
          {state.fieldErrors?.name && <span className="text-xs text-destructive">{state.fieldErrors.name}</span>}
          <Textarea
            name="description"
            defaultValue={category.description ?? ""}
            rows={2}
            maxLength={300}
            aria-label="Description"
          />
          <label className="grid max-w-[10rem] gap-1">
            <span className="text-xs text-muted-foreground">Order (lower first)</span>
            <Input name="sortOrder" type="number" min={0} defaultValue={category.sortOrder} />
          </label>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={pending} className="bg-blue-900 text-white hover:bg-blue-800">
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingFrom(null)}>
              Cancel
            </Button>
            {state.formError && <span className="text-sm text-destructive">{state.formError}</span>}
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">{category.name}</p>
            <p className="mt-1 tabular-nums text-xs text-muted-foreground">
              {`/blog/category/${category.slug} · ${category.postCount} post${category.postCount === 1 ? "" : "s"}`}
            </p>
            {category.description && (
              <p className="mt-2 max-w-prose text-sm text-muted-foreground">{category.description}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditingFrom(state)}>
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={remove}
              disabled={deleting || category.postCount > 0}
              title={category.postCount > 0 ? "Move its posts to another category first" : undefined}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
