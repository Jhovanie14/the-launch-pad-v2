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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import LoadingDots from "@/components/loading";

export default function AdminPromos() {
  const supabase = createClient();
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newPromo, setNewPromo] = useState({
    code: "",
    discount_type: "percent",   // 'percent' | 'flat'
    discount_percent: "",
    discount_amount: "",
    applies_to: "one_time",
    max_uses: "",
    restricted_to_service: "",
  });

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

  async function addPromo() {
    const isPercent = newPromo.discount_type === "percent";
    const discountValue = isPercent ? newPromo.discount_percent : newPromo.discount_amount;

    if (!newPromo.code || !discountValue) {
      toast.error(`Please fill in Code and Discount ${isPercent ? "%" : "Amount"}`);
      return;
    }

    const payload: Record<string, any> = {
      code: newPromo.code.trim().toUpperCase(),
      discount_type: newPromo.discount_type,
      discount_percent: isPercent ? Number(newPromo.discount_percent) : null,
      discount_amount: !isPercent ? Number(newPromo.discount_amount) : null,
      applies_to: newPromo.applies_to,
      used_count: 0,
    };

    if (newPromo.max_uses.trim() !== "") {
      payload.max_uses = Number(newPromo.max_uses);
    }

    if (newPromo.restricted_to_service.trim() !== "") {
      payload.restricted_to_service = newPromo.restricted_to_service.trim().toLowerCase();
    }

    const { error } = await supabase.from("promo_codes").insert([payload]);

    if (error) toast.error(error.message);
    else {
      toast.success("Promo code added!");
      setNewPromo({ code: "", discount_type: "percent", discount_percent: "", discount_amount: "", applies_to: "one_time", max_uses: "", restricted_to_service: "" });
      fetchPromos();
    }
  }

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

  async function deletePromo(id: string) {
    const { error } = await supabase.from("promo_codes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Promo deleted");
      fetchPromos();
    }
  }

  if (loading) return <LoadingDots />;

  return (
    <div className="p-8 max-w-6xl mx-auto mt-16 lg:mt-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Promo Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Code (e.g. LAUNCHPAD2026)"
              value={newPromo.code}
              onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
            />
            {/* Discount type toggle + value */}
            <div className="flex gap-2">
              <select
                className="border rounded-md px-2 py-2 text-sm w-24 shrink-0"
                value={newPromo.discount_type}
                onChange={(e) => setNewPromo({ ...newPromo, discount_type: e.target.value, discount_percent: "", discount_amount: "" })}
              >
                <option value="percent">%</option>
                <option value="flat">$ off</option>
              </select>
              {newPromo.discount_type === "percent" ? (
                <Input
                  type="number"
                  placeholder="e.g. 20"
                  value={newPromo.discount_percent}
                  onChange={(e) => setNewPromo({ ...newPromo, discount_percent: e.target.value })}
                />
              ) : (
                <Input
                  type="number"
                  placeholder="e.g. 20"
                  value={newPromo.discount_amount}
                  onChange={(e) => setNewPromo({ ...newPromo, discount_amount: e.target.value })}
                />
              )}
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={newPromo.applies_to}
              onChange={(e) => setNewPromo({ ...newPromo, applies_to: e.target.value })}
            >
              <option value="one_time">One-Time Booking</option>
              <option value="subscription">Subscription</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Max Uses <span className="text-gray-400">(leave blank = unlimited)</span>
              </label>
              <Input
                type="number"
                min="1"
                placeholder="e.g. 1 for single-use"
                value={newPromo.max_uses}
                onChange={(e) => setNewPromo({ ...newPromo, max_uses: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">
                Restrict to Service <span className="text-gray-400">(leave blank = any service)</span>
              </label>
              <Input
                placeholder="e.g. classic complete"
                value={newPromo.restricted_to_service}
                onChange={(e) => setNewPromo({ ...newPromo, restricted_to_service: e.target.value })}
              />
            </div>
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
          {promos.length === 0 ? (
            <p className="text-gray-500">No promo codes yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Restricted To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promos.map((promo: any) => {
                  const usedCount = promo.used_count ?? 0;
                  const maxUses = promo.max_uses ?? null;
                  const exhausted = maxUses !== null && usedCount >= maxUses;

                  return (
                    <TableRow key={promo.id}>
                      <TableCell className="font-mono font-semibold">{promo.code}</TableCell>
                      <TableCell>
                        {promo.discount_type === "flat"
                          ? `$${Number(promo.discount_amount).toFixed(2)} off`
                          : `${promo.discount_percent}%`}
                      </TableCell>
                      <TableCell className="capitalize">{promo.applies_to?.replace("_", " ")}</TableCell>
                      <TableCell>
                        <span className={exhausted ? "text-red-500 font-semibold" : ""}>
                          {usedCount} / {maxUses ?? "∞"}
                        </span>
                        {exhausted && (
                          <Badge variant="destructive" className="ml-2 text-xs">Exhausted</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {promo.restricted_to_service ? (
                          <Badge variant="outline" className="capitalize text-xs">
                            {promo.restricted_to_service}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-xs">Any</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={promo.is_active}
                            onCheckedChange={() => toggleActive(promo.id, promo.is_active)}
                          />
                          <span className="text-sm">{promo.is_active ? "Active" : "Inactive"}</span>
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
