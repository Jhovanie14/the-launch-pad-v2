"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BlogPostFormData } from "@/types";



interface BlogPostFormProps {
  onSubmit: (data: BlogPostFormData) => void;
  onClose: () => void;
  defaultValues?: Partial<BlogPostFormData>;
}

export function BlogPostForm({
  onSubmit,
  onClose,
  defaultValues,
}: BlogPostFormProps) {
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "",
    cover_image: "",
    // tags: [],
    published: false,
  });

  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 🔤 Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "title" && !prev.slug ? { slug: generateSlug(value) } : {}),
    }));
  };

  // 🧩 Generate slug from title
  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  // 🏷️ Add and remove tags
  //   const addTag = () => {
  //     if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
  //       setFormData((prev) => ({
  //         ...prev,
  //         tags: [...prev.tags, tagInput.trim()],
  //       }));
  //       setTagInput("");
  //     }
  //   };

  //   const removeTag = (tagToRemove: string) => {
  //     setFormData((prev) => ({
  //       ...prev,
  //       tags: prev.tags.filter((tag) => tag !== tagToRemove),
  //     }));
  //   };

  // 🧾 Simple validation

  useEffect(() => {
    if (defaultValues) {
      setFormData((prev) => ({
        ...prev,
        ...defaultValues,
      }));
    }
  }, [defaultValues]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.slug) newErrors.slug = "Slug is required";
    if (!formData.author) newErrors.author = "Author name is required";
    if (!formData.excerpt) newErrors.excerpt = "Excerpt is required";
    if (!formData.content) newErrors.content = "Content is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 💾 Handle submit
  const handleSubmit = (published: boolean) => {
    if (!validateForm()) return;
    const postData = { ...formData, published };
    onSubmit(postData);
    onClose();
  };

  return (
    <form
      className="space-y-6 max-h-[70vh] overflow-y-auto px-1"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* POST DETAILS */}
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
          <CardDescription>
            Basic information about your blog post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div>
            <Label>Title</Label>
            <Input
              name="title"
              placeholder="Enter your blog post title"
              value={formData.title}
              onChange={handleChange}
            />
            {errors.title && (
              <p className="text-destructive text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Slug */}
          <div>
            <Label>Slug</Label>
            <Input
              name="slug"
              placeholder="blog-post-url-slug"
              value={formData.slug}
              onChange={handleChange}
            />
            <p className="text-muted-foreground text-sm">
              The URL-friendly version of the title
            </p>
            {errors.slug && (
              <p className="text-destructive text-sm mt-1">{errors.slug}</p>
            )}
          </div>

          {/* Author */}
          <div>
            <Label>Author</Label>
            <Input
              name="author"
              placeholder="John Doe"
              value={formData.author}
              onChange={handleChange}
            />
            {errors.author && (
              <p className="text-destructive text-sm mt-1">{errors.author}</p>
            )}
          </div>

          {/* Excerpt */}
          <div>
            <Label>Excerpt</Label>
            <Textarea
              name="excerpt"
              placeholder="A brief summary of your blog post..."
              className="min-h-[80px] resize-none"
              value={formData.excerpt}
              onChange={handleChange}
            />
            <p className="text-muted-foreground text-sm">
              A short description that appears in previews
            </p>
            {errors.excerpt && (
              <p className="text-destructive text-sm mt-1">{errors.excerpt}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* CONTENT */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>Write your blog post content</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Post Content</Label>
          <Textarea
            name="content"
            placeholder="Write your blog post content here..."
            className="min-h-[300px] font-mono text-sm leading-relaxed"
            value={formData.content}
            onChange={handleChange}
          />
          <p className="text-muted-foreground text-sm">
            Supports Markdown formatting
          </p>
          {errors.content && (
            <p className="text-destructive text-sm mt-1">{errors.content}</p>
          )}
        </CardContent>
      </Card>

      {/* MEDIA & TAGS */}
      <Card>
        <CardHeader>
          <CardTitle>Media & Tags</CardTitle>
          <CardDescription>Add images and categorize your post</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cover Image */}
          <div className="border border-dashed border-muted-foreground/25 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/20 transition">
            {formData.cover_image ? (
              <div className="relative w-full max-w-sm">
                <img
                  src={formData.cover_image}
                  alt="Cover preview"
                  className="rounded-lg object-cover w-full h-48"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setFormData({ ...formData, cover_image: "" })}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <>
                <input
                  type="file"
                  accept="image/*"
                  id="coverImage"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData({
                          ...formData,
                          cover_image: reader.result as string, // base64 preview
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="coverImage"
                  className="flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground cursor-pointer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-8 w-8 text-muted-foreground/70"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5.002 5.002 0 0117 7h1a4 4 0 110 8h-1m-4-4v6m0 0l-2-2m2 2l2-2"
                    />
                  </svg>
                  <span>Click to upload an image</span>
                </label>
              </>
            )}
          </div>
          <p className="text-muted-foreground text-sm mt-2">
            Upload a cover image for your post (JPG, PNG, or WebP)
          </p>

          {/* Tags */}
          {/* <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addTag}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-sm">
              Press Enter or click + to add tags
            </p>
          </div> */}
        </CardContent>
      </Card>

      {/* ACTION BUTTONS */}
      <div className="flex gap-3 justify-end sticky bottom-0 bg-background pt-4 pb-2">
        <Button
          type="button"
          variant="outline"
          className="gap-2 bg-transparent"
          onClick={() => console.log("Preview clicked", formData)}
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(false)}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </Button>

        <Button
          type="button"
          onClick={() => handleSubmit(true)}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          Publish Post
        </Button>
      </div>
    </form>
  );
}
