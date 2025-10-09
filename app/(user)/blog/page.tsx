"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Calendar, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

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

export default function Blog() {
  const supabase = createClient();
  const [posts, setPosts] = useState<BlogPost[]>([]);

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

  return (
    <div className="py-20">
      <div className="container mx-auto px-4 ">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-center text-4xl md:text-6xl font-semibold text-blue-900 mb-16">
            Latest Article
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card key={post.id} className="rounded-xl hover:scale-103 transition-transform duration-200 p-0">
                <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
                  {post.cover_image ? (
                    <Image
                      height={40}
                      width={40}
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error(
                          "Image failed to load:",
                          post.cover_image
                        );
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                </div>
                <CardHeader className="flex-1">
                  <CardTitle className="line-clamp-2">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <CardDescription className="line-clamp-2">
                    {post.excerpt}
                  </CardDescription>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {post.author}
                      </span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Link
                    href="/"
                    className="flex items-center space-x-2 mb-3 text-accent-foreground underline hover:text-gray-700 "
                  >
                    <span className="text-lg">Read More</span>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
