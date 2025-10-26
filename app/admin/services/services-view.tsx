"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Car,
  CheckCircle,
  Clock,
  Droplets,
  Edit,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ServicePackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  features: string[] | null;
  category: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type FormState = {
  name: string;
  category: string;
  price: string;
  duration: string;
  description: string;
  features: string;
  is_active: boolean;
};

const initialFormState: FormState = {
  name: "",
  category: "",
  price: "",
  duration: "",
  description: "",
  features: "",
  is_active: true,
};

export default function ServicesView() {
  const supabase = createClient();
  const [form, setForm] = useState<FormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  //
  const getServiceIcon = (category: string) => {
    switch (category) {
      case "Self-Service":
        return Car;
      case "Handwash":
        return Droplets;
      case "Professional Detailing":
        return Sparkles;
      case "Quick Service":
        return Clock;
      default:
        return Wrench;
    }
  };

  // filters

  // modal + form
  const [open, setOpen] = useState(false);
  const openModal = () => setOpen(true);
  // const closeModal = () => setOpen(false);
  const resetForm = () => {
    setForm({
      name: "",
      category: "",
      price: "",
      duration: "",
      description: "",
      features: "",
      is_active: true,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setForm((s) => ({ ...s, [id]: value }));
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = e.target;
    setForm((s) => ({ ...s, [id]: checked }));
  };

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("service_packages")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setServices(data ?? []);
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const toggleAddOnStatus = async (id: string, newStatus: boolean) => {
    const { error } = await supabase
      .from("service_packages")
      .update({ is_active: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating status:", error);
    } else {
      // refresh list or update state
      console.log(newStatus);
      setServices((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: newStatus } : a))
      );
    }
  };

  const handleEdit = (service: ServicePackage) => {
    setForm({
      name: service.name,
      category: service.category,
      price: service.price.toString(),
      duration: service.duration.toString(),
      description: service.description || "",
      features: service.features?.join(", ") || "",
      is_active: service.is_active,
    });
    setEditingId(service.id);
    setOpen(true);
  };

  // define this outside
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    const priceNum = Number(form.price);
    const durationNum = Number(form.duration);
    const featuresArr = form.features
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: form.name,
      description: form.description || null,
      price: priceNum,
      duration: durationNum,
      features: featuresArr,
      category: form.category,
      is_active: form.is_active,
    };

    try {
      if (editingId) {
        // Update
        const { error } = await supabase
          .from("service_packages")
          .update(payload)
          .eq("id", editingId);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from("service_packages")
          .insert([payload]);

        if (error) throw error;
      }

      setOpen(false);
      resetForm();
      await fetchPackages();
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setSubmitLoading(true);
    try {
      const { error } = await supabase
        .from("service_packages")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      console.log("Deleted service with ID:", deleteId);

      setServices((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteDialogOpen(false);
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting service:", error);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="animate-pulse bg-gray-200 h-8 w-16 rounded"></div>
              <div className="animate-pulse bg-gray-200 h-6 w-48 rounded"></div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="animate-pulse bg-white rounded-lg p-6 h-48"></div>
            <div className="animate-pulse bg-white rounded-lg p-6 h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Service Packages</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your service offerings.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              resetForm();
              setEditingId(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              className="bg-blue-900 hover:bg-blue-800"
              onClick={() => {
                resetForm();
                setEditingId(null);
                setOpen(true);
              }}
            >
              <Plus />
              Add Package
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Service Package" : "Create Service Package"}
              </DialogTitle>
              <DialogDescription>
                {editingId
                  ? "Update the details of your service package."
                  : "Fill out the form to create a new service package."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Premium Wash"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Exterior"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={form.price}
                  onChange={handleChange}
                  step="0.01"
                  placeholder="99.99"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  value={form.duration}
                  onChange={handleChange}
                  type="number"
                  placeholder="60"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Detailed exterior hand wash with sealant."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Input
                  id="features"
                  value={form.features}
                  onChange={handleChange}
                  placeholder="Foam pre-wash, Hand dry, Tire shine"
                />
              </div>

              <div className="flex items-center gap-3 md:col-span-2">
                <input
                  id="is_active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={handleCheckbox}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <DialogFooter className="md:col-span-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="q">Search</Label>
          <Input id="q" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat">Category</Label>
          <select
            id="cat"
            className="w-full rounded-md border bg-background p-2"
          >
            <option>All</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="active">Status</Label>
          <select
            id="active"
            className="w-full rounded-md border bg-background p-2"
          >
            <option value="all">All</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {services.map((service) => {
          const ServiceIcon = getServiceIcon(service.category);
          return (
            <Card key={service.id} className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ServiceIcon className="h-6 w-6 text-accent" />
                    <div>
                      <CardTitle className="text-card-foreground">
                        {service.name}
                      </CardTitle>
                      <CardDescription>{service.category}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={service.is_active}
                      onCheckedChange={(checked) =>
                        toggleAddOnStatus(service.id, checked)
                      }
                    />
                    <Badge
                      variant={service.is_active ? "default" : "secondary"}
                      className={`${
                        service.is_active ? "bg-blue-900 text-white" : ""
                      }`}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Pricing and Duration */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-accent-foreground">
                        ${service.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {service.duration} minutes
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setDeleteId(service.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>

                  {/* Features */}
                  <div>
                    <h4 className="font-medium text-card-foreground mb-2">
                      Features
                    </h4>
                    <div className="grid grid-cols-2 gap-1">
                      {service.features?.map((feature, index) => (
                        <p
                          key={index}
                          className="text-sm text-muted-foreground flex items-center"
                        >
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          {feature}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  {/* <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Bays
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {service.baysOccupied}/{service.baysAvailable} occupied
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Daily Bookings
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {service.dailyBookings}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Weekly Revenue
                      </p>
                      <p className="text-sm text-accent font-medium">
                        ${service.weeklyRevenue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        Utilization
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {service.baysAvailable > 0
                          ? Math.round(
                              (service.baysOccupied / service.baysAvailable) *
                                100
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </div> */}

                  {/* Equipment */}
                  {/* <div>
                    <h4 className="font-medium text-card-foreground mb-2">
                      Equipment
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {service.equipment.map((item, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div> */}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit Service
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-transparent"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      View Analytics
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Package</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service package? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {submitLoading && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
