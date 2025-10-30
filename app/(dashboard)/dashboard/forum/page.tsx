"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ForumTopicCard } from "@/components/forum-topic-card";
import { CreateTopicModal } from "@/components/forum-topic-modal";
import { forumCategories, forumTopics } from "@/lib/data/forum-data";

export default function ForumPage() {
  const [selectedCategory, setSelectedCategory] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const filteredTopics = forumTopics.filter((topic) => {
    const matchesCategory = topic.category === selectedCategory;
    const matchesSearch = topic.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pinnedTopics = filteredTopics.filter((t) => t.isPinned);
  const regularTopics = filteredTopics.filter((t) => !t.isPinned);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold mb-2">Community Forum</h1>
          <p className="text-muted-foreground">
            Connect with other users, share ideas, and get help
          </p>
        </motion.div>

        {/* Search and Create */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-4 mb-8"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Topic
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <div className="bg-card border border-border rounded-lg p-4 sticky top-4">
              <h3 className="font-semibold mb-4">Categories</h3>
              <div className="space-y-2">
                {forumCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCategory === category.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium text-sm">{category.name}</div>
                    <div className="text-xs opacity-75">
                      {
                        forumTopics.filter((t) => t.category === category.id)
                          .length
                      }{" "}
                      topics
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Topics List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 space-y-4"
          >
            {pinnedTopics.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase">
                  Pinned
                </h3>
                <div className="space-y-3">
                  {pinnedTopics.map((topic, index) => (
                    <ForumTopicCard
                      key={topic.id}
                      topic={topic}
                      index={index}
                    />
                  ))}
                </div>
              </div>
            )}

            {regularTopics.length > 0 && (
              <div>
                {pinnedTopics.length > 0 && (
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase mt-8">
                    Recent
                  </h3>
                )}
                <div className="space-y-3">
                  {regularTopics.map((topic, index) => (
                    <ForumTopicCard
                      key={topic.id}
                      topic={topic}
                      index={pinnedTopics.length + index}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredTopics.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <p className="text-muted-foreground mb-4">No topics found</p>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  Create the first topic
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <CreateTopicModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        categories={forumCategories}
      />
    </main>
  );
}
