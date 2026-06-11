"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Car, Check, X } from "lucide-react";

interface VehiclePickerProps {
  licensePlate: string;
  onChange: (plate: string) => void;
  onSaved: () => void;
}

// Guest plate entry. Logged-in users arrive with their vehicle preselected in
// the URL (via the dashboard booking modal), so this only renders for guests.
export default function VehiclePicker({
  licensePlate,
  onChange,
  onSaved,
}: VehiclePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-6">
      <Card className="mb-6 shadow-sm border-2 border-blue-600">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">
              Vehicle Information
            </CardTitle>
            <p className="text-sm text-gray-500">
              {licensePlate
                ? `${licensePlate}`
                : "No vehicle information added yet"}
            </p>
          </div>

          <Button
            className="bg-blue-900 text-white hover:bg-blue-800 transition-all"
            onClick={() => setOpen(true)}
          >
            {licensePlate ? "Edit Vehicle" : "Add Vehicle"}
          </Button>
        </CardHeader>
      </Card>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-linear-to-r from-blue-900 to-blue-800 text-white">
              <div>
                <h2 className="text-lg font-semibold">
                  {licensePlate
                    ? "Edit Vehicle Information"
                    : "Add Vehicle Information"}
                </h2>
                <p className="text-xs text-blue-100">
                  Your vehicle details help us recommend the right services.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="text-blue-100 hover:text-white hover:bg-blue-800/30"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              <div className="">
                <div className="space-y-2">
                  <Label
                    htmlFor="license-plate"
                    className="text-sm font-medium text-gray-700"
                  >
                    License Plate
                  </Label>
                  <Input
                    id="license-plate"
                    type="text"
                    placeholder="e.g.ABC123"
                    value={licensePlate}
                    onChange={(e) => onChange(e.target.value)}
                    className="rounded-lg uppercase text-lg focus-visible:ring-blue-900"
                  />
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 flex items-start space-x-3">
                <Car className="w-5 h-5 mt-0.5 text-blue-700 shrink-0" />
                <p>
                  These details ensure accurate service and information to help
                  our team prepare for your service.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
              <Button
                className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2 rounded-xl px-5"
                onClick={() => {
                  setOpen(false);
                  onSaved();
                }}
              >
                <Check className="w-4 h-4" />
                Save Vehicle
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
