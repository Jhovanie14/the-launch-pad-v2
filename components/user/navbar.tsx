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
  BellPlus,
  ChevronDown,
  CircleQuestionMark,
  Home,
  NotebookPen,
  Phone,
  ShoppingBag,
  User,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useBooking } from "@/context/bookingContext";
import { ThemeToggle } from "../theme-toggle";

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
    title: "Contact",
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
          className="flex flex-row items-center space-x-3 p-3 rounded-md hover:bg-accent hover:text-gray-500 transition-colors"
        >
          {icon &&
            React.createElement(icon, { className: "w-4 h-4 flex-shrink-0" })}
          <div className="flex-1 space-y-2">
            <div className="text-sm leading-none font-medium">{title}</div>
            <p className="text-muted-foreground line-clamp-2 text-sm leading-snug">
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex flex-shrink-0 items-center">
              <Link href="/">
                <div className="flex items-center space-x-3">
                  <Image
                    src="/thelaunchpad.png"
                    alt="The Launch Pad"
                    width={48}
                    height={48}
                    className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
                  />
                  <div className="hidden md:flex flex-col">
                    <span className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                      THE LAUNCH PAD
                    </span>
                    <span className="text-xs text-blue-600 font-medium uppercase tracking-wider">
                      Premium Car Care
                    </span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-6">
              <NavigationMenu className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      About Launch Pad
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
              <Link
                href="/products"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Products
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Subscription
              </Link>
            </div>
          </div>
          <div className="hidden sm:flex flex-shrink-0 items-center gap-1">
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
                <span className="hidden md:inline ml-2">Login</span>
              </Button>
            </Link>
            <ThemeToggle />
          </div>
          <div className="-mr-2 flex items-center sm:hidden gap-1">
            <Button
              size="sm"
              onClick={openBookingModal}
              className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-4 rounded-md transition-all duration-200 shadow-md hover:shadow-lg text-xs"
            >
              Book
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMounted && (
        <div
          className={`sm:hidden transition-all duration-300 ease-in-out overflow-hidden ${
            isMobileMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="bg-white dark:bg-gray-900 border-t dark:border-gray-800">
            <div className="flex flex-col p-4 space-y-4">
              <Link
                href="/login"
                className="flex items-center space-x-2 py-2 border-b font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <User className="w-4 h-4" />
                <span>Login</span>
              </Link>

              <Link
                href="/"
                className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </Link>

              <Link
                href="/products"
                className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Products</span>
              </Link>

              <Link
                href="/pricing"
                className="flex items-center space-x-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <BellPlus className="w-4 h-4" />
                <span>Subscription</span>
              </Link>

              <div className="border-b pb-4">
                <button
                  className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                  onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
                >
                  <span>About Launch Pad</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isAboutDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`ml-4 space-y-2 transition-all duration-300 overflow-hidden ${
                    isAboutDropdownOpen
                      ? "mt-2 max-h-screen opacity-100"
                      : "max-h-0 opacity-0"
                  }`}
                >
                  <Link
                    href="/blog"
                    className="flex items-center space-x-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
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
                    className="flex items-center space-x-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
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
                    className="flex items-center space-x-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
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
                    className="flex items-center space-x-2 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
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
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
