"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";

export function PaymentNotification() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [status, setStatus] = useState<"success" | "cancelled" | null>(null);

  useEffect(() => {
    const payment = searchParams.get("payment");
    
    if (payment === "success") {
      setStatus("success");
      setShow(true);
      
      // Clear URL params after 5 seconds
      setTimeout(() => {
        setShow(false);
        // Remove payment param from URL
        const params = new URLSearchParams(searchParams);
        params.delete("payment");
        router.replace(`?${params.toString()}`);
      }, 5000);
    } else if (payment === "cancelled") {
      setStatus("cancelled");
      setShow(true);
      
      // Clear URL params after 5 seconds
      setTimeout(() => {
        setShow(false);
        const params = new URLSearchParams(searchParams);
        params.delete("payment");
        router.replace(`?${params.toString()}`);
      }, 5000);
    }
  }, [searchParams, router]);

  if (!show || !status) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-in slide-in-from-top-5">
      {status === "success" ? (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-900 font-semibold">
            Payment Successful!
          </AlertTitle>
          <AlertDescription className="text-green-800">
            The booking has been created successfully. The customer will receive a confirmation email shortly.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-900 font-semibold">
            Payment Cancelled
          </AlertTitle>
          <AlertDescription className="text-red-800">
            The payment was cancelled. No booking was created. You can try again if needed.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}