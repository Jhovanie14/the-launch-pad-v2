"use client";

import { blogService } from "@/lib/services/blogService";
import { BlogPost, BlogPostFormData } from "@/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function useBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadBlogPosts();
  }, []);

  async function loadBlogPosts() {
    try {
      setLoading(true);
      const data = await blogService.getAllPosts(supabase);
      setPosts(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load blog posts"
      );
      console.error("Error loading blog posts:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBlogPostBySlug(slug: string) {
    try {
      setLoading(true);
      const data = await blogService.getPostBySlug(supabase, slug);
      setPost(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to load blog post"
      );
      console.error("Error loading blog post:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost(newPost: BlogPostFormData) {
    try {
      setLoading(true);
      const createdPost = await blogService.CreatePost(supabase, newPost);
      setPosts((prev) => [createdPost, ...prev]);
      toast.success("Blog post created successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create blog post";
      setError(message);
      toast.error(message);
      console.error("Error creating blog post:", error);
    } finally {
      setLoading(false);
    }
  }
  async function handleUpdatePost(updatedPost: BlogPostFormData) {
    try {
      setLoading(true);
      const post = await blogService.UpdatePost(supabase, updatedPost);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
      toast.success("Blog post updated successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update blog post";
      setError(message);
      toast.error(message);
      console.error("Error updating blog post:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePost(post: BlogPost) {
    try {
      setLoading(true);
      await blogService.DeletePost(supabase, post);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      toast.success("Blog post deleted successfully!");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete blog post";
      setError(message);
      toast.error(message);
      console.error("Error deleting blog post:", error);
    } finally {
      setLoading(false);
    }
  }

  return {
    posts,
    post,
    loading,
    error,
    loadBlogPosts,
    handleCreatePost,
    handleUpdatePost,
    handleDeletePost,
    loadBlogPostBySlug,
  };
}
