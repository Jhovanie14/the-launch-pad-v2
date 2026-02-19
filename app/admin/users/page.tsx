"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Car, Calendar, Crown, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import WalkInBookingModal from "@/components/walkin-booking-modal";
import WalkInProgressModal from "@/components/walkin-progress-modal";
import SelfServiceCheckInModal from "@/components/self-service-checkin-modal";
import SelfServiceUsageModal from "@/components/self-service-useage-modal";
import UpdateVehicleModal from "@/components/update-vehicle-modal";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const supabase = createClient();

  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = searchParams?.get("tab") ?? "users";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    setTab(searchParams?.get("tab") ?? "users");
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setTab(value);
    // update URL without refreshing the page
    router.replace(`/admin/users?tab=${value}`);
  };

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [expressSubs, setExpressSubs] = useState<any[]>([]);
  const [selfServiceSubs, setSelfServiceSubs] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  // Walk-In Booking Modal
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInSubscriber, setWalkInSubscriber] = useState<any>(null);

  // Walk-In Progress Modal
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<any>(null);

  // Self-Service Check-In Modal
  const [showSelfServiceCheckIn, setShowSelfServiceCheckIn] = useState(false);
  const [selfServiceSubscriber, setSelfServiceSubscriber] = useState<any>(null);

  // Self-Service Usage Modal
  const [showSelfServiceUsage, setShowSelfServiceUsage] = useState(false);
  const [selectedSelfServiceSub, setSelectedSelfServiceSub] =
    useState<any>(null);

  // Update Vehicle Modal
  const [showUpdateVehicle, setShowUpdateVehicle] = useState(false);
  const [updateVehicleSub, setUpdateVehicleSub] = useState<any>(null);
  const [updateVehicleType, setUpdateVehicleType] = useState<"express" | "selfservice">("express");

  // Monthly usage counts
  const [expressUsage, setExpressUsage] = useState<Record<string, number>>({});
  const [selfServiceUsage, setSelfServiceUsage] = useState<Record<string, number>>({});

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([
      loadUsers(),
      loadExpressSubs(),
      loadSelfServiceSubs(),
      loadExpressUsageCounts(),
      loadSelfServiceUsageCounts(),
    ]);
  }

  async function loadUsers() {
    const { data } = await supabase.from("profiles").select("*");
    setAllUsers(data || []);
  }

  async function loadExpressSubs() {
    const { data } = await supabase
      .from("user_subscription")
      .select(
        `
        *,
        profiles(*),
        subscription_vehicles (
          id,
          vehicle:vehicles (
            id,
            year,
            make,
            model,
            body_type,
            colors,
            license_plate
          )
        ),
        subscription_plan:subscription_plans (
          name,
          description,
          monthly_price,
          yearly_price
        )
      `
      )
      .eq("status", "active");
    setExpressSubs(data || []);
  }

  async function loadSelfServiceSubs() {
    const { data } = await supabase
      .from("self_service_subscriptions")
      .select(
        `
        *,
        profiles(*),
        self_service_subscription_vehicles (vehicles(*))
      `
      )
      .eq("status", "active");
    setSelfServiceSubs(data || []);
  }

  // --- Monthly usage count loaders ---
  async function loadExpressUsageCounts() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data } = await supabase
      .from("bookings")
      .select("user_id")
      .gte("appointment_date", startOfMonth);
    const counts: Record<string, number> = {};
    (data || []).forEach((b: any) => {
      counts[b.user_id] = (counts[b.user_id] || 0) + 1;
    });
    setExpressUsage(counts);
  }

  async function loadSelfServiceUsageCounts() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data } = await supabase
      .from("self_service_usage_logs")
      .select("subscription_id")
      .gte("check_in_time", startOfMonth);
    const counts: Record<string, number> = {};
    (data || []).forEach((l: any) => {
      counts[l.subscription_id] = (counts[l.subscription_id] || 0) + 1;
    });
    setSelfServiceUsage(counts);
  }

  // Pulse color helper
  function getUsagePulseColor(count: number) {
    if (count >= 5) return { bg: "bg-red-500", ring: "bg-red-400" };
    if (count === 4) return { bg: "bg-yellow-400", ring: "bg-yellow-300" };
    if (count >= 2) return { bg: "bg-lime-500", ring: "bg-lime-400" };
    return { bg: "bg-green-500", ring: "bg-green-400" };
  }

  const handleManageWalkIn = (subscriber: any) => {
    setSelectedSubscriber(subscriber);
    setShowProgressModal(true);
  };

  const handleCreateWalkIn = (subscriber: any) => {
    setWalkInSubscriber(subscriber);
    setShowWalkInModal(true);
  };

  const handleSelfServiceCheckIn = (subscriber: any) => {
    setSelfServiceSubscriber(subscriber);
    setShowSelfServiceCheckIn(true);
  };

  const handleViewSelfServiceUsage = (subscriber: any) => {
    setSelectedSelfServiceSub(subscriber);
    setShowSelfServiceUsage(true);
  };

  const handleUpdateVehicle = (subscriber: any, type: "express" | "selfservice") => {
    setUpdateVehicleSub(subscriber);
    setUpdateVehicleType(type);
    setShowUpdateVehicle(true);
  };

  function filterList(list: any[], key?: string) {
    return list.filter((item) => {
      const target = key ? item[key] : item;
      return (
        target?.full_name?.toLowerCase().includes(search) ||
        target?.email?.toLowerCase().includes(search)
      );
    });
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="container mx-auto px-4 py-10">
        <div className="p-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-xl">Admin – Users Overview</CardTitle>
            </CardHeader>
          </Card>

          <Input
            placeholder="Search users..."
            className="mb-4"
            onChange={(e) => setSearch(e.target.value.toLowerCase())}
          />

          <Tabs value={tab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="express">Express Subscribers</TabsTrigger>
              <TabsTrigger value="selfservice">
                Self-Service Subscribers
              </TabsTrigger>
            </TabsList>

            {/* ALL USERS */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filterList(allUsers).map((u) => (
                    <div
                      key={u.id}
                      className="p-4 border rounded-lg flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          <User size={16} />
                          {u.full_name}
                        </p>
                        <p className="text-sm flex items-center gap-2 text-muted-foreground">
                          <Mail size={14} /> {u.email}
                        </p>
                      </div>
                      <Badge variant="secondary">{u.role || "User"}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* EXPRESS SUBSCRIBERS */}
            <TabsContent value="express">
              <Card>
                <CardHeader>
                  <CardTitle>Express Subscribers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filterList(expressSubs, "profiles").map((sub) => (
                    <div
                      key={sub.id}
                      className="p-5 border rounded-lg space-y-3 hover:border-primary/50 transition-colors"
                    >
                      {/* Subscriber Info */}
                      <div className="flex flex-col-reverse md:flex-row md:justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex  items-center gap-2 font-medium text-blue-900 text-lg">
                            <Crown size={16} />
                            Subscription Plan: {sub.subscription_plan.name}
                          </div>

                          <p className="font-semibold text-lg flex items-center gap-2">
                            <User size={18} />
                            {sub.profiles.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail size={14} /> {sub.profiles.email}
                          </p>
                          {sub.profiles.phone && (
                            <p className="text-sm text-muted-foreground">
                              📞 {sub.profiles.phone}
                            </p>
                          )}

                          {/* Display Vehicles */}
                          {sub.subscription_vehicles &&
                            sub.subscription_vehicles.length > 0 && (
                              <div className="bg-muted/30 p-3 rounded-md mt-2">
                                <p className="font-semibold flex items-center gap-2 mb-2 text-sm">
                                  <Car size={14} /> Registered Vehicles
                                </p>
                                <div className="space-y-1">
                                  {sub.subscription_vehicles.map((sv: any) => (
                                    <div
                                      key={sv.id}
                                      className="text-sm text-muted-foreground flex items-center gap-2"
                                    >
                                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                                      <span>
                                        {sv.vehicle.year} {sv.vehicle.make}{" "}
                                        {sv.vehicle.model}
                                        {" - "}
                                        <span className="font-medium">
                                          {sv.vehicle.body_type}
                                        </span>
                                        {" - "}
                                        <span className="italic">
                                          {sv.vehicle.colors?.join(", ")}
                                        </span>
                                        <span className="italic">
                                          {sv.vehicle.license_plate}
                                        </span>
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500 text-white">
                            {sub.status === "active"
                              ? "Express Active"
                              : "Inactive"}
                          </Badge>
                          {/* Usage Pulse */}
                          {(() => {
                            const count = expressUsage[sub.user_id] || 0;
                            const pulse = getUsagePulseColor(count);
                            return (
                              <div className="flex items-center gap-1.5" title={`${count} booking(s) this month`}>
                                <span className="relative flex h-3 w-3">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulse.ring}`} />
                                  <span className={`relative inline-flex rounded-full h-3 w-3 ${pulse.bg}`} />
                                </span>
                                <span className="text-xs text-muted-foreground">{count}/mo</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Subscription Details */}
                      <div className="bg-muted/30 p-3 rounded-md text-sm space-y-1">
                        <p>
                          <strong>Subscription ID:</strong> {sub.id.slice(0, 8)}
                          ...
                        </p>
                        <p>
                          <strong>Started:</strong>{" "}
                          {new Date(sub.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleCreateWalkIn(sub)}
                          className="flex items-center gap-2"
                        >
                          <Calendar size={16} />
                          New Walk-In Booking
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleManageWalkIn(sub)}
                          className="flex items-center gap-2"
                        >
                          <Car size={16} />
                          Manage Bookings
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateVehicle(sub, "express")}
                          className="flex items-center gap-2"
                        >
                          <Pencil size={16} />
                          Update Vehicle
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filterList(expressSubs, "profiles").length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No express subscribers found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SELF-SERVICE SUBSCRIBERS */}
            <TabsContent value="selfservice">
              <Card>
                <CardHeader>
                  <CardTitle>Self-Service Subscribers</CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {filterList(selfServiceSubs, "profiles").map((selfSub) => (
                    <div
                      key={selfSub.id}
                      className="p-5 border rounded-lg space-y-3 hover:border-green-500/50 transition-colors"
                    >
                      {/* Subscriber Info */}
                      <div className="flex flex-col-reverse md:flex-row md:justify-between items-start">
                        <div className="space-y-2">
                          <p className="font-semibold text-lg flex items-center gap-2">
                            <User size={18} />
                            {selfSub.profiles.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Mail size={14} /> {selfSub.profiles.email}
                          </p>
                          {selfSub.profiles.phone && (
                            <p className="text-sm text-muted-foreground">
                              📞 {selfSub.profiles.phone}
                            </p>
                          )}

                          {/* Subscription Details */}
                          <div className="bg-green-50 p-3 rounded-md text-sm space-y-1">
                            <p>
                              <strong>Plan ID:</strong>{" "}
                              {selfSub.self_service_plan_id}
                            </p>
                            <p>
                              <strong>Period End:</strong>{" "}
                              {new Date(
                                selfSub.current_period_end
                              ).toLocaleDateString()}
                            </p>
                          </div>

                          {/* Vehicles */}
                          {selfSub.self_service_subscription_vehicles &&
                            selfSub.self_service_subscription_vehicles.length >
                              0 && (
                              <div className="bg-muted/30 p-3 rounded-md">
                                <p className="font-semibold flex items-center gap-2 mb-2 text-sm">
                                  <Car size={14} /> Registered Vehicles
                                </p>
                                <div className="space-y-1">
                                  {selfSub.self_service_subscription_vehicles.map(
                                    (v: any) => (
                                      <div
                                        key={`${v.id}-${v.vehicle_id}`}
                                        className="text-sm text-muted-foreground flex items-center gap-2"
                                      >
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        <span>
                                          {v.vehicles.year} {v.vehicles.make}{" "}
                                          {v.vehicles.model}
                                          {" - "}
                                          <span className="font-medium">
                                            {v.vehicles.body_type}
                                          </span>
                                          {" - "}
                                          <span className="italic">
                                            {v.vehicles.colors?.join(", ")}
                                          </span>
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500 text-white">
                            Self-Service Active
                          </Badge>
                          {/* Usage Pulse */}
                          {(() => {
                            const count = selfServiceUsage[selfSub.id] || 0;
                            const pulse = getUsagePulseColor(count);
                            return (
                              <div className="flex items-center gap-1.5" title={`${count} session(s) this month`}>
                                <span className="relative flex h-3 w-3">
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${pulse.ring}`} />
                                  <span className={`relative inline-flex rounded-full h-3 w-3 ${pulse.bg}`} />
                                </span>
                                <span className="text-xs text-muted-foreground">{count}/mo</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleSelfServiceCheckIn(selfSub)}
                          className="flex items-center gap-2 "
                        >
                          <Car size={16} />
                          Check In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewSelfServiceUsage(selfSub)}
                          className="flex items-center gap-2"
                        >
                          📊 View Usage
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateVehicle(selfSub, "selfservice")}
                          className="flex items-center gap-2"
                        >
                          <Pencil size={16} />
                          Update Vehicle
                        </Button>
                      </div>
                    </div>
                  ))}

                  {filterList(selfServiceSubs, "profiles").length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No self-service subscribers found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Walk-In Booking Modal - Create new booking */}
      {showWalkInModal && walkInSubscriber && (
        <WalkInBookingModal
          open={showWalkInModal}
          onOpenChange={setShowWalkInModal}
          subscriber={walkInSubscriber}
          onBookingCreated={() => {
            loadExpressSubs();
            toast.success("Walk-in booking created!");
          }}
        />
      )}

      {/* Walk-In Progress Modal - Manage existing bookings */}
      {showProgressModal && selectedSubscriber && (
        <WalkInProgressModal
          open={showProgressModal}
          subscriber={selectedSubscriber}
          onClose={() => setShowProgressModal(false)}
          onStatusChange={() => {
            toast.success("Booking updated!");
          }}
        />
      )}

      {/* Self-Service Check-In Modal */}
      {showSelfServiceCheckIn && selfServiceSubscriber && (
        <SelfServiceCheckInModal
          open={showSelfServiceCheckIn}
          subscriber={selfServiceSubscriber}
          onClose={() => setShowSelfServiceCheckIn(false)}
          onCheckInComplete={() => {
            loadSelfServiceSubs();
            toast.success("Customer checked in!");
          }}
        />
      )}

      {/* Self-Service Usage Modal */}
      {showSelfServiceUsage && selectedSelfServiceSub && (
        <SelfServiceUsageModal
          open={showSelfServiceUsage}
          subscriber={selectedSelfServiceSub}
          onClose={() => setShowSelfServiceUsage(false)}
          onStatusChange={() => {
            toast.success("Session updated!");
          }}
        />
      )}

      {/* Update Vehicle Modal */}
      {showUpdateVehicle && updateVehicleSub && (
        <UpdateVehicleModal
          open={showUpdateVehicle}
          onClose={() => setShowUpdateVehicle(false)}
          subscriberName={updateVehicleSub.profiles?.full_name || "Subscriber"}
          vehicles={
            updateVehicleType === "express"
              ? (updateVehicleSub.subscription_vehicles || []).map((sv: any) => sv.vehicle)
              : (updateVehicleSub.self_service_subscription_vehicles || []).map((sv: any) => sv.vehicles)
          }
          onUpdated={() => {
            if (updateVehicleType === "express") {
              loadExpressSubs();
            } else {
              loadSelfServiceSubs();
            }
          }}
        />
      )}
    </div>
  );
}
