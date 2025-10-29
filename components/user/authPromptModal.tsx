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
  next,
}: {
  open: boolean;
  onClose: () => void;
  next?: string;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        // only call onClose when the user is closing the dialog
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Authentication Required</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Please sign in or create an account to continue.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            onClick={() =>
              (window.location.href = next
                ? `/login?next=${encodeURIComponent(next)}`
                : "/login")
            }
            className="bg-blue-900 hover:bg-blue-800"
          >
            Sign In
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              (window.location.href = next
                ? `/signup?next=${encodeURIComponent(next)}`
                : "/signup")
            }
          >
            Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
