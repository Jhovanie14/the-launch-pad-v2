"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MoreHorizontal,
  Crown,
  DollarSign,
  TrendingUp,
  Star,
  Plus,
  Sparkles,
  Check,
  Trash2,
  Upload,
} from "lucide-react";
import type { SubscriptionPlans } from "@/types";
import LoadingDots from "@/components/loading";

export default function SubscriptionView() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<
    SubscriptionPlans[]
  >([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [avgSubscription, setAvgSubscription] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlans | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    monthly_price: "",
    yearly_price: "",
    description: "",
    image_url: "",
  });

  const fetchRevenue = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_subscription")
        .select(
          `
        price_id,
        subscription_plan:subscription_plans (
          monthly_price,
          yearly_price
        )
      `
        )
        .eq("status", "active");

      if (error) throw error;

      if (data && data.length > 0) {
        // calculate total revenue based on monthly_price for simplicity
        const totalRevenue = data.reduce((acc, sub: any) => {
          const price = Number(sub.subscription_plan?.monthly_price || 0);
          return acc + price;
        }, 0);

        const avg = totalRevenue / data.length;

        setMonthlyRevenue(totalRevenue);
        setAvgSubscription(avg);
      } else {
        setMonthlyRevenue(0);
        setAvgSubscription(0);
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
      setMonthlyRevenue(0);
      setAvgSubscription(0);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Fetch subscription plans
  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    setLoading(false);

    if (error) return console.error(error);
    setSubscriptionPlans(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchSubscription();
    fetchRevenue();
  }, [fetchSubscription, fetchRevenue]);

  // Open modal
  const openModal = (plan?: SubscriptionPlans) => {
    if (plan) {
      setCurrentPlan(plan);
      setForm({
        name: plan.name,
        monthly_price: plan.monthly_price || "",
        yearly_price: plan.yearly_price || "",
        description: plan.description || "",
        image_url: plan.image_url || "",
      });
    } else {
      setCurrentPlan(null);
      setForm({
        name: "",
        monthly_price: "",
        yearly_price: "",
        description: "",
        image_url: "",
      });
    }
    setModalOpen(true);
  };

  // Upload image
  const handleImageUpload = async (file: File) => {
    try {
      setUploading(true);

      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed.");
        return "";
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `subscription-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("subscription-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("subscription-images")
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
      }
    } catch (error) {
      console.error("Error uploading plan image:", error);
      toast.error("Failed to upload image.");
      return "";
    } finally {
      setUploading(false);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      setUploading(true);

      // Upload image if file provided
      const payload = {
        name: form.name,
        monthly_price: form.monthly_price,
        yearly_price: form.yearly_price,
        description: form.description,
        image_url: form.image_url, // already set by handleImageUpload
      };

      if (currentPlan) {
        const { error } = await supabase
          .from("subscription_plans")
          .update(payload)
          .eq("id", currentPlan.id);
        if (error) throw error;
        toast.success("Plan updated!");
      } else {
        const { error } = await supabase
          .from("subscription_plans")
          .insert([payload]);
        if (error) throw error;
        toast.success("Plan added!");
      }

      fetchSubscription();
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save plan.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingDots />;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
              Subscription Plans
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your pricing tiers and subscription offerings
            </p>
          </div>
          <Button
            onClick={() => openModal()}
            size="lg"
            className="gap-2 shadow-lg hover:shadow-xl transition-shadow"
          >
            <Plus className="h-5 w-5" />
            Add New Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Active Plans
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {subscriptionPlans.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total subscription tiers
                  </p>
                </div>
                <div className="p-3 bg-chart-2/10 rounded-xl">
                  <Crown className="h-6 w-6 text-chart-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Monthly Revenue
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {monthlyRevenue}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    +12.5% from last month
                  </p>
                </div>
                <div className="p-3 bg-chart-1/10 rounded-xl">
                  <DollarSign className="h-6 w-6 text-chart-1" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Churn Rate
                  </p>
                  <p className="text-3xl font-bold text-foreground">3.2%</p>
                  <p className="text-xs text-muted-foreground">
                    Below industry average
                  </p>
                </div>
                <div className="p-3 bg-chart-4/10 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-chart-4" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Avg. Subscription
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {avgSubscription}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Per customer value
                  </p>
                </div>
                <div className="p-3 bg-chart-3/10 rounded-xl">
                  <Star className="h-6 w-6 text-chart-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {subscriptionPlans.length === 0 ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="p-4 bg-muted/50 rounded-full mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No subscription plans yet
              </h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Create your first subscription plan to start offering premium
                features to your customers
              </p>
              <Button onClick={() => openModal()} size="lg" className="gap-2">
                <Plus className="h-5 w-5" />
                Create First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {subscriptionPlans.map((plan, index) => (
              <Card
                key={plan.id}
                className="relative border-border/50 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-gradient-to-br from-card to-card/80 overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="absolute top-4 right-4 z-10 ">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openModal(plan)}
                    className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>

                <CardHeader className="py-6 relative">
                  <div className="flex flex-col items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {/* <Crown className="h-5 w-5 text-primary" /> */}
                      {plan.image_url && (
                        <img
                          src={plan.image_url}
                          alt={plan.name}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-bold">
                        {plan.name}
                      </CardTitle>
                      <CardDescription className="mt-2 text-base leading-relaxed">
                        {plan.description || "No description provided"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 relative">
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-xl border border-border/50">
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Monthly
                      </p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">
                          ${plan.monthly_price}
                        </span>
                        <span className="text-muted-foreground">/month</span>
                      </div>
                    </div>

                    {plan.yearly_price && (
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium text-muted-foreground">
                            Yearly
                          </p>
                          <Badge
                            variant="secondary"
                            className="bg-primary/10 text-primary border-primary/20"
                          >
                            Best Value
                          </Badge>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-foreground">
                            ${plan.yearly_price}
                          </span>
                          <span className="text-muted-foreground">/year</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <div
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                        plan.is_active
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`h-2 w-2 rounded-full ${plan.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`}
                      />
                      <span className="text-sm font-medium">
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {currentPlan ? "Edit Subscription Plan" : "Create New Plan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Plan Name
              </label>
              <Input
                placeholder="e.g., Premium, Enterprise"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Monthly Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    placeholder="29.99"
                    value={form.monthly_price}
                    onChange={(e) =>
                      setForm({ ...form, monthly_price: e.target.value })
                    }
                    className="pl-7 h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Yearly Price
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    placeholder="299.99"
                    value={form.yearly_price}
                    onChange={(e) =>
                      setForm({ ...form, yearly_price: e.target.value })
                    }
                    className="pl-7 h-11"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Description
              </label>
              <Textarea
                placeholder="Describe what's included in this plan..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Plan Image
                </label>
                {form.image_url ? (
                  <div className="relative w-full max-w-md">
                    <img
                      src={form.image_url}
                      alt="Plan Preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveImage}
                    >
                      <Trash2 className="w-4 h-4" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-sm text-muted-foreground">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="planImage"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                    <label
                      htmlFor="planImage"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="w-6 h-6 mb-2" />
                      {uploading ? "Uploading..." : "Click to upload image"}
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Check className="h-4 w-4" />
              {currentPlan ? "Update Plan" : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
