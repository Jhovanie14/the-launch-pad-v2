export interface ForumTopic {
  id: string;
  title: string;
  category: string;
  author: string;
  authorAvatar: string;
  content: string;
  replies: number;
  views: number;
  lastActivity: string;
  createdAt: string;
  tags: string[];
  isPinned: boolean;
}

export interface ForumReply {
  id: string;
  topicId: string;
  author: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
  likes: number;
  isAnswer: boolean;
}

export const forumCategories = [
  {
    id: "general",
    name: "General Discussion",
    description: "General topics and discussions",
  },
  {
    id: "services",
    name: "Services & Features",
    description: "Questions about our services",
  },
  {
    id: "billing",
    name: "Billing & Pricing",
    description: "Billing and pricing questions",
  },
  {
    id: "technical",
    name: "Technical Support",
    description: "Technical issues and troubleshooting",
  },
  {
    id: "feedback",
    name: "Feedback & Suggestions",
    description: "Share your ideas and feedback",
  },
];

export const forumTopics: ForumTopic[] = [
  {
    id: "1",
    title: "Best practices for car wash maintenance",
    category: "general",
    author: "John Smith",
    authorAvatar: "/diverse-avatars.png",
    content:
      "What are the best practices for maintaining your car wash equipment?",
    replies: 12,
    views: 245,
    lastActivity: "2 hours ago",
    createdAt: "2025-10-28",
    tags: ["maintenance", "tips"],
    isPinned: true,
  },
  {
    id: "2",
    title: "How to set up automated scheduling",
    category: "services",
    author: "Sarah Johnson",
    authorAvatar: "/diverse-avatars.png",
    content:
      "Can someone explain how to set up automated scheduling for recurring washes?",
    replies: 8,
    views: 156,
    lastActivity: "4 hours ago",
    createdAt: "2025-10-27",
    tags: ["scheduling", "automation"],
    isPinned: false,
  },
  {
    id: "3",
    title: "Membership pricing strategy",
    category: "billing",
    author: "Mike Davis",
    authorAvatar: "/diverse-avatars.png",
    content: "What pricing strategy works best for membership plans?",
    replies: 15,
    views: 312,
    lastActivity: "1 hour ago",
    createdAt: "2025-10-26",
    tags: ["pricing", "membership"],
    isPinned: false,
  },
  {
    id: "4",
    title: "API integration issues",
    category: "technical",
    author: "Alex Chen",
    authorAvatar: "/diverse-avatars.png",
    content: "Having trouble integrating the payment API. Any solutions?",
    replies: 6,
    views: 89,
    lastActivity: "30 minutes ago",
    createdAt: "2025-10-29",
    tags: ["api", "integration", "payment"],
    isPinned: false,
  },
  {
    id: "5",
    title: "Feature request: Mobile app",
    category: "feedback",
    author: "Emma Wilson",
    authorAvatar: "/diverse-avatars.png",
    content: "Would love to see a mobile app for managing bookings on the go!",
    replies: 23,
    views: 456,
    lastActivity: "15 minutes ago",
    createdAt: "2025-10-25",
    tags: ["feature-request", "mobile"],
    isPinned: false,
  },
];

export const forumReplies: ForumReply[] = [
  {
    id: "r1",
    topicId: "1",
    author: "Tom Brown",
    authorAvatar: "/diverse-avatars.png",
    content:
      "Great question! Regular maintenance is key. I recommend checking equipment weekly.",
    createdAt: "2025-10-28",
    likes: 5,
    isAnswer: true,
  },
  {
    id: "r2",
    topicId: "1",
    author: "Lisa Anderson",
    authorAvatar: "/diverse-avatars.png",
    content:
      "We use a maintenance schedule and it has really helped reduce downtime.",
    createdAt: "2025-10-28",
    likes: 3,
    isAnswer: false,
  },
];
