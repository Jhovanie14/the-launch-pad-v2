"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Save, Eye, Upload, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
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
  const supabase = createClient();
  const [formData, setFormData] = useState<BlogPostFormData>({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    author: "",
    cover_image: "",
    published: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // 🧩 Generate slug
  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  // 🔄 Prefill when editing
  useEffect(() => {
    if (defaultValues) {
      setFormData((prev) => ({ ...prev, ...defaultValues }));
    }
  }, [defaultValues]);

  // 🧾 Handle field changes
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

  // 🧪 Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = "Title is required";
    if (!formData.slug) newErrors.slug = "Slug is required";
    if (!formData.author) newErrors.author = "Author is required";
    if (!formData.excerpt) newErrors.excerpt = "Excerpt is required";
    if (!formData.content) newErrors.content = "Content is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ☁️ Upload cover image to Supabase Storage
  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `cover-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("blog-images")
        .getPublicUrl(filePath);
      if (data?.publicUrl) {
        setFormData((prev) => ({ ...prev, cover_image: data.publicUrl }));
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  // 🗑️ Delete cover image from storage (optional)
  const handleRemoveImage = async () => {
    if (!formData.cover_image) return;
    try {
      const filePath = formData.cover_image.split("/").pop(); // simple filename extraction
      await supabase.storage
        .from("blog-images")
        .remove([`blog-images/${filePath}`]);
    } catch (error) {
      console.warn("Failed to remove old image:", error);
    } finally {
      setFormData((prev) => ({ ...prev, cover_image: "" }));
    }
  };

  // 💾 Submit form
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
      {/* === POST DETAILS === */}
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
          <CardDescription>
            Basic information about your blog post
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Title</Label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Blog title"
            />
            {errors.title && (
              <p className="text-destructive text-sm">{errors.title}</p>
            )}
          </div>

          <div>
            <Label>Slug</Label>
            <Input
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              placeholder="blog-title-slug"
            />
            {errors.slug && (
              <p className="text-destructive text-sm">{errors.slug}</p>
            )}
          </div>

          <div>
            <Label>Author</Label>
            <Input
              name="author"
              value={formData.author}
              onChange={handleChange}
              placeholder="John Doe"
            />
            {errors.author && (
              <p className="text-destructive text-sm">{errors.author}</p>
            )}
          </div>

          <div>
            <Label>Excerpt</Label>
            <Textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              placeholder="A short summary of your blog post..."
            />
            {errors.excerpt && (
              <p className="text-destructive text-sm">{errors.excerpt}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* === CONTENT === */}
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>Write the full article content here</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Write your article content here..."
            className="min-h-[250px]"
          />
          {errors.content && (
            <p className="text-destructive text-sm">{errors.content}</p>
          )}
        </CardContent>
      </Card>

      {/* === COVER IMAGE === */}
      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
          <CardDescription>
            Upload a cover image (JPG, PNG, or WebP)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.cover_image ? (
            <div className="relative w-full max-w-md">
              <img
                src={formData.cover_image}
                alt="Cover Preview"
                className="rounded-lg object-cover w-full h-48"
              />
              <Button
                variant="destructive"
                size="sm"
                type="button"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <Trash2 className="w-4 h-4" /> Remove
              </Button>
            </div>
          ) : (
            <div className="border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-sm text-muted-foreground">
              <Input
                id="coverImage"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                }}
              />
              <label
                htmlFor="coverImage"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="w-6 h-6 mb-2" />
                {uploading ? "Uploading..." : "Click to upload image"}
              </label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === ACTIONS === */}
      <div className="flex justify-end gap-3 sticky bottom-0 bg-background pt-4 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(false)}
        >
          <Save className="w-4 h-4 mr-2" /> Save Draft
        </Button>
        <Button
          className="bg-blue-900 hover:bg-blue-700"
          type="button"
          onClick={() => handleSubmit(true)}
        >
          <Save className="w-4 h-4 mr-2" /> Publish
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => console.log("Preview clicked")}
        >
          <Eye className="w-4 h-4 mr-2" /> Preview
        </Button>
      </div>
    </form>
  );
}
