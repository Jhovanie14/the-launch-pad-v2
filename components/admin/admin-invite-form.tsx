"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function InviteAdminForm() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invite-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, full_name: fullName }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error);

      toast.success("Admin invited successfully!");
      setEmail("");
      setFullName("");
    } catch (error) {
      console.error("Invite admin error:", error);
      toast.error("Failed to invite admin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 border p-4 rounded-lg">
      <h3 className="font-semibold text-lg">Invite New Admin</h3>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label>Full Name</Label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
        />
      </div>
      <div className="flex items-end justify-end">
        <Button
          onClick={handleInvite}
          disabled={loading || !email}
          className="bg-blue-900 hover:bg-blue-800"
        >
          {loading ? "Inviting..." : "Send Invite"}
        </Button>
      </div>
    </div>
  );
}
