"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { AddOnRow, ServicePackageRow } from "@/types/db";
import {
  HOLIDAY_SALE_ACTIVE,
  HOLIDAY_SALE_DISCOUNT,
} from "@/lib/booking/holidaySale";
import { applySale } from "@/lib/booking/pricingDisplay";

interface AddOnListProps {
  open: boolean;
  onClose: () => void;
  service: ServicePackageRow;
  addOns: AddOnRow[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Service price for the footer; 0 when subscription-free. */
  serviceDisplayPrice: number;
  isServiceFree: boolean;
  onSkip: () => void;
  onNext: () => void;
}

export default function AddOnList({
  open,
  onClose,
  service,
  addOns,
  selectedIds,
  onToggle,
  serviceDisplayPrice,
  isServiceFree,
  onSkip,
  onNext,
}: AddOnListProps) {
  if (!open) return null;

  // Hide add-ons already included as features of the selected service
  const visibleAddOns = addOns.filter((a) => {
    const serviceFeatures = service.features ?? [];
    return !serviceFeatures.some(
      (feature) =>
        feature.toLowerCase().trim() === (a.name ?? "").toLowerCase().trim()
    );
  });

  const addOnsOriginal = selectedIds.reduce((sum, id) => {
    const addOn = addOns.find((a) => a.id === id);
    return sum + (addOn ? Number(addOn.price) : 0);
  }, 0);
  const originalTotal = Number(service.price) + addOnsOriginal;
  const finalTotal = applySale(serviceDisplayPrice) + applySale(addOnsOriginal);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">Add-ons</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-96">
          <div className="divide-y divide-gray-100">
            {visibleAddOns.map((a) => {
              const isSelected = selectedIds.includes(a.id);
              return (
                <label
                  key={a.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-2xl font-medium text-black">
                        {a.name}
                      </h4>
                      <p className="text-sm font-semibold text-yellow-500">
                        {a.duration} (min)
                      </p>
                    </div>
                    <p className="font-light text-black text-sm">
                      {a.description}
                    </p>

                    <p className="text-xl font-semibold text-gray-700">
                      ${a.price.toFixed(2)}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(a.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-900">{service.name}</h4>
              {isServiceFree && addOnsOriginal === 0 ? (
                <div className="flex flex-col">
                  <p className="text-xl font-bold text-green-600">FREE</p>
                  <span className="text-xs text-gray-500 line-through">
                    ${originalTotal.toFixed(2)}
                  </span>
                </div>
              ) : HOLIDAY_SALE_ACTIVE ? (
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 line-through">
                      ${originalTotal.toFixed(2)}
                    </span>
                    <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded">
                      {Math.round(HOLIDAY_SALE_DISCOUNT * 100)}% OFF
                    </span>
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    ${finalTotal.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-xl font-bold text-gray-900">
                  ${finalTotal.toFixed(2)}
                </p>
              )}
            </div>
            {selectedIds.length === 0 ? (
              <Button variant="outline" onClick={onSkip} size="lg">
                Skip
              </Button>
            ) : (
              <Button
                onClick={onNext}
                size="lg"
                className="bg-blue-900 hover:bg-blue-800"
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
