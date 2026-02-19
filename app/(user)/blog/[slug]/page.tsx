import { blogService } from "@/lib/services/blogService";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createClient();
  const post = await blogService.getPostBySlug(supabase, slug);

  return (
    <main className="flex-1 container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="py-20">
          <div className="container mx-auto px-4 mb-12">
            <div className="max-w-4xl mx-auto">
              {post ? (
                <article>
                  <h1 className="text-4xl font-bold mb-4 text-blue-900">
                    {post.title}
                  </h1>
                  <p className="text-sm text-muted-foreground mb-2">
                    By {post.author} |{" "}
                    {new Date(post.created_at).toLocaleDateString()}
                  </p>
                  {post.cover_image && (
                    <div className="flex items-center justify-center mb-6">
                      <Image
                        src={post.cover_image}
                        alt={post.title}
                        height={500}
                        width={500}
                        className="rounded-lg object-cover"
                      />
                    </div>
                  )}
                  <div className="prose prose-lg max-w-none">
                    <p className="whitespace-pre-line">{post.content}</p>
                  </div>
                </article>
              ) : (
                <p>Loading...</p>
              )}
            </div>
          </div>
          <div className="bg-gray-100 py-10">
            <div className="container mx-auto px-4">
              <h2 className="text-2xl font-bold mb-4">Related Posts</h2>
              <ul className="space-y-4">
                {/* Map through related posts and display them */}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
