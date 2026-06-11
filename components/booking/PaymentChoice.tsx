"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Banknote, CreditCard } from "lucide-react";

interface PaymentChoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Only authenticated users may pay cash (the server enforces this too). */
  allowCash: boolean;
  value: "card" | "cash";
  onChange: (v: "card" | "cash") => void;
  onConfirm: () => void;
}

export default function PaymentChoice({
  open,
  onOpenChange,
  allowCash,
  value,
  onChange,
  onConfirm,
}: PaymentChoiceProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Choose Payment Method</AlertDialogTitle>
          <AlertDialogDescription>
            Please select how you’d like to pay for your booking.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div
          className={`grid ${allowCash ? "grid-cols-2" : "grid-cols-1"} gap-4 mt-4`}
        >
          {/* Pay with Card */}
          <label
            className={`flex items-center justify-center gap-1 p-2 border rounded-2xl cursor-pointer transition-all ${
              value === "card"
                ? "border-blue-600 bg-blue-50 shadow-sm"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="payment"
              value="card"
              checked={value === "card"}
              onChange={() => onChange("card")}
              className="hidden"
            />
            <CreditCard
              className={`w-6 h-6 ${
                value === "card" ? "text-blue-600" : "text-gray-500"
              }`}
            />
            <span
              className={`text-sm font-medium ${
                value === "card" ? "text-blue-700" : "text-gray-700"
              }`}
            >
              Pay with Card
            </span>
          </label>

          {/* Pay with Cash */}
          {allowCash && (
            <label
              className={`flex items-center justify-center gap-1 p-2 border rounded-2xl cursor-pointer transition-all ${
                value === "cash"
                  ? "border-green-600 bg-green-50 shadow-sm"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={value === "cash"}
                onChange={() => onChange("cash")}
                className="hidden"
              />
              <Banknote
                className={`w-6 h-6 ${
                  value === "cash" ? "text-green-600" : "text-gray-500"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  value === "cash" ? "text-green-700" : "text-gray-700"
                }`}
              >
                Pay with Cash
              </span>
            </label>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-blue-900 hover:bg-blue-800"
            onClick={onConfirm}
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
