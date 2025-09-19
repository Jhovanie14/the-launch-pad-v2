"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function AuthPromptModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Please sign in or create an account to continue.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => (window.location.href = "/login")} className="bg-blue-900 hover:bg-blue-800">
            Sign In
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/signup")}
          >
            Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
