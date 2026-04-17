// ============================================
// 1. ROOT LAYOUT (app/layout.tsx)
// ============================================
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import BookingProvider from "@/context/bookingContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import BookingModal from "@/components/bookingModal";
import { AuthContextProvider } from "@/context/auth-context";
import ServiceWorkerRegister from "@/components/service-worker-register";

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
    "The Launch Pad in Houston offers 24/7 self-service car wash bays, professional express detailing, and monthly memberships at 10410 S Main St. Book online in minutes.",
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
      "24/7 self-service car wash bays, professional express detailing, and monthly memberships. Visit us at 10410 S Main St, Houston. Book online today!",
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
      "24/7 self-service car wash bays, professional express detailing, and monthly memberships at 10410 S Main St, Houston.",
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
    google: "RY2XAgFNEaUWZvAKmuyBUHHvr9JpYYf-8nbw-I8-tzA", // Add your Google Search Console verification code
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
        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1525799285811252');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img height="1" width="1" style={{display:"none"}}
            src="https://www.facebook.com/tr?id=1525799285811252&ev=PageView&noscript=1"
          />
        </noscript>

        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N38CCY2FTY"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-N38CCY2FTY');
          `}
        </Script>
        {/* <SnowEffect /> */}
        <AuthContextProvider>
          <BookingProvider>
            <TooltipProvider>
              <ServiceWorkerRegister />
              {children}
              <BookingModal />
            </TooltipProvider>
          </BookingProvider>
        </AuthContextProvider>
      </body>
    </html>
  );
}
