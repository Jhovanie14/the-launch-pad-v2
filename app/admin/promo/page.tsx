"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import LoadingDots from "@/components/loading";

export default function AdminPromos() {
  const supabase = createClient();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPromo, setNewPromo] = useState({
    code: "",
    discount_percent: "",
    applies_to: "one_time",
  });

  // Fetch promos
  async function fetchPromos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setPromos(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchPromos();
  }, []);

  // Add promo
  async function addPromo() {
    if (!newPromo.code || !newPromo.discount_percent) {
      toast.error("Please fill all fields");
      return;
    }

    const { error } = await supabase.from("promo_codes").insert([
      {
        code: newPromo.code.trim().toUpperCase(),
        discount_percent: Number(newPromo.discount_percent),
        applies_to: newPromo.applies_to,
      },
    ]);

    if (error) toast.error(error.message);
    else {
      toast.success("Promo code added!");
      setNewPromo({ code: "", discount_percent: "", applies_to: "one_time" });
      fetchPromos();
    }
  }

  // Toggle active/inactive
  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await supabase
      .from("promo_codes")
      .update({ is_active: !isActive })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Promo ${!isActive ? "activated" : "deactivated"}`);
      fetchPromos();
    }
  }

  // Delete promo
  async function deletePromo(id: string) {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Promo deleted");
      fetchPromos();
    }
  }

  if (loading) {
    return <LoadingDots />;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto mt-16 lg:mt-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Promo Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Promo Code (e.g. WELCOME10)"
              value={newPromo.code}
              onChange={(e) =>
                setNewPromo({ ...newPromo, code: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Discount %"
              value={newPromo.discount_percent}
              onChange={(e) =>
                setNewPromo({ ...newPromo, discount_percent: e.target.value })
              }
            />
            <select
              className="border rounded-md px-3 py-2"
              value={newPromo.applies_to}
              onChange={(e) =>
                setNewPromo({ ...newPromo, applies_to: e.target.value })
              }
            >
              <option value="one_time">One-Time</option>
              <option value="subscription">Subscription</option>
              <option value="both">Both</option>
            </select>
          </div>
          <Button className="mt-2" onClick={addPromo}>
            Add Promo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Promo Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingDots />
          ) : promos.length === 0 ? (
            <p className="text-gray-500">No promo codes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.map((promo: any) => (
                  <TableRow key={promo.id}>
                    <TableCell>{promo.code}</TableCell>
                    <TableCell>{promo.discount_percent}%</TableCell>
                    <TableCell className="capitalize">
                      {promo.applies_to}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={promo.is_active}
                          onCheckedChange={() =>
                            toggleActive(promo.id, promo.is_active)
                          }
                        />
                        <span>{promo.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deletePromo(promo.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
