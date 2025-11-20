"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  Car,
  CheckCircle,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  Droplets,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth-context";

type SelfServiceCheckInModalProps = {
  open: boolean;
  subscriber: any;
  onClose: () => void;
  onCheckInComplete?: () => void;
};

export default function SelfServiceCheckInModal({
  open,
  subscriber,
  onClose,
  onCheckInComplete,
}: SelfServiceCheckInModalProps) {
  const supabase = createClient();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [notes, setNotes] = useState("");

  const vehicles =
    subscriber?.self_service_subscription_vehicles?.map(
      (sv: any) => sv.vehicles
    ) || [];

  const handleCheckIn = async () => {
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle");
      return;
    }

    setLoading(true);
    try {
      console.log("Supabase user:", userProfile?.full_name);

      const attendantName = userProfile?.full_name ?? "Unknown";

      // Create a self-service usage log
      const { error } = await supabase.from("self_service_usage_logs").insert({
        subscription_id: subscriber.id,
        user_id: subscriber.user_id,
        vehicle_id: selectedVehicleId,
        check_in_time: new Date().toISOString(),
        attendant_name: attendantName,
        status: "in_progress",
        notes: notes || null,
      });

      if (error) {
        console.error("Check-in error:", error);
        toast.error("Failed to check in. Please try again.");
        return;
      }

      toast.success("Customer checked in successfully!");
      onCheckInComplete?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Droplets className="w-6 h-6 text-blue-500" />
            Self-Service Check-In
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Verify subscriber and check them in for self-service wash
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Subscriber Info Card */}
          <Card className="border-2 border-blue-200 bg-blue-50/30">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-lg">
                      {subscriber?.profiles?.full_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span>{subscriber?.profiles?.email}</span>
                  </div>
                  {subscriber?.profiles?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{subscriber?.profiles?.phone}</span>
                    </div>
                  )}
                </div>
                <Badge className="bg-green-500 text-white">
                  Self-Service Active
                </Badge>
              </div>

              {/* Subscription Details */}
              <div className="bg-white/50 p-3 rounded-md text-sm space-y-1">
                <p>
                  <strong>Plan ID:</strong> {subscriber?.self_service_plan_id}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <strong>Period Ends:</strong>{" "}
                  {new Date(
                    subscriber?.current_period_end
                  ).toLocaleDateString()}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  <span className="capitalize">{subscriber?.status}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Car className="w-5 h-5" />
              Select Vehicle
            </Label>
            {vehicles.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Car className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No vehicles registered
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {vehicles.map((vehicle: any) => (
                  <Card
                    key={vehicle.id}
                    className={`cursor-pointer transition-all ${
                      selectedVehicleId === vehicle.id
                        ? "border-2 border-blue-500 bg-blue-50/50 shadow-md"
                        : "border hover:border-blue-300 hover:bg-blue-50/20"
                    }`}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              selectedVehicleId === vehicle.id
                                ? "bg-blue-500 text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Car className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.body_type} • {vehicle.colors?.join(", ")}
                            </p>
                          </div>
                        </div>
                        {selectedVehicleId === vehicle.id && (
                          <CheckCircle className="w-6 h-6 text-blue-500" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes or observations..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleCheckIn}
              disabled={loading || !selectedVehicleId || vehicles.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Checking In...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Check In Customer
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-12"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
