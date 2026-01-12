"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { createBooking } from "@/app/(dashboard)/dashboard/booking/action";
import { toast } from "sonner";
import { useVehicleForm } from "@/hooks/useVehicleForm";

export function useBookingForm(onSuccess: () => void, subscriber?: any) {
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
    notes: "",
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

  // 🔹 Reset form to initial state
  const resetForm = useCallback(() => {
    setForm({
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      appointmentDate: "",
      appointmentTime: "",
      payment_method: "cash",
      notes: "",
    });
    setSelectedService(null);
    setSelectedAddOns([]);
    setVehicleInfo({
      year: "",
      make: "",
      model: "",
      body_type: "",
      color: "",
      licensePlate: "",
    });
  }, [setVehicleInfo]);

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
  const bodyType = (vehicleInfo as any).body_type;
  
  // Categories that are NOT dependent on vehicle body_type
  const UNIVERSAL_CATEGORIES = ["quick service", "express detail"];
  
  const filteredServices = bodyType
    ? services.filter((s) => {
        const categoryLower = s.category?.toLowerCase() || "";
        const isUniversalCategory = UNIVERSAL_CATEGORIES.includes(categoryLower);
        
        // Always show universal categories, or show body_type matched services
        return isUniversalCategory || categoryLower === bodyType.toLowerCase();
      })
    : services; // Show all services when no body type is provided

  // -----------------------------
  // 🔹 Handle Submit
  // -----------------------------
  const handleSubmit = async ({ 
    skipVehicleValidation = false,
    paymentMethod = "cash",
    discountPercent = 0
  } = {}) => {
    // ✅ Validate vehicle form
    if (!skipVehicleValidation && !validate()) {
      toast.error("Please fix vehicle form errors before submitting.");
      return;
    }

    // 🔹 NEW: Allow booking with NO service (only add-ons)
    if (!selectedService && selectedAddOns.length === 0) {
      toast.error("Please select at least a service package or add-ons.");
      return;
    }

    // 🔹 Get selected service (if any)
    const selectedServiceObj = selectedService
      ? services.find((s) => s.id === selectedService)
      : null;

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

    // 🔹 Calculate total price and duration
    const servicePrice = selectedServiceObj
      ? Number(selectedServiceObj.price || 0)
      : 0;
    const serviceDuration = selectedServiceObj
      ? Number(selectedServiceObj.duration || 0)
      : 0;

    let totalPrice = subscriber
      ? addOnsTotalPrice // subscriber pays only for add-ons
      : servicePrice + addOnsTotalPrice;

    // Apply promo code discount if provided
    if (discountPercent > 0) {
      totalPrice = totalPrice - (totalPrice * discountPercent) / 100;
    }

    const totalDuration = serviceDuration + addOnsTotalDuration;

    setLoading(true);

    try {
      await toast.promise(
        createBooking(
          {
            ...form,
            ...vehicleInfo,
            year: Number(vehicleInfo.year),
            colors: vehicleInfo.color
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean),
            addOnsId: selectedAddOns,
            appointmentDate: new Date(form.appointmentDate),
            servicePackage: selectedServiceObj || null,
            totalPrice,
            totalDuration,
            payment_method: paymentMethod, // 🔹 NEW: Pass payment method
          },
          subscriber?.user_id
        ),
        {
          loading: "Creating booking...",
          success: "Booking created successfully!",
          error: "Failed to create booking.",
        }
      );

      // Reset form after successful booking
      resetForm();
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
    resetForm,

    // Vehicle form
    vehicleInfo,
    setVehicleInfo,
    errors,
  };
}