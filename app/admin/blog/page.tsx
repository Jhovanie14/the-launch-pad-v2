"use client";

import { useState } from "react";
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
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useBlog } from "@/hooks/useBlog";
import { BlogPost } from "@/types";
import { BlogPostForm } from "@/components/blog-post.form";
import LoadingDots from "@/components/loading";

export default function BlogManagement() {
  // const [posts, setPosts] = useState<BlogPost[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  const {
    posts,
    loading,
    error,
    handleCreatePost,
    handleUpdatePost,
    handleDeletePost,
  } = useBlog();

  if (loading) {
    return <LoadingDots />;
  }

  return (
    <main className="flex-1 overflow-y-auto mt-16 lg:mt-0 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Blog Management</h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="gap-2 bg-blue-900 hover:bg-blue-700"
              onClick={() => {
                setEditingPost(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              New Post
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {editingPost ? "Edit Blog Post" : "Create New Blog Post"}
              </DialogTitle>
            </DialogHeader>

            <BlogPostForm
              onSubmit={editingPost ? handleUpdatePost : handleCreatePost}
              onClose={() => setDialogOpen(false)}
              defaultValues={editingPost || undefined}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <p className="text-muted-foreground">No blog posts yet. Create one!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
                {post.cover_image ? (
                  <img
                    src={post.cover_image}
                    alt={post.title}
                    className="w-full h-full object-cover"
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
              </CardHeader>

              <CardContent className="flex-1">
                <CardDescription className="line-clamp-2 mb-5">
                  {post.excerpt}
                </CardDescription>
                <div>
                  <p className="text-sm text-muted-foreground">{post.author}</p>
                  <p className="text-xs text-muted-foreground">
                    {post.published ? "Published" : "Draft"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="space-x-3 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEditingPost(post);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive"
                  onClick={() => handleDeletePost(post)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
