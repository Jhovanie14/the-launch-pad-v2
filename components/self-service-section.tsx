"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import LoadingDots from "./loading";
import { Button } from "./ui/button";
import { AuthUser } from "@/types/index";

export function SelfServiceSection({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/selfservice");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  if (!user) {
    return (
      <p className="text-center text-lg text-muted-foreground">
        Login to view your Self-Service Bay Membership
      </p>
    );
  }

  if (loading) return <LoadingDots />;

  return (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <h2 className="text-3xl font-semibold text-blue-900">
        Self-Service Bay Membership
      </h2>

      {!data?.subscription ? (
        <>
          <p className="text-muted-foreground">Not subscribed yet</p>
          <Button
            onClick={() => router.push("/dashboard/selfservice/subscribe")}
          >
            Subscribe for $19.99/month
          </Button>
        </>
      ) : (
        <>
          <p className="font-semibold">Status: Active</p>
          <p>
            Started:{" "}
            {new Date(data.subscription.started_at).toLocaleDateString()}
          </p>

          <h3 className="mt-8 text-xl font-semibold">Today's Usage</h3>
          <p>{data?.usedToday ? "Used today" : "Not used yet today"}</p>

          <Button onClick={() => router.push("/dashboard/selfservice/use")}>
            Log a Visit
          </Button>
        </>
      )}
    </div>
  );
}
