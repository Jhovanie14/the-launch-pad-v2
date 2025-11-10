"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

type PaymentQR = {
  id: string;
  title: string;
  imageUrl: string;
  paymentLink: string;
};

export default function PaymentQRPage() {
  const paymentQRs: PaymentQR[] = [
    {
      id: "cash",
      title: "Counter Payment QR",
      imageUrl: "/qr-images/cash-counter-payment.png",
      paymentLink: "https://buy.stripe.com/cNibJ0fPI0Sz1hvbdXcwg02",
    },
    {
      id: "tip",
      title: "Tip QR",
      imageUrl: "/qr-images/tip-qr.png",
      paymentLink: "https://buy.stripe.com/bJeaEW32W1WD4tHeq9cwg01",
    },
  ];

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    alert("Payment link copied to clipboard!");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Payment QR Codes</h1>

      <Tabs defaultValue="cash" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          {paymentQRs.map((qr) => (
            <TabsTrigger key={qr.id} value={qr.id}>
              {qr.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {paymentQRs.map((qr) => (
          <TabsContent key={qr.id} value={qr.id}>
            <Card>
              <CardHeader>
                <CardTitle className="text-center whitespace-nowrap">
                  {qr.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4">
                <img
                  src={qr.imageUrl}
                  alt={`${qr.title} QR`}
                  className="w-48 h-48 sm:w-64 sm:h-64 md:w-72 md:h-72 object-contain"
                />
                <Button
                  onClick={() => handleCopyLink(qr.paymentLink)}
                  className="bg-blue-900 hover:bg-blue-800 text-white px-6 py-2 rounded-md"
                >
                  Copy Payment Link
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
