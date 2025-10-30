"use client";

import { motion } from "framer-motion";
import { MessageCircle, Eye, Pin } from "lucide-react";
import Link from "next/link";
import type { ForumTopic } from "@/lib/data/forum-data";

interface ForumTopicCardProps {
  topic: ForumTopic;
  index: number;
}

export function ForumTopicCard({ topic, index }: ForumTopicCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -4 }}
    >
      <Link href={`/dashboard/forum/${topic.id}`}>
        <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {topic.isPinned && (
                  <Pin className="w-4 h-4 text-primary flex-shrink-0" />
                )}
                <h3 className="font-semibold text-foreground truncate">
                  {topic.title}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {topic.content}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>by {topic.author}</span>
                <span>{topic.createdAt}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{topic.replies}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  <span>{topic.views}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {topic.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-primary/10 text-primary text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
