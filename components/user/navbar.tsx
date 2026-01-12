"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  BellPlus,
  ChevronDown,
  CircleQuestionMark,
  Home,
  NotebookPen,
  Phone,
  User,
  Users,
  Menu,
  X,
  ShowerHead,
  Car,
} from "lucide-react";
import { useBooking } from "@/context/bookingContext";
// import { ThemeToggle } from "../theme-toggle";

const services: {
  title: string;
  href: string;
  description: string;
  icon?: React.ComponentType<any>;
}[] = [
  {
    icon: CircleQuestionMark,
    title: "FAQ",
    href: "/faq",
    description:
      "Got question? Our FAQs has answers to make your Launch Pad experience smooth and easy.",
  },
  {
    icon: NotebookPen,
    title: "Blog",
    href: "/blog",
    description:
      "Quick and efficient exterior wash perfect for busy schedules.",
  },
  {
    icon: Phone,
    title: "Contact Us",
    href: "/contact",
    description: "We provide exceptional customer service.",
  },
  {
    icon: Users,
    title: "About Us",
    href: "/about",
    description: "Learn more about the team of the launch pad.",
  },
];

function ListItem({
  title,
  children,
  href,
  icon,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className="flex flex-row items-center space-x-3 p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {icon &&
            React.createElement(icon, { className: "w-4 h-4 flex-shrink-0" })}
          <div className="flex-1 space-y-2">
            <div className="text-lg leading-none font-medium">{title}</div>
            <p className="text-accent-foreground line-clamp-2 text-sm leading-snug">
              {children}
            </p>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}

export function UserNavbar() {
  const { openBookingModal } = useBooking();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 w-full z-50 transition-all duration-300 ${
        isMounted && isScrolled
          ? "bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm dark:bg-gray-900/95"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-11/12 px-4 sm:px-6 lg:px-8">
        <div className="flex h-32 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center">
              <Link href="/">
                <div className="flex items-center">
                  <Image
                    src="/thelaunchpad.png"
                    alt="The Launch Pad"
                    width={250}
                    height={250}
                    className="h-20 w-20 sm:h-28 sm:w-28 object-contain"
                  />
                  <div className="hidden md:flex flex-col">
                    <span className="text-xl sm:text-xl font-bold text-foreground tracking-tight">
                      THE LAUNCH PAD
                    </span>
                    <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                      Premium Car Care
                    </span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="hidden xl:flex lg:gap-4">
              <NavigationMenu className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-lg font-medium text-accent-foreground hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      <span className="text-lg font-medium text-accent-foreground hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                        About Launch Pad
                      </span>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[500px] gap-2 md:w-[600px] md:grid-cols-2 lg:w-[700px] p-4">
                        {services.map((service) => (
                          <ListItem
                            icon={service.icon}
                            key={service.title}
                            title={service.title}
                            href={service.href}
                          >
                            {service.description}
                          </ListItem>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
              {/* <Link
                href="/products"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Products
              </Link> */}
              <Link
                href="/pricing"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-lg font-medium text-accent-foreground hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Subscription
              </Link>
              <Link
                href="/self-service"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-lg font-medium text-accent-foreground hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Self-service
              </Link>
              <Link
                href="/services"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-lg font-medium text-accent-foreground hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Services
              </Link>
            </div>
          </div>
          <div className="hidden lg:flex flex-shrink-0 items-center gap-1">
            <Button
              size="sm"
              onClick={openBookingModal}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide"
            >
              Book Online
            </Button>
            <Link href="/login">
              <Button
                size="sm"
                variant="ghost"
                className="hover:text-blue-800 font-semibold transition-all duration-200 uppercase tracking-wide"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline ml-2 font-medium text-lg">
                  Login
                </span>
              </Button>
            </Link>
            {/* <ThemeToggle /> */}
          </div>
          <div className="-mr-2 flex items-center lg:hidden gap-1">
            {/* <Button
              size="lg"
              onClick={openBookingModal}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide"
            >
              Book Online
            </Button> */}
            <button
              className="p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="h-8 w-8" />
              ) : (
                <Menu className="h-8 w-8" />
              )}
            </button>

            {/* <ThemeToggle /> */}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMounted && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          {/* --- Sheet Content (Mobile Menu) --- */}
          <SheetContent side="right" className="w-[300px] p-4">
            <SheetHeader>
              <SheetTitle className="flex items-center text-xl font-semibold gap-3">
                <Image width={50} height={50} alt="the-launch-pad-logo" src={"/thelaunchpad.png"} /> The Launch Pad
              </SheetTitle>
              {/* <SheetDescription>Navigate through the website</SheetDescription> */}
            </SheetHeader>

            <div className="flex flex-col space-y-4">
              <Link
                href="/login"
                className="flex items-center space-x-2 text-lg py-2 border-b font-medium hover:text-gray-700 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </Link>

              <Link
                href="/"
                className="flex items-center space-x-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                href="/pricing"
                className="flex items-center space-x-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BellPlus className="w-4 h-4" />
                <span>Subscription</span>
              </Link>

              <Link
                href="/self-service"
                className="flex items-center space-x-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShowerHead className="w-4 h-4" />
                <span>Self-service</span>
              </Link>

              <Link
                href="/services"
                className="flex items-center space-x-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Car className="w-4 h-4" />
                <span>Services</span>
              </Link>

              {/* --- ABOUT DROPDOWN --- */}
              <div className="pt-2 border-t">
                <button
                  className="flex items-center justify-between w-full py-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                  onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
                >
                  <span>About Launch Pad</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${
                      isAboutDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`ml-4 overflow-hidden space-y-2 transition-all ${
                    isAboutDropdownOpen ? "max-h-screen mt-2" : "max-h-0"
                  }`}
                >
                  <Link
                    href="/blog"
                    className="flex items-center space-x-2 py-2 text-lg hover:text-gray-700 dark:hover:text-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAboutDropdownOpen(false);
                    }}
                  >
                    <NotebookPen className="w-4 h-4" />
                    <span>Blog</span>
                  </Link>

                  <Link
                    href="/contact"
                    className="flex items-center space-x-2 py-2 text-lg hover:text-gray-700 dark:hover:text-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAboutDropdownOpen(false);
                    }}
                  >
                    <Phone className="w-4 h-4" />
                    <span>Contact</span>
                  </Link>

                  <Link
                    href="/about"
                    className="flex items-center space-x-2 py-2 text-lg hover:text-gray-700 dark:hover:text-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAboutDropdownOpen(false);
                    }}
                  >
                    <Users className="w-4 h-4" />
                    <span>About Us</span>
                  </Link>

                  <Link
                    href="/faq"
                    className="flex items-center space-x-2 py-2 text-lg hover:text-gray-700 dark:hover:text-gray-100"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAboutDropdownOpen(false);
                    }}
                  >
                    <CircleQuestionMark className="w-4 h-4" />
                    <span>FAQ</span>
                  </Link>
                </div>
              </div>

              {/* --- BOOKING BUTTON --- */}
              <Button
                size="sm"
                onClick={() => {
                  openBookingModal();
                  setIsMobileMenuOpen(false);
                }}
                className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 rounded-md shadow-md hover:shadow-lg uppercase tracking-wide"
              >
                Book Online
              </Button>

              <div className="flex items-center space-x-3 text-muted-foreground">
                <Phone className="w-4 h-4 text-blue-900" />
                <p>or call (832) 219-8320</p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </nav>
  );
}
