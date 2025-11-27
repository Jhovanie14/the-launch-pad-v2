// ============================================
// 1. ROOT LAYOUT (app/layout.tsx)
// ============================================
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
  title: {
    default: "The Launch Pad | Car Wash & Express Detailing in Houston, TX",
    template: "%s | The Launch Pad",
  },
  description:
    "The Launch Pad in Houston offers 24/7 self-service car wash bays, professional express detailing, and monthly memberships at 10410 South Main St. Book online in minutes.",
  keywords: [
    "car wash Houston",
    "express detailing Houston",
    "self-service car wash",
    "car detailing Houston TX",
    "24/7 car wash",
    "car wash Main Street Houston",
    "auto detailing Houston",
    "car wash membership Houston",
  ],
  authors: [{ name: "The Launch Pad" }],
  creator: "The Launch Pad",
  publisher: "The Launch Pad",
  metadataBase: new URL("https://www.thelaunchpadwash.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "The Launch Pad | Car Wash & Express Detailing in Houston, TX",
    description:
      "24/7 self-service car wash bays, professional express detailing, and monthly memberships. Visit us at 10410 South Main St, Houston. Book online today!",
    url: "https://www.thelaunchpadwash.com",
    siteName: "The Launch Pad",
    images: [
      {
        url: "/thelaunchpad.png",
        width: 1200,
        height: 630,
        alt: "The Launch Pad Car Wash and Detailing - Houston TX",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Launch Pad | Car Wash & Express Detailing in Houston, TX",
    description:
      "24/7 self-service car wash bays, professional express detailing, and monthly memberships at 10410 South Main St, Houston.",
    images: ["/thelaunchpad.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification code
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
