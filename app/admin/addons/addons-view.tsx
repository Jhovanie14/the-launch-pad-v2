"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Edit, Plus } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type AddOns = {
  id: string;
  name: string;
  price: number;
  duration: number;
  is_active: boolean;
  created_at: string | null;
};

export default function AddOnsView() {
  const supabase = createClient();
  const [form, setForm] = useState({
    name: "",
    price: "",
    duration: "",
    is_active: true,
  });

  const [addOns, setAddOns] = useState<AddOns[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setForm({
      name: "",
      price: "",
      duration: "",
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

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      console.log(form);
      const priceNum = Number(form.price);
      const durationNum = Number(form.duration);

      const { error } = await supabase.from("add_ons").insert([
        {
          name: form.name,
          price: priceNum,
          duration: durationNum,
          is_active: form.is_active,
        },
      ]);

      if (error) console.error(error);

      setOpen(false);
      resetForm();
      setSuccess("Created successfuly.");
    },
    [form]
  );

  const toggleAddOnStatus = async (id: string, newStatus: boolean) => {
    const { error } = await supabase
      .from("add_ons")
      .update({ is_active: newStatus })
      .eq("id", id);

    if (error) {
      console.error("Error updating status:", error);
    } else {
      // refresh list or update state
      setAddOns((prev) =>
        prev.map((a) => (a.id === id ? { ...a, is_active: newStatus } : a))
      );
    }
  };

  const fetchAddOns = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("add_ons")
      .select("*")
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) console.error(error);
    console.log(data);
    setAddOns(data ?? []);
  }, [supabase]);

  useEffect(() => {
    fetchAddOns();
  }, [fetchAddOns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Add Ons </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage your Add-ons offerings.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-900 hover:bg-blue-800">
              <Plus />
              Add Add-ons
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Service Package</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Premium Wash"
                  value={form.name}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="99.99"
                  value={form.price}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="60"
                  value={form.duration}
                  onChange={handleChange}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* {services.map((service) => {
          const ServiceIcon = getServiceIcon(service.category); */}
        {addOns.map((addon) => (
          <Card key={addon.id} className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* <ServiceIcon className="h-6 w-6 text-accent" /> */}
                  <div>
                    <CardTitle className="text-card-foreground">
                      {addon.name}
                    </CardTitle>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={addon.is_active}
                    onCheckedChange={(checked) =>
                      toggleAddOnStatus(addon.id, checked)
                    }
                  />
                  {/*  className="data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-gray-300 focus-visible:ring-emerald-600" */}
                  <Badge
                    variant={addon.is_active ? "outline" : "secondary"}
                    className={` ${
                      addon.is_active ? "bg-blue-900 text-white" : ""
                    }`}
                  >
                    {addon.is_active ? "Active" : "Inactive"}
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
                      ${addon.price}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {addon.duration} minutes
                    </p>
                  </div>
                  <Button size="sm" variant="outline">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
                {/* Features */}
                {/* <div>
                  <h4 className="font-medium text-card-foreground mb-2">
                    Features
                  </h4>
                  <div className="grid grid-cols-2 gap-1">
                    <p className="text-sm text-muted-foreground flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                      add-ons feature
                    </p>
                  </div>
                </div> */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
