"use client";

import { useState } from "react";
import { z } from "zod";

// Vehicle schema
export const vehicleSchema = z.object({
  // make: z.string().min(1, "Make is required"),
  // model: z.string().min(1, "Model is required"),
  // year: z.string().regex(/^\d{4}$/, "Year must be a 4-digit number"),
  // body_type: z.string().optional(),
  // color: z.string().min(1, "Color is required"),
  license_plate: z.optional(z.string()), // License plate is completely optional
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

export function useVehicleForm(initialValues?: Partial<VehicleFormData>) {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleFormData>({
    // year: initialValues?.year ?? "",
    // make: initialValues?.make ?? "",
    // model: initialValues?.model ?? "",
    // body_type: initialValues?.body_type ?? "",
    // color: initialValues?.color ?? "",
    license_plate: initialValues?.license_plate ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const validation = vehicleSchema.safeParse(vehicleInfo);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(
        validation.error.flatten().fieldErrors,
      )) {
        if (messages) fieldErrors[field] = messages[0];
      }
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  return {
    vehicleInfo,
    setVehicleInfo,
    errors,
    validate,
  };
}

// Hook for managing multiple vehicles (flock)
export function useVehicleFlock(initialVehicles?: VehicleFormData[]) {
  const [vehicles, setVehicles] = useState<VehicleFormData[]>(
    initialVehicles && initialVehicles.length > 0
      ? initialVehicles
      : [
          {
            // year: "",
            // make: "",
            // model: "",
            // color: "",
            license_plate: "",
          },
        ],
  );

  const [errors, setErrors] = useState<Record<number, Record<string, string>>>(
    {},
  );

  const MAX_VEHICLES = 5;

  const addVehicle = () => {
    if (vehicles.length < MAX_VEHICLES) {
      setVehicles([
        ...vehicles,
        {
          // year: "",
          // make: "",
          // model: "",
          // body_type: "",
          // color: "",
          license_plate: "",
        },
      ]);
    }
  };

  const removeVehicle = (index: number) => {
    if (vehicles.length > 1) {
      const newVehicles = vehicles.filter((_, i) => i !== index);
      setVehicles(newVehicles);
      // Clear errors for removed vehicle
      const newErrors = { ...errors };
      delete newErrors[index];
      // Reindex errors
      const reindexedErrors: Record<number, Record<string, string>> = {};
      Object.keys(newErrors).forEach((key) => {
        const oldIndex = Number(key);
        if (oldIndex > index) {
          reindexedErrors[oldIndex - 1] = newErrors[oldIndex];
        } else {
          reindexedErrors[oldIndex] = newErrors[oldIndex];
        }
      });
      setErrors(reindexedErrors);
    }
  };

  const updateVehicle = (index: number, updates: Partial<VehicleFormData>) => {
    const newVehicles = [...vehicles];
    newVehicles[index] = { ...newVehicles[index], ...updates };
    setVehicles(newVehicles);
    // Clear errors for this vehicle when updating
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<number, Record<string, string>> = {};
    let isValid = true;

    vehicles.forEach((vehicle, index) => {
      const validation = vehicleSchema.safeParse(vehicle);
      if (!validation.success) {
        isValid = false;
        const fieldErrors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(
          validation.error.flatten().fieldErrors,
        )) {
          if (messages) fieldErrors[field] = messages[0];
        }
        newErrors[index] = fieldErrors;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  return {
    vehicles,
    setVehicles,
    addVehicle,
    removeVehicle,
    updateVehicle,
    errors,
    validate,
    canAddMore: vehicles.length < MAX_VEHICLES,
    maxVehicles: MAX_VEHICLES,
  };
}
