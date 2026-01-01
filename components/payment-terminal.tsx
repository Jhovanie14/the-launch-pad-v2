"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CreditCard,
  Smartphone,
  CheckCircle2,
  Loader2,
  QrCode,
  X,
} from "lucide-react";

type PaymentTerminalProps = {
  open: boolean;
  amount: number;
  addOns: Array<{ name: string; price: number }>;
  customerName: string;
  onPaymentComplete: (paymentMethod: string, reference: string) => void;
  onCancel: () => void;
};

export default function PaymentTerminal({
  open,
  amount,
  addOns,
  customerName,
  onPaymentComplete,
  onCancel,
}: PaymentTerminalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"card" | "qr" | null>(
    null
  );
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [qrCode, setQrCode] = useState("");

  // Generate QR code data
  useEffect(() => {
    if (selectedMethod === "qr") {
      // In production, this would be a real payment QR from GCash/PayMaya API
      const paymentData = {
        merchant: "AutoDetailing Pro",
        amount: amount,
        reference: `PAY-${Date.now()}`,
        description: addOns.map((a) => a.name).join(", "),
      };
      setQrCode(JSON.stringify(paymentData));
    }
  }, [selectedMethod, amount, addOns]);

  // Simulate card processing
  const handleCardPayment = async () => {
    setProcessing(true);

    // Simulate card reader processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setProcessing(false);
    setPaymentSuccess(true);

    // Countdown before auto-closing
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPaymentComplete("card", `CARD-${Date.now()}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Simulate QR payment verification
  const handleQRPayment = async () => {
    setProcessing(true);

    // Simulate waiting for customer to scan and pay
    await new Promise((resolve) => setTimeout(resolve, 3000));

    setProcessing(false);
    setPaymentSuccess(true);

    // Countdown before auto-closing
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onPaymentComplete("gcash", `GCASH-${Date.now()}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetTerminal = () => {
    setSelectedMethod(null);
    setProcessing(false);
    setPaymentSuccess(false);
    setCountdown(3);
  };

  if (paymentSuccess) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-green-600">
                Payment Successful!
              </h2>
              <p className="text-muted-foreground">
                ₱{amount.toFixed(2)} received
              </p>
              <p className="text-sm text-muted-foreground">
                Closing in {countdown}...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => !processing && onCancel()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Payment Terminal</h1>
              <p className="text-blue-100">Customer: {customerName}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              disabled={processing}
              className="text-white hover:bg-white/20"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Left Side - Amount Display */}
          <div className="bg-gray-900 text-white p-8 space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-gray-400 uppercase tracking-wide">
                Amount Due
              </p>
              <div className="text-6xl font-bold text-green-400">
                ₱{amount.toFixed(2)}
              </div>
            </div>

            {/* Itemized List */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <p className="text-sm text-gray-400 uppercase tracking-wide">
                Items
              </p>
              {addOns.map((addon, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-300">{addon.name}</span>
                  <span className="text-white font-medium">
                    ₱{addon.price.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-green-400">₱{amount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Right Side - Payment Methods */}
          <div className="bg-white p-8">
            {!selectedMethod ? (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  Select Payment Method
                </h3>

                {/* Card Payment */}
                <button
                  onClick={() => setSelectedMethod("card")}
                  className="w-full group"
                >
                  <Card className="border-2 hover:border-blue-500 transition-all hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                          <CreditCard className="w-8 h-8 text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-lg font-semibold">
                            Card Payment
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Insert or tap your card
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>

                {/* QR Payment */}
                <button
                  onClick={() => setSelectedMethod("qr")}
                  className="w-full group"
                >
                  <Card className="border-2 hover:border-green-500 transition-all hover:shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-500 transition-colors">
                          <Smartphone className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-lg font-semibold">QR Payment</h4>
                          <p className="text-sm text-muted-foreground">
                            GCash, PayMaya, or any QR-enabled app
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </div>
            ) : selectedMethod === "card" ? (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  onClick={resetTerminal}
                  disabled={processing}
                  className="mb-4"
                >
                  ← Back
                </Button>

                <div className="text-center space-y-6">
                  <div className="w-32 h-32 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                    {processing ? (
                      <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                    ) : (
                      <CreditCard className="w-16 h-16 text-blue-600" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {processing
                        ? "Processing Payment..."
                        : "Insert or Tap Card"}
                    </h3>
                    <p className="text-muted-foreground">
                      {processing
                        ? "Please wait while we process your payment"
                        : "Place your card on the reader or insert chip card"}
                    </p>
                  </div>

                  {/* Card Animation */}
                  <div className="relative h-48 flex items-center justify-center">
                    <div
                      className={`w-64 h-40 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl shadow-2xl transform transition-all duration-500 ${
                        processing ? "scale-95 opacity-50" : "hover:scale-105"
                      }`}
                    >
                      <div className="p-6 text-white">
                        <div className="flex justify-between items-start mb-8">
                          <div className="w-12 h-8 bg-yellow-400 rounded"></div>
                          <span className="text-xs">VISA</span>
                        </div>
                        <div className="space-y-2">
                          <div className="text-xl tracking-widest">
                            •••• •••• •••• ••••
                          </div>
                          <div className="flex justify-between text-xs">
                            <span>CARD HOLDER</span>
                            <span>EXP</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {!processing && (
                    <Button
                      onClick={handleCardPayment}
                      size="lg"
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      Simulate Card Payment
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  onClick={resetTerminal}
                  disabled={processing}
                  className="mb-4"
                >
                  ← Back
                </Button>

                <div className="text-center space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {processing ? "Waiting for Payment..." : "Scan QR Code"}
                  </h3>
                  <p className="text-muted-foreground">
                    {processing
                      ? "Verifying payment..."
                      : "Use GCash, PayMaya, or any QR-enabled payment app"}
                  </p>

                  {/* QR Code Display */}
                  <div className="relative">
                    <div
                      className={`w-64 h-64 mx-auto bg-white border-4 border-gray-200 rounded-lg flex items-center justify-center transition-all ${
                        processing ? "opacity-50 scale-95" : ""
                      }`}
                    >
                      {processing ? (
                        <Loader2 className="w-16 h-16 text-green-600 animate-spin" />
                      ) : (
                        <QrCode className="w-48 h-48 text-gray-800" />
                      )}
                    </div>

                    {!processing && (
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                        ₱{amount.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 font-medium">
                      Supported Payment Methods
                    </p>
                    <div className="flex justify-center gap-4 mt-2">
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold">
                        GCash
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold">
                        PayMaya
                      </span>
                      <span className="px-3 py-1 bg-white rounded-full text-xs font-semibold">
                        UnionBank
                      </span>
                    </div>
                  </div>

                  {!processing && (
                    <Button
                      onClick={handleQRPayment}
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Simulate QR Payment
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
