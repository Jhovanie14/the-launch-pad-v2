"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Sheet, SheetHeader, SheetTitle, SheetContent } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BellPlus,
  CalendarPlus,
  ChevronDown,
  CircleQuestionMark,
  Home,
  LogOut,
  NotebookPen,
  Phone,
  User,
  Users,
  Menu,
  ShowerHead,
  Car,
  ShoppingBasket,
} from "lucide-react";
import LoadingDots from "@/components/loading";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/bookingContext";
import { useProductCart } from "@/context/product-cart-context";
import { isNavActive } from "@/lib/navigation/isNavActive";
import { cn } from "@/lib/utils";
import { AccountAvatar } from "@/components/user/AccountAvatar";

const FOCUS_ON_NIGHT = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

const PRIMARY_LINKS = [
  { name: "Services", href: "/services" },
  { name: "Membership", href: "/pricing" },
  { name: "Self-service", href: "/self-service" },
  { name: "Products", href: "/products" },
];

const MORE_LINKS = [
  { name: "About us", href: "/about", description: "Who we are and the wash on S Main St" },
  { name: "FAQ", href: "/faq", description: "Answers about bays, booking and memberships" },
  { name: "Blog", href: "/blog", description: "Car care tips and news from The Launch Pad" },
  { name: "Contact", href: "/contact", description: "Call, email or send us a message" },
];

const ACCOUNT_LINKS = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Bookings", href: "/dashboard/bookings" },
  { name: "Billing", href: "/dashboard/billing" },
  { name: "Profile and settings", href: "/dashboard/settings" },
];

const PILL = "inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none";
const pillState = (active: boolean) =>
  active ? "bg-white/12 text-on-night" : "text-on-night-muted hover:bg-white/8 hover:text-on-night";

/**
 * The public pages' bar: the dashboard bar's sibling (navy, logo, quiet
 * links, a quiet "Book"), and it knows who is signed in. The phone menu
 * (the sheet below) is redesigned separately.
 */
export function UserNavbar() {
  const { openBookingModal } = useBooking();
  const { count: cartCount } = useProductCart();
  const { user, userProfile, isLoading, signOut } = useAuth();
  const pathname = usePathname() ?? "";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // The phone sheet renders only after mount (it used to cause a hydration mismatch).
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const name = userProfile?.full_name || userProfile?.email || "Your account";
  const initial = (userProfile?.full_name || userProfile?.email || "?").charAt(0).toUpperCase();
  const moreActive = MORE_LINKS.some((l) => isNavActive(pathname, l.href));

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <>
      {signingOut && <LoadingDots />}
      <header className="sticky top-0 z-50 bg-night text-on-night shadow-[0_8px_24px_-16px_oklch(0.2_0.07_262/0.8)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" className={cn("flex shrink-0 items-center gap-2 rounded-lg", FOCUS_ON_NIGHT)}>
            <Image src="/thelaunchpad.png" alt="The Launch Pad" width={40} height={40} className="size-10 object-contain" priority />
            <span aria-hidden className="hidden text-sm font-black tracking-tight xl:inline">
              THE LAUNCH PAD
            </span>
          </Link>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_LINKS.map((link) => {
                const active = isNavActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(PILL, pillState(active), FOCUS_ON_NIGHT)}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
              <li>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className={cn(PILL, pillState(moreActive), FOCUS_ON_NIGHT)}>
                      More <ChevronDown aria-hidden className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-80 p-1.5">
                    {MORE_LINKS.map((link) => (
                      <DropdownMenuItem key={link.href} asChild className="flex-col items-start gap-0.5 px-3 py-2.5">
                        <Link href={link.href} aria-current={isNavActive(pathname, link.href) ? "page" : undefined}>
                          <span className="text-sm font-semibold text-ink">{link.name}</span>
                          <span className="text-sm text-ink-muted">{link.description}</span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {cartCount > 0 && (
              <Link
                href="/products/cart"
                aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`}
                className={cn("relative hidden size-10 items-center justify-center rounded-lg hover:bg-white/10 lg:inline-flex", FOCUS_ON_NIGHT)}
              >
                <ShoppingBasket aria-hidden className="size-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-flame px-1 text-xs font-black text-on-flame">
                  {cartCount}
                </span>
              </Link>
            )}

            <button
              type="button"
              onClick={openBookingModal}
              className={cn(
                "hidden min-h-10 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-bold text-on-night transition-colors hover:bg-white/10 motion-reduce:transition-none lg:inline-flex",
                FOCUS_ON_NIGHT
              )}
            >
              <CalendarPlus aria-hidden className="size-4" /> Book
            </button>

            {/* Nothing while sign-in loads, so there is no flash of "Sign in". */}
            {!isLoading && !user && (
              <Link
                href="/login"
                className={cn("hidden min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-on-night-muted hover:bg-white/10 hover:text-on-night lg:inline-flex", FOCUS_ON_NIGHT)}
              >
                Sign in
              </Link>
            )}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Account menu for ${name}`}
                    className={cn("hidden rounded-full lg:inline-flex", FOCUS_ON_NIGHT)}
                  >
                    <AccountAvatar src={userProfile?.avatar_url} initial={initial} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block truncate font-semibold text-ink">{userProfile?.full_name || "Your account"}</span>
                    {userProfile?.email && <span className="block truncate text-xs text-ink-muted">{userProfile.email}</span>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    {ACCOUNT_LINKS.map((link) => (
                      <DropdownMenuItem key={link.href} asChild>
                        <Link href={link.href}>{link.name}</Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <LogOut aria-hidden className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={cn("inline-flex size-11 items-center justify-center rounded-lg border border-white/25 hover:bg-white/10 lg:hidden", FOCUS_ON_NIGHT)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu aria-hidden className="size-6" />
            </button>
          </div>
        </div>
      </header>

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

              <Link
                href="/products"
                className="flex items-center space-x-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <ShoppingBasket className="w-4 h-4" />
                <span>Products</span>
              </Link>

              {/* --- ABOUT DROPDOWN --- */}
              <div className="pt-2 border-t">
                <button
                  className="flex items-center justify-between w-full py-2 text-lg font-medium hover:text-gray-700 dark:hover:text-gray-100"
                  onClick={() => setIsAboutDropdownOpen(!isAboutDropdownOpen)}
                >
                  <span>About Launch Pad</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isAboutDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </button>

                <div
                  className={`ml-4 overflow-hidden space-y-2 transition-all ${isAboutDropdownOpen ? "max-h-screen mt-2" : "max-h-0"
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

              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="tel:8322198320" className="flex items-center space-x-4 text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 transition-colors active:scale-95">
                    <Phone className="w-5 h-5" />
                    <span className="font-medium group-hover:underline transition-colors hover:text-blue-900">
                      Tap to Call: (832) 219-8320
                    </span>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click here to call immediately!</p>
                </TooltipContent>
              </Tooltip>
             
          </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
