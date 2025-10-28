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
import { Mail, Clock, CheckCircle2, Send, Inbox } from "lucide-react";

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

export default function AdminContacts() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"new" | "replied">("new");
  const [loading, setLoading] = useState(true);

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

  // Filter contacts by tab
  const filteredContacts = contacts.filter((c) =>
    tab === "new" ? c.status === "new" : c.status === "replied"
  );

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
                <div className="text-2xl font-bold">
                  {contacts.filter((c) => c.status === "new").length}
                </div>
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
                <div className="text-2xl font-bold">
                  {contacts.filter((c) => c.status === "replied").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully handled
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as "new" | "replied")}
            className="space-y-4"
          >
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="new" className="gap-2">
                <Inbox className="h-4 w-4" />
                New ({contacts.filter((c) => c.status === "new").length})
              </TabsTrigger>
              <TabsTrigger value="replied" className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Replied ({contacts.filter((c) => c.status === "replied").length}
                )
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
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
                    <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No new contacts
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      All caught up! New contact submissions will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredContacts.map((contact) => (
                  <Card
                    key={contact.id}
                    className="overflow-hidden transition-all hover:shadow-md"
                  >
                    <CardHeader className="bg-muted/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(
                                contact.first_name,
                                contact.last_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {contact.first_name} {contact.last_name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(contact.created_at)}
                          </Badge>
                          <Badge variant="default">New</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                          Message
                        </h4>
                        <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border">
                          {contact.message}
                        </p>
                      </div>

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
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="replied" className="space-y-4">
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
                    <CheckCircle2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No replied contacts yet
                    </h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Contacts you've replied to will appear here for reference.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredContacts.map((contact) => (
                  <Card key={contact.id} className="overflow-hidden">
                    <CardHeader className="bg-muted/50">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-muted text-muted-foreground">
                              {getInitials(
                                contact.first_name,
                                contact.last_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {contact.first_name} {contact.last_name}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(contact.created_at)}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="gap-1 text-green-600 border-green-600"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Replied
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                      <div>
                        <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                          Message
                        </h4>
                        <p className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg border">
                          {contact.message}
                        </p>
                      </div>

                      {contact.replied_at && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          Replied on{" "}
                          {new Date(contact.replied_at).toLocaleString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
