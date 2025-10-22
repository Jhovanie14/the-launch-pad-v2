"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "./ui/button";

export default function QuickActions({ onBook }: { onBook: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button
            onClick={onBook}
            variant={"ghost"}
            className="w-full rounded-md px-4 py-2 text-left text-sm bg-gray-100  hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Book Online
          </Button>
          {/* <button className="w-full rounded-md bg-gray-100 px-4 py-2 text-left text-sm hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700">
            View all tasks
          </button> */}
          <Link
            href="/dashboard/settings"
            className="flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            Update profile
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
