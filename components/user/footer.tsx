import Link from "next/link";
import {
  Instagram,
  Facebook,
  Twitter,
  MapPin,
  Phone,
  Mail,
  Wrench,
  Sparkles,
  DollarSign,
  Calendar,
  Truck,
} from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#2c3e50] text-gray-300">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                <Image
                  src="/thelaunchpad.png"
                  alt="The Launch Pad Logo"
                  width={45}
                  height={45}
                  className="object-contain"
                />
              </div>
              <h3 className="text-xl font-semibold text-white">
                The Launch Pad
              </h3>
            </div>
            <p className="text-sm leading-relaxed">
              Houston's premier car care destination featuring self-service
              bays, professional detailing, and our famous handwash special,
              plus amazing food trucks!
            </p>
            <div className="flex gap-4 pt-2">
              <Link
                href="https://instagram.com/thelaunchpadhtx"
                target="_blank"
                rel="noopener"
                aria-label="Instagram"
                className="hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </Link>
              <Link
                href="https://www.facebook.com/profile.php?id=61566883617151"
                target="_blank"
                rel="noopener"
                aria-label="Facebook"
                className="hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </Link>
              <Link
                href="https://tiktok.com/@thelaunchpadhtx%3Flang%3Den"
                target="_blank"
                rel="noopener"
                aria-label="Tiktok"
                className="hover:text-white transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-6 h-6"
                >
                  <path d="M12 3v12a3 3 0 1 1-3-3" />
                  <path d="M12 3a5 5 0 0 0 5 5h1.5" />
                </svg>
              </Link>
              {/* <Link href="#" className="hover:text-white transition-colors">
                <!-- tiktok-monochrome.svg -->
<svg xmlns="http://www.w3.org/2000/

              </Link> */}
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">
              Quick Links
            </h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="hover:text-white transition-colors text-sm"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-white transition-colors text-sm"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="hover:text-white transition-colors text-sm"
                >
                  how-it-works
                </Link>
              </li>
              <li>
                <Link
                  href="/blog"
                  className="hover:text-white transition-colors text-sm"
                >
                  Blogs
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="hover:text-white transition-colors text-sm"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-white transition-colors text-sm"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/reviews"
                  className="hover:text-white transition-colors text-sm"
                >
                  Reviews
                </Link>
              </li>
            </ul>
          </div>

          {/* Services Column */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">
              Our Services
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-sm">
                <Wrench className="w-4 h-4" />
                Self-Service Car Wash
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />
                Professional Express Detailing
              </li>
              {/* <li className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" />
                $10 Handwash Special
              </li> */}
              <li className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                Monthly Memberships
              </li>
              {/* <li className="flex items-center gap-2 text-sm">
                <Truck className="w-4 h-4" />
                Food Truck Park
              </li> */}
            </ul>
          </div>

          {/* Contact Column */}
          <div>
            <h4 className="text-white font-semibold text-lg mb-4">
              Contact Us
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>10410 Main St, Houston, TX, United States, Texas</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>(832) 219-8320</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span>thelaunchpadht@gmail.com</span>
              </li>
            </ul>
            <div className="mt-6 pt-4 border-t border-gray-600">
              {/* <p className="text-white font-semibold text-sm mb-1">
                $10 Handwash Special
              </p> */}
              <p className="text-xs text-gray-400">
                Monday - Friday 10am - 6pm only
              </p>
              <p className="text-xs text-gray-400">
                Sedans, Suvs, Trucks (larger vehicles may vary)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-center items-center gap-4 text-sm text-gray-400">
            <div className="flex gap-6">
              <Link
                href="/terms"
                className="hover:text-white transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/cookies"
                className="hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-4">
            © 2025 The Launch Pad. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
