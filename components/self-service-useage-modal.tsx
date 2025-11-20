"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Car,
  Clock,
  CheckCircle,
  User,
  Calendar,
  LogOut,
  LogIn,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

type SelfServiceUsageModalProps = {
  open: boolean;
  subscriber: any;
  onClose: () => void;
  onStatusChange?: () => void;
};

type UsageLog = {
  id: string;
  check_in_time: string;
  check_out_time?: string;
  attendant_name?: string;
  status: string;
  notes?: string;
  vehicle?: any;
};

export default function SelfServiceUsageModal({
  open,
  subscriber,
  onClose,
  onStatusChange,
}: SelfServiceUsageModalProps) {
  const supabase = createClient();
  const { userProfile } = useAuth();
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(true);

  useEffect(() => {
    if (!open || !subscriber) return;

    async function fetchUsageLogs() {
      setFetchingLogs(true);
      try {
        const { data, error } = await supabase
          .from("self_service_usage_logs")
          .select(
            `
            *,
            vehicle:vehicles (year, make, model, body_type, colors)
          `
          )
          .eq("subscription_id", subscriber.id)
          .order("check_in_time", { ascending: false });

        if (error) {
          console.error("Error fetching usage logs:", error);
          toast.error("Failed to fetch usage logs");
          return;
        }

        setUsageLogs(data || []);
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
      } finally {
        setFetchingLogs(false);
      }
    }

    fetchUsageLogs();
  }, [open, subscriber, supabase]);

  const handleCheckOut = async (logId: string) => {
    setLoading(true);
    console.log("Supabase user:", userProfile?.full_name);

    const attendantName = userProfile?.full_name ?? "Unknown";

    try {
      const { error } = await supabase
        .from("self_service_usage_logs")
        .update({
          check_out_time: new Date().toISOString(),
          attendant_name: attendantName,
          status: "completed",
        })
        .eq("id", logId);

      if (error) {
        console.error("Check-out error:", error);
        toast.error("Failed to check out");
        return;
      }

      setUsageLogs((prev) =>
        prev.map((log) =>
          log.id === logId
            ? {
                ...log,
                check_out_time: new Date().toISOString(),
                status: "completed",
              }
            : log
        )
      );

      toast.success("Customer checked out successfully!");
      onStatusChange?.();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const getDuration = (log: UsageLog) => {
    if (!log.check_out_time) return "In Progress";

    const diffMs =
      new Date(log.check_out_time).getTime() -
      new Date(log.check_in_time).getTime();
    const diffMin = diffMs / 1000 / 60;

    if (diffMin < 60) return `${diffMin.toFixed(0)} min`;
    const diffHr = diffMin / 60;
    return `${diffHr.toFixed(1)} hr`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in_progress":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "cancelled":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Self-Service Usage - {subscriber?.profiles?.full_name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Track self-service wash sessions
          </p>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {fetchingLogs ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-4">
                Loading usage logs...
              </p>
            </div>
          ) : usageLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No usage history found for this subscriber
                </p>
              </CardContent>
            </Card>
          ) : (
            usageLogs.map((log) => (
              <Card
                key={log.id}
                className={`border-2 transition-all ${
                  log.status === "in_progress"
                    ? "border-blue-300 bg-blue-50/50"
                    : log.status === "completed"
                      ? "border-green-300 bg-green-50/50"
                      : "border-border"
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {log.vehicle?.year} {log.vehicle?.make}{" "}
                            {log.vehicle?.model}
                          </h3>
                          <Badge className={getStatusColor(log.status)}>
                            {log.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Session #{log.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    {log.status === "completed" && (
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-600">
                          {getDuration(log)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Duration
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <LogIn className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">Check-In:</span>
                        <span>
                          {format(
                            new Date(log.check_in_time),
                            "MMM dd, yyyy h:mm a"
                          )}
                        </span>
                      </div>

                      {log.check_out_time && (
                        <div className="flex items-center gap-2 text-sm">
                          <LogOut className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">Check-Out:</span>
                          <span>
                            {format(
                              new Date(log.check_out_time),
                              "MMM dd, yyyy h:mm a"
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <Car className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {log.vehicle?.body_type} -{" "}
                          {log.vehicle?.colors?.join(", ")}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {log.attendant_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>
                            <strong>Verified by:</strong> {log.attendant_name}
                          </span>
                        </div>
                      )}

                      {log.notes && (
                        <div className="text-sm">
                          <p className="font-medium">Notes:</p>
                          <p className="text-muted-foreground italic">
                            "{log.notes}"
                          </p>
                        </div>
                      )}

                      {log.status === "in_progress" && (
                        <div className="text-sm">
                          <p className="font-medium text-blue-600 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Currently washing...
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar for In Progress */}
                  {log.status === "in_progress" && (
                    <div className="space-y-2">
                      <Progress value={50} className="h-2 bg-blue-200" />
                      <p className="text-xs text-center text-muted-foreground">
                        Session in progress
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  {log.status === "in_progress" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        disabled={loading}
                        onClick={() => handleCheckOut(log.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Check Out Customer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
