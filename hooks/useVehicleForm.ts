"use client";

import { useState } from "react";
import { z } from "zod";

// Vehicle schema
export const vehicleSchema = z.object({
  make: z.string().min(4, "Make is required"),
  model: z.string().min(4, "Model is required"),
  year: z.string().regex(/^\d{4}$/, "Year must be a 4-digit number"),
  trim: z.string().optional(),
  body_type: z.string().nonempty("Please select a body type"),
  color: z.string().min(1, "Color is required"),
  licensePlate: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

export function useVehicleForm(initialValues?: Partial<VehicleFormData>) {
  const [vehicleInfo, setVehicleInfo] = useState<VehicleFormData>({
    year: initialValues?.year ?? "",
    make: initialValues?.make ?? "",
    model: initialValues?.model ?? "",
    trim: initialValues?.trim ?? "",
    body_type: initialValues?.body_type ?? "",
    color: initialValues?.color ?? "",
    licensePlate: initialValues?.licensePlate ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const validation = vehicleSchema.safeParse(vehicleInfo);

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(
        validation.error.flatten().fieldErrors
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
