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
  icons: {
    icon: [{ url: "/thelaunchpad.png", sizes: "32x32", type: "image/png" }],
    shortcut: "/favicon.ico",
    apple: "/launch-pad-icon.png",
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
