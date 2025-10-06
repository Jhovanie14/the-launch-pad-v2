"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuickActions({ onBook }: { onBook: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <button
            onClick={onBook}
            className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Book Online
          </button>
          <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
            View all tasks
          </button>
          <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
            Update profile
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
