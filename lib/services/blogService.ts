import { BlogPost, BlogPostFormData } from "@/types";
import { SupabaseClient } from "@supabase/supabase-js";

export const blogService = {
  async getAllPosts(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPostBySlug(supabase: SupabaseClient, slug: string) {
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) throw error;
    return data || null;
  },
  async CreatePost(supabase: SupabaseClient, data: BlogPostFormData) {
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

      return insertedPost;
    } catch (err) {
      console.error("Failed to create post:", err);
    }
  },
  async UpdatePost(supabase: SupabaseClient, data: BlogPostFormData) {
    try {
      const { data: updatedPost, error } = await supabase
        .from("blog_posts")
        .update({
          title: data.title,
          slug: data.slug,
          excerpt: data.excerpt,
          content: data.content,
          author: data.author,
          cover_image: data.cover_image,
          published: data.published,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;

      return updatedPost;
    } catch (err) {
      console.error("Failed to update post:", err);
    }
  },
  async DeletePost(supabase: SupabaseClient, post: BlogPost) {
    try {
      const { data: deletedPost, error } = await supabase
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

      return deletedPost;
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  },
};
