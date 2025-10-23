"use client";

import { CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SubscriptionUpgradeSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
      <CheckCircle className="h-16 w-16 text-green-600 mb-4" />
      <h1 className="text-3xl font-bold text-primary mb-2">
        Subscription Upgraded!
      </h1>
      <p className="text-muted-foreground max-w-md mb-6">
        Your subscription has been successfully upgraded. Your billing cycle and
        payment have been updated automatically.
      </p>

      <div className="flex gap-4">
        <Button asChild className="bg-blue-900">
          <Link href="/dashboard/billing">Go to Billing</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
