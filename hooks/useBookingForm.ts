"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createBooking } from "@/app/(dashboard)/dashboard/booking/action";
import { toast } from "sonner";
import { useVehicleForm } from "@/hooks/useVehicleForm";

export function useBookingForm(onSuccess: () => void) {
  const supabase = createClient();

  // 🔹 Vehicle form state (with validation)
  const { vehicleInfo, setVehicleInfo, errors, validate } = useVehicleForm();

  // 🔹 Booking-related state
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [addOns, setAddOns] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // 🔹 Customer + appointment info
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    appointmentDate: "",
    appointmentTime: "",
    payment_method: "cash",
  });

  // -----------------------------
  // 🔹 Helpers
  // -----------------------------
  const handleChange = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleAddOn = (id: string) =>
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );

  // -----------------------------
  // 🔹 Fetch Data
  // -----------------------------
  const fetchData = useCallback(async () => {
    const [servicesRes, addOnsRes] = await Promise.all([
      supabase.from("service_packages").select("*").eq("is_active", true),
      supabase.from("add_ons").select("*").eq("is_active", true),
    ]);

    if (!servicesRes.error) setServices(servicesRes.data ?? []);
    if (!addOnsRes.error) setAddOns(addOnsRes.data ?? []);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------
  // 🔹 Filter Services by Body Type
  // -----------------------------
  const filteredServices = vehicleInfo.body_type
    ? services.filter(
        (s) => s.category?.toLowerCase() === vehicleInfo.body_type.toLowerCase()
      )
    : [];

  // -----------------------------
  // 🔹 Handle Submit
  // -----------------------------
  const handleSubmit = async () => {
    // ✅ Validate vehicle form
    if (!validate()) {
      toast.error("Please fix vehicle form errors before submitting.");
      return;
    }

    if (!selectedService) {
      toast.error("Please select a service package.");
      return;
    }

    const selectedServiceObj = services.find((s) => s.id === selectedService);
    if (!selectedServiceObj) {
      toast.error("Invalid service selected.");
      return;
    }

    const selectedAddOnObjs = addOns.filter((a) =>
      selectedAddOns.includes(a.id)
    );

    const addOnsTotalPrice = selectedAddOnObjs.reduce(
      (sum, a) => sum + Number(a.price || 0),
      0
    );
    const addOnsTotalDuration = selectedAddOnObjs.reduce(
      (sum, a) => sum + Number(a.duration || 0),
      0
    );

    const totalPrice = Number(selectedServiceObj.price || 0) + addOnsTotalPrice;
    const totalDuration =
      Number(selectedServiceObj.duration || 0) + addOnsTotalDuration;

    setLoading(true);

    try {
      await toast.promise(
        createBooking({
          ...form,
          ...vehicleInfo,
          year: Number(vehicleInfo.year),
          colors: vehicleInfo.color
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
          addOnsId: selectedAddOns,
          appointmentDate: new Date(form.appointmentDate),
          servicePackage: selectedServiceObj,
          totalPrice,
          totalDuration,
        }),
        {
          loading: "Creating booking...",
          success: "Booking created successfully!",
          error: "Failed to create booking.",
        }
      );

      onSuccess();
    } catch (err) {
      console.error("❌ Booking creation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------
  // 🔹 Return all state + helpers
  // -----------------------------
  return {
    loading,
    form,
    handleChange,
    services: filteredServices,
    addOns,
    selectedService,
    setSelectedService,
    selectedAddOns,
    toggleAddOn,
    handleSubmit,

    // Vehicle form
    vehicleInfo,
    setVehicleInfo,
    errors,
  };
}
