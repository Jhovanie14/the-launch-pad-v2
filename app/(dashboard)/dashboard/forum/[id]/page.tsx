"use client";

import { motion } from "framer-motion";
import { ArrowLeft, MessageCircle, ThumbsUp, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { forumTopics, forumReplies } from "@/lib/data/forum-data";
import { use, useState } from "react";

interface TopicPageProps {
  params: Promise<{ id: string }>;
}

export default function TopicPage({ params }: TopicPageProps) {
  const { id } = use(params);
  const topic = forumTopics.find((t) => t.id === id);
  const replies = forumReplies.filter((r) => r.topicId === id);
  const [replyContent, setReplyContent] = useState("");

  if (!topic) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <p className="text-muted-foreground">Topic not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link href="/dashboard/forum">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Forum
            </Button>
          </Link>
        </motion.div>

        {/* Topic Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-lg p-6 mb-8"
        >
          <h1 className="text-3xl font-bold mb-4">{topic.title}</h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span>by {topic.author}</span>
            <span>{topic.createdAt}</span>
            <span>{topic.views} views</span>
          </div>
          <p className="text-foreground mb-4">{topic.content}</p>
          <div className="flex gap-2">
            {topic.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Replies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 mb-8"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Replies ({replies.length})
          </h2>

          {replies.map((reply, index) => (
            <motion.div
              key={reply.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className="bg-card border border-border rounded-lg p-6"
            >
              <div className="flex items-start gap-4">
                <img
                  src={reply.authorAvatar || "/placeholder.svg"}
                  alt={reply.author}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{reply.author}</span>
                    {reply.isAnswer && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                        <CheckCircle className="w-3 h-3" />
                        Answer
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm mb-3">
                    {reply.createdAt}
                  </p>
                  <p className="text-foreground mb-4">{reply.content}</p>
                  <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    {reply.likes} Likes
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Reply Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <h3 className="font-semibold mb-4">Add Your Reply</h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setReplyContent("");
            }}
            className="space-y-4"
          >
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Share your thoughts..."
              rows={4}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              required
            />
            <Button type="submit">Post Reply</Button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}
