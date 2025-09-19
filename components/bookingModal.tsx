"use client";

import { useBooking } from "@/context/bookingContext";
import { Button } from "./ui/button";
import { X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import AuthPromptModal from "./user/authPromptModal";
import { carApiService } from "@/lib/services/carapi";

export default function BookingModal() {
  const { isBookingModalOpen, closeBookingModal } = useBooking();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const [years, setYears] = useState<number[]>([]);
  const [makes, setMakes] = useState<string[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [trims, setTrims] = useState<{ id: number; trim: string }[]>([]);
  const [bodyTypes, setBodyTypes] = useState<string[]>([]);
  const [selectedTrimName, setSelectedTrimName] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedTrim, setSelectedTrim] = useState<number | null>(null);
  const [selectedBodyType, setSelectedBodyType] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Fetch years when modal opens
  useEffect(() => {
    if (isBookingModalOpen) {
      fetchYears();
    }
  }, [isBookingModalOpen]);

  const fetchYears = async () => {
    try {
      const data = await carApiService.getYears();
      setYears(data);
    } catch (error) {
      console.error("Error fetching years:", error);
      setYears([]);
    }
  };

  const fetchMakes = async (year: number) => {
    try {
      const data = await carApiService.getMakes(year);
      setMakes(data);
    } catch (error) {
      console.error("Error fetching makes:", error);
      setMakes([]);
    }
  };

  const fetchModels = async (year: number, make: string) => {
    try {
      const data = await carApiService.getModels(year, make);
      setModels(data);
    } catch (error) {
      console.error("Error fetching models:", error);
      setModels([]);
    }
  };

  const fetchTrims = async (year: number, make: string, model: string) => {
    try {
      const data = await carApiService.getTrims(year, make, model);
      setTrims(data);
      console.log(data);
    } catch (error) {
      console.error("Error fetching trims:", error);
      setTrims([]);
    }
  };

  const fetchBodyTypes = async (
    year: number,
    make: string,
    model: string,
    trim: string
  ) => {
    try {
      const data = await carApiService.getBodyType({ year, make, model, trim }); // string[] | null
      setBodyTypes(
        typeof data === "string" ? [data] : Array.isArray(data) ? data : []
      );
      console.log("body type", data);
    } catch (error) {
      console.error("Error fetching body types:", error);
      setBodyTypes([]);
    }
  };

  async function fetchColors(
    trimId: number,
    year: number,
    make: string,
    model: string,
    trim: string
  ) {
    try {
      const data = await carApiService.getColors(
        trimId,
        year,
        make,
        model,
        trim
      );
      setColors(data);
    } catch (error) {
      console.error("Error fetching colors:", error);
      setColors([]);
    }
  }

  if (!isBookingModalOpen) return null;

  const handleBooking = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }

    const trimName = trims.find((t) => t.id === selectedTrim!)?.trim || "";
    closeBookingModal();

    // Build URL with vehicle specs
    const params = new URLSearchParams({
      year: selectedYear!.toString(),
      make: selectedMake!,
      model: selectedModel!,
      trim: trimName,
      bodytype: selectedBodyType ?? "",
      color: selectedColor!,
    });

    // Redirect to service selection page
    window.location.href = `/booking/service?${params.toString()}`;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-xl mx-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-2xl font-bold ">
              Get Vehicle-Specific Pricing
            </h2>

            <Button
              variant="outline"
              size="icon"
              className="rounded-full"
              onClick={closeBookingModal}
            >
              <X className="text-red-600" />
            </Button>
          </div>
          <p className="text-sm text-start text-muted-foreground text-wrap mb-6">
            Enter your car info to see exact prices for your vehicle type
          </p>
          <div className="space-y-4">
            {/* Year Selection */}
            <div className="block text-sm font-medium mb-3">
              <select
                name=""
                id=""
                value={selectedYear || ""}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setSelectedYear(y);
                  setSelectedMake(null);
                  setSelectedModel(null);
                  setSelectedTrim(null);
                  setSelectedColor(null);
                  fetchMakes(y);
                }}
                required
                className="w-full text-gray-500 p-3 border-b focus:outline-none border-gray-300 disabled:bg-gray-100"
              >
                <option value="">Select Year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            {/* Make */}
            <div className="block text-sm font-medium mb-3">
              <select
                name=""
                id=""
                value={selectedMake || ""}
                onChange={(e) => {
                  const make = e.target.value;
                  setSelectedMake(e.target.value);
                  setSelectedModel(null);
                  setSelectedTrim(null);
                  setSelectedColor(null);
                  fetchModels(selectedYear!, make);
                }}
                required
                className="w-full text-gray-500 p-3 border-b focus:outline-none border-gray-300 disabled:bg-gray-100"
                disabled={!selectedYear}
              >
                <option value="">Select Make</option>
                {makes.map((make) => (
                  <option key={make} value={make}>
                    {make}
                  </option>
                ))}
              </select>
            </div>
            {/* Model */}
            <div className="block text-sm font-medium mb-3">
              <select
                name=""
                id=""
                value={selectedModel || ""}
                onChange={(e) => {
                  const model = e.target.value;
                  setSelectedModel(model);
                  setSelectedTrim(null);
                  setSelectedColor(null);
                  fetchTrims(selectedYear!, selectedMake!, model);
                }}
                className="w-full text-gray-500 p-3 border-b focus:outline-none border-gray-300 disabled:bg-gray-100"
                disabled={!selectedMake}
              >
                <option value="">Select Model</option>

                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
            {/* Trim */}
            <div className="block text-sm font-medium mb-3">
              <select
                name=""
                id=""
                value={selectedTrim || ""}
                onChange={(e) => {
                  const trimId = Number(e.target.value);
                  setSelectedTrim(trimId);
                  const trimObj = trims.find((t) => t.id === trimId);

                  setSelectedTrimName(trimObj?.trim || "");
                  setSelectedBodyType(null);
                  setSelectedColor(null);
                  fetchBodyTypes(
                    selectedYear!,
                    selectedMake!,
                    selectedModel!,
                    trimObj?.trim!
                  );
                  if (
                    trimObj &&
                    selectedYear &&
                    selectedMake &&
                    selectedModel
                  ) {
                    fetchColors(
                      trimId,
                      selectedYear,
                      selectedMake,
                      selectedModel,
                      trimObj.trim
                    );
                  }
                }}
                className="w-full text-gray-500 p-3 border-b focus:outline-none border-gray-300 disabled:bg-gray-100"
                disabled={!selectedModel}
              >
                <option value="">Select Trim</option>

                {trims.map((trim) => (
                  <option key={trim.id} value={trim.id}>
                    {trim.trim}
                  </option>
                ))}
              </select>
            </div>
            {/* Body Type */}
            <div className="block text-sm font-medium mb-3">
              <select
                name=""
                id=""
                value={selectedBodyType || ""}
                onChange={(e) => {
                  const bodyType = e.target.value;
                  setSelectedBodyType(bodyType);
                  setSelectedColor(null);
                }}
                className="w-full text-gray-500 p-3 border-b focus:outline-none border-gray-300 disabled:bg-gray-100"
                disabled={!selectedTrim}
              >
                <option value="">Select Body Type</option>
                {bodyTypes.map((bodyType) => (
                  <option key={bodyType} value={bodyType}>
                    {bodyType}
                  </option>
                ))}
              </select>
            </div>
            {/* Color */}
            <div className="block text-sm font-medium mb-3">
              <select
                name=""
                id=""
                value={selectedColor || ""}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-full text-gray-500 p-3 border-b focus:outline-none border-gray-300 disabled:bg-gray-100"
                disabled={!selectedBodyType}
              >
                <option value="">Available Colors</option>
                {colors.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            {/* Action Button */}
            <div className="flex items-center justify-center space-x-3 pt-4">
              <Button
                variant="outline"
                size="lg"
                className="w-full bg-blue-900 text-white hover:bg-blue-800 hover:text-white"
                onClick={handleBooking}
                disabled={
                  !selectedYear ||
                  !selectedMake ||
                  !selectedModel ||
                  !selectedTrim ||
                  !selectedBodyType ||
                  !selectedColor
                }
              >
                See My Pricing
              </Button>
            </div>
          </div>
        </div>
      </div>
      <AuthPromptModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
