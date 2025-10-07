"use client";

import { useEffect, useState } from "react";
import { BlogPostForm, BlogPostFormData } from "@/components/blog-post.form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  cover_image: string; // Changed to snake_case to match DB
  published: boolean;
  created_at: string; // Changed to snake_case to match DB
};

export default function BlogManagement() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const supabase = createClient();

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      console.log("Fetched posts:", data);
      setPosts(data as BlogPost[]);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (data: BlogPostFormData) => {
    try {
      const { data: insertedPost, error } = await supabase
        .from("blog_posts")
        .insert({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          author: data.author,
          cover_image: data.cover_image,
          published: data.published,
        })
        .select()
        .single();

      if (error) throw error;

      setPosts([insertedPost as BlogPost, ...posts]);
      setDialogOpen(false);
      console.log("Post created:", insertedPost);
    } catch (err) {
      console.error("Failed to create post:", err);
    }
  };

  const handleDeletePost = async (post: BlogPost) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", post.id);

      if (error) throw error;

      // Delete image from storage if exists
      if (post.cover_image) {
        const filePath = post.cover_image.split("/blog-images/")[1];
        if (filePath) {
          const { error: storageError } = await supabase.storage
            .from("blog-images")
            .remove([`blog-images/${filePath}`]);
          if (storageError)
            console.error("Image deletion error:", storageError);
        }
      }

      setPosts(posts.filter((p) => p.id !== post.id));
      console.log("Post deleted:", post.id);
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blog Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create New Blog Post</DialogTitle>
            </DialogHeader>
            <BlogPostForm
              onSubmit={handleCreatePost}
              onClose={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => (
          <Card
            key={post.id}
            className="flex flex-col hover:shadow-lg transition-shadow"
          >
            <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
              {post.cover_image ? (
                <img
                  src={post.cover_image}
                  alt={post.title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    console.error("Image failed to load:", post.cover_image);
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <CardHeader>
              <CardTitle className="line-clamp-2">{post.title}</CardTitle>
              <CardDescription className="line-clamp-2">
                {post.excerpt}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-sm text-muted-foreground">{post.author}</p>
              <p className="text-xs text-muted-foreground">
                Published: {post.published ? "Yes" : "No"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </CardContent>
            <CardFooter className="space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => handleDeletePost(post)}
              >
                <Trash2 className="w-4 h-4" />
                Update
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive"
                onClick={() => handleDeletePost(post)}
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </main>
  );
}
