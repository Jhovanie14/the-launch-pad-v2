"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Car, CheckCircle, Save, Pencil } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";

type VehicleData = {
  id: string;
  year: number | null;
  make: string | null;
  model: string | null;
  body_type: string | null;
  colors: string[] | null;
  license_plate: string | null;
};

type UpdateVehicleModalProps = {
  open: boolean;
  onClose: () => void;
  vehicles: VehicleData[];
  subscriberName: string;
  onUpdated?: () => void;
};

export default function UpdateVehicleModal({
  open,
  onClose,
  vehicles,
  subscriberName,
  onUpdated,
}: UpdateVehicleModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );

  // Form fields
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [colors, setColors] = useState("");
  const [licensePlate, setLicensePlate] = useState("");

  // Auto-select first vehicle when modal opens
  useEffect(() => {
    if (open && vehicles.length > 0) {
      const first = vehicles[0];
      setSelectedVehicleId(first.id);
      populateForm(first);
    }
  }, [open, vehicles]);

  function populateForm(vehicle: VehicleData) {
    setYear(vehicle.year?.toString() ?? "");
    setMake(vehicle.make ?? "");
    setModel(vehicle.model ?? "");
    setBodyType(vehicle.body_type ?? "");
    setColors(vehicle.colors?.join(", ") ?? "");
    setLicensePlate(vehicle.license_plate ?? "");
  }

  function handleSelectVehicle(vehicle: VehicleData) {
    setSelectedVehicleId(vehicle.id);
    populateForm(vehicle);
  }

  async function handleSave() {
    if (!selectedVehicleId) return;

    setLoading(true);
    try {
      const colorsArray = colors
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      const { error } = await supabase
        .from("vehicles")
        .update({
          year: year ? parseInt(year, 10) : null,
          make: make || null,
          model: model || null,
          body_type: bodyType || null,
          colors: colorsArray.length > 0 ? colorsArray : null,
          license_plate: licensePlate?.trim().toUpperCase() || null,
        })
        .eq("id", selectedVehicleId);

      if (error) {
        console.error("Vehicle update error:", error);
        toast.error("Failed to update vehicle. Please try again.");
        return;
      }

      toast.success("Vehicle info updated successfully!");
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold flex items-center gap-2">
            <Pencil className="w-6 h-6 text-blue-500" />
            Update Vehicle Info
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Editing vehicles for <strong>{subscriberName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Vehicle Selection */}
          {vehicles.length > 1 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Car className="w-5 h-5" />
                Select Vehicle to Edit
              </Label>
              <div className="grid gap-3">
                {vehicles.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    className={`cursor-pointer transition-all ${
                      selectedVehicleId === vehicle.id
                        ? "border-2 border-blue-500 bg-blue-50/50 shadow-md"
                        : "border hover:border-blue-300 hover:bg-blue-50/20"
                    }`}
                    onClick={() => handleSelectVehicle(vehicle)}
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
                              {vehicle.body_type} •{" "}
                              {vehicle.colors?.join(", ")}
                              {vehicle.license_plate &&
                                ` • ${vehicle.license_plate}`}
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
            </div>
          )}

          {/* Edit Form */}
          {selectedVehicleId && (
            <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle Details
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle-year">Year</Label>
                  <Input
                    id="vehicle-year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-make">Make</Label>
                  <Input
                    id="vehicle-make"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    placeholder="e.g. Toyota"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-model">Model</Label>
                  <Input
                    id="vehicle-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Camry"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-body-type">Body Type</Label>
                  <Input
                    id="vehicle-body-type"
                    value={bodyType}
                    onChange={(e) => setBodyType(e.target.value)}
                    placeholder="e.g. Sedan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-colors">Colors</Label>
                  <Input
                    id="vehicle-colors"
                    value={colors}
                    onChange={(e) => setColors(e.target.value)}
                    placeholder="e.g. Red, Black"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate multiple colors with commas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicle-plate">License Plate</Label>
                  <Input
                    id="vehicle-plate"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. ABC 1234"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={loading || !selectedVehicleId}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-5 h-5" />
                  Save Changes
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
