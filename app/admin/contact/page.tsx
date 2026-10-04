"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Mail,
  Clock,
  CheckCircle2,
  Send,
  Inbox,
  Archive,
  ShieldAlert,
  Trash2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import type { ContactStatus, TriageAction } from "@/lib/contacts/status";

interface Contact {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  message: string;
  status: string;
  created_at: string;
  replied_at?: string;
}

const TABS: {
  value: ContactStatus;
  label: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyText: string;
}[] = [
  {
    value: "new",
    label: "New",
    icon: Inbox,
    emptyTitle: "No new contacts",
    emptyText: "All caught up! New contact submissions will appear here.",
  },
  {
    value: "replied",
    label: "Replied",
    icon: CheckCircle2,
    emptyTitle: "No replied contacts yet",
    emptyText: "Contacts you've replied to will appear here for reference.",
  },
  {
    value: "spam",
    label: "Spam",
    icon: ShieldAlert,
    emptyTitle: "No spam",
    emptyText:
      "Messages you mark as spam or marketing land here, out of the inbox.",
  },
  {
    value: "archived",
    label: "Archived",
    icon: Archive,
    emptyTitle: "Nothing archived",
    emptyText:
      "Archive messages that don't need a reply to clear them from New.",
  },
];

const TRIAGE_SUCCESS: Record<TriageAction, string> = {
  spam: "Marked as spam.",
  archive: "Message archived.",
  restore: "Message restored.",
};

export default function AdminContacts() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<ContactStatus>("new");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);

  // Load contacts & subscribe to realtime

  useEffect(() => {
    const loadContacts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading contacts:", error);
      } else {
        setContacts(data as Contact[]);
      }
      setLoading(false);
    };

    loadContacts();

    // Subscribe to realtime changes with detailed logging
    const channel = supabase
      .channel("contacts-realtime-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "contacts",
        },
        (payload) => {
          console.log("🔔 Realtime event received:", payload);

          if (payload.eventType === "INSERT") {
            console.log("✅ New contact inserted:", payload.new);
            setContacts((prev) => [payload.new as Contact, ...prev]);
            toast.success("New contact received!");
          } else if (payload.eventType === "UPDATE") {
            console.log("📝 Contact updated:", payload.new);
            setContacts((prev) =>
              prev.map((c) =>
                c.id === payload.new.id ? (payload.new as Contact) : c
              )
            );
          } else if (payload.eventType === "DELETE") {
            console.log("🗑️ Contact deleted:", payload.old);
            setContacts((prev) => prev.filter((c) => c.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        console.log("🔌 Realtime subscription status:", status);

        if (status === "SUBSCRIBED") {
          console.log("✅ Successfully subscribed to contacts realtime");
        } else if (status === "CHANNEL_ERROR") {
          console.error("❌ Realtime subscription error");
        } else if (status === "TIMED_OUT") {
          console.error("⏱️ Realtime subscription timed out");
        }
      });

    return () => {
      console.log("🔌 Unsubscribing from realtime");
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Handle reply
  const handleReply = async (contact: Contact) => {
    const replyText = reply[contact.id];
    if (!replyText) return toast.error("Reply message is empty.");

    try {
      const res = await fetch("/api/contact/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: contact.id,
          email: contact.email,
          reply: replyText,
          firstName: contact.first_name,
        }),
      });

      if (res.ok) {
        toast.success("Reply sent successfully!");

        // Update Supabase contact status
        const { error } = await supabase
          .from("contacts")
          .update({ status: "replied", replied_at: new Date().toISOString() })
          .eq("id", contact.id);

        if (error) toast.error("Failed to update contact status.");
        else {
          // Clear the reply text
          setReply((prev) => {
            const newReply = { ...prev };
            delete newReply[contact.id];
            return newReply;
          });
        }
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to send reply.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error sending reply.");
    }
  };

  // File a message as spam / archived, or restore it to the inbox
  const handleTriage = async (contact: Contact, action: TriageAction) => {
    setBusyId(contact.id);
    try {
      const res = await fetch("/api/admin/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contact.id, action }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error || "Failed to update message.");
        return;
      }
      // Realtime echoes this too; updating here keeps the UI right if it lags.
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? (body.contact as Contact) : c))
      );
      toast.success(TRIAGE_SUCCESS[action]);
    } catch (err) {
      console.error(err);
      toast.error("Error updating message.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    const contact = pendingDelete;
    if (!contact) return;
    setBusyId(contact.id);
    try {
      const res = await fetch("/api/admin/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contact.id }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(body?.error || "Failed to delete message.");
        return;
      }
      setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      toast.success("Message deleted.");
    } catch (err) {
      console.error(err);
      toast.error("Error deleting message.");
    } finally {
      setBusyId(null);
      setPendingDelete(null);
    }
  };

  const countFor = (status: ContactStatus) =>
    contacts.filter((c) => c.status === status).length;

  // Filter contacts by tab
  const filteredContacts = contacts.filter((c) => c.status === tab);

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "?";
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };


  const statusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">New</Badge>;
      case "replied":
        return (
          <Badge
            variant="outline"
            className="gap-1 text-green-600 border-green-600"
          >
            <CheckCircle2 className="h-3 w-3" />
            Replied
          </Badge>
        );
      case "spam":
        return (
          <Badge
            variant="outline"
            className="gap-1 text-destructive border-destructive"
          >
            <ShieldAlert className="h-3 w-3" />
            Spam
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="outline" className="gap-1">
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        );
      default:
        return null;
    }
  };

  const renderActions = (contact: Contact) => {
    const busy = busyId === contact.id;
    const filed = contact.status === "spam" || contact.status === "archived";
    return (
      <div className="flex flex-wrap gap-2">
        {filed && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy}
            onClick={() => handleTriage(contact, "restore")}
          >
            <Undo2 className="h-4 w-4" />
            Restore
          </Button>
        )}
        {contact.status !== "spam" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy}
            onClick={() => handleTriage(contact, "spam")}
          >
            <ShieldAlert className="h-4 w-4" />
            Mark as spam
          </Button>
        )}
        {contact.status !== "archived" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={busy}
            onClick={() => handleTriage(contact, "archive")}
          >
            <Archive className="h-4 w-4" />
            Archive
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-destructive hover:text-destructive"
          disabled={busy}
          onClick={() => setPendingDelete(contact)}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    );
  };

  const renderContact = (contact: Contact) => (
    <Card
      key={contact.id}
      className="overflow-hidden transition-all hover:shadow-md"
    >
      <CardHeader className="bg-muted/50">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback
                className={
                  contact.status === "new"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }
              >
                {getInitials(contact.first_name, contact.last_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-lg break-words">
                {contact.first_name} {contact.last_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 break-all">
                <Mail className="h-3 w-3 shrink-0" />
                {contact.email}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(contact.created_at)}
            </Badge>
            {statusBadge(contact.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">
            Message
          </h4>
          <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border whitespace-pre-wrap break-words">
            {contact.message}
          </p>
        </div>

        {contact.status === "new" && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Your Reply
            </h4>
            <Textarea
              placeholder="Write your reply here..."
              value={reply[contact.id] || ""}
              onChange={(e) =>
                setReply((prev) => ({
                  ...prev,
                  [contact.id]: e.target.value,
                }))
              }
              className="min-h-[120px] resize-none"
            />
            <Button
              onClick={() => handleReply(contact)}
              className="w-full gap-2"
              disabled={!reply[contact.id]?.trim()}
            >
              <Send className="h-4 w-4" />
              Send Reply
            </Button>
          </div>
        )}

        {contact.replied_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Replied on{" "}
            {new Date(contact.replied_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}

        <div className="pt-4 border-t">{renderActions(contact)}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="min-h-screen bg-muted/30 p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-balance">
              Contact Management
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage and respond to customer inquiries
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  New Contacts
                </CardTitle>
                <Inbox className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countFor("new")}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting response
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Replied</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{countFor("replied")}</div>
                <p className="text-xs text-muted-foreground">
                  Successfully handled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as ContactStatus)}
            className="space-y-4"
          >
            <TabsList className="grid h-auto w-full max-w-2xl grid-cols-2 sm:grid-cols-4">
              {TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="gap-2 py-1.5">
                  <Icon className="h-4 w-4" />
                  {label} ({countFor(value)})
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map(({ value, icon: Icon, emptyTitle, emptyText }) => (
              <TabsContent key={value} value={value} className="space-y-4">
                {loading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center space-y-2">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                        <p className="text-sm text-muted-foreground">
                          Loading contacts...
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : filteredContacts.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-semibold mb-2">
                        {emptyTitle}
                      </h3>
                      <p className="text-sm text-muted-foreground text-center max-w-sm">
                        {emptyText}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  filteredContacts.map(renderContact)
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              The message from {pendingDelete?.email} will be permanently
              removed and can&apos;t be recovered. If you might need it later,
              archive it instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Keep the dialog open until the request settles.
                e.preventDefault();
                handleDelete();
              }}
              disabled={busyId !== null && busyId === pendingDelete?.id}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
