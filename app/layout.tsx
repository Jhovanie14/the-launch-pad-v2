import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import BookingProvider from "@/context/bookingContext";
import BookingModal from "@/components/bookingModal";
import { AuthContextProvider } from "@/context/auth-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Launch Pad",
  description: "Houston's Premier Car Care & Food Hub",
  openGraph: {
    title: "The Launch Pad | Houston's Premier Car Care & Food Hub",
    description:
      "Visit The Launch Pad for top-tier car wash, detailing, and an amazing food experience — all in one destination.",
    url: "https://www.thelaunchpadwash.com",
    siteName: "The Launch Pad",
    images: [
      {
        url: "https://www.thelaunchpadwash.com/og-image.jpg", // 👈 replace with your actual OG image
        width: 1200,
        height: 630,
        alt: "The Launch Pad Car Care & Food Hub",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Launch Pad | Houston's Premier Car Care & Food Hub",
    description: "Premium car wash & food experience — The Launch Pad Houston.",
    images: ["https://www.thelaunchpadwash.com/og-image.jpg"], // same as above
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthContextProvider>
          <BookingProvider>
            {children}
            <BookingModal />
          </BookingProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
