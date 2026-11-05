"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { CalendarPlus, LogOut, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/bookingContext";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import LoadingDots from "../loading";
import { cn } from "@/lib/utils";

/** Where a customer goes: their day-to-day pages. */
const PRIMARY_LINKS = [
  { name: "Home", href: "/dashboard" },
  { name: "Bookings", href: "/dashboard/bookings" },
  { name: "Self-service", href: "/dashboard/self-service-log" },
  { name: "Orders", href: "/dashboard/orders" },
  { name: "Membership", href: "/dashboard/pricing" },
] as const;

/** Their account: occasional pages, kept behind the avatar. */
const ACCOUNT_LINKS = [
  { name: "Profile and settings", href: "/dashboard/settings" },
  { name: "Billing", href: "/dashboard/billing" },
  { name: "Help and support", href: "/dashboard/help" },
] as const;

const FOCUS_ON_NIGHT = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The customer area's bar: navy from the logo, the logo itself, the five
 * pages people use, and "Book" always in reach. The account pages sit behind
 * the avatar. On phones the links move into a side sheet; the home page has
 * its own thumb dock, so the bar drops its Book button there.
 */
export function AuthNavbar() {
  const { signOut, userProfile } = useAuth();
  const { openBookingModal } = useBooking();
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const name = userProfile?.full_name || userProfile?.email || "Your account";
  const initial = (userProfile?.full_name || userProfile?.email || "?").charAt(0).toUpperCase();
  const onHome = pathname === "/dashboard";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  function book() {
    setMenuOpen(false);
    openBookingModal();
  }

  return (
    <>
      {signingOut && <LoadingDots />}
      <a
        href="#main"
        className="sr-only rounded-lg bg-flame px-4 py-2 font-bold text-on-flame focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-50 bg-night text-on-night shadow-[0_8px_24px_-16px_oklch(0.2_0.07_262/0.8)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className={cn("flex shrink-0 items-center gap-2 rounded-lg", FOCUS_ON_NIGHT)}>
            <Image src="/thelaunchpad.png" alt="The Launch Pad" width={40} height={40} className="size-10 object-contain" priority />
            <span aria-hidden className="hidden text-sm font-black tracking-tight xl:inline">
              THE LAUNCH PAD
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {PRIMARY_LINKS.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold transition-colors",
                        active ? "bg-white/12 text-on-night" : "text-on-night-muted hover:bg-white/8 hover:text-on-night",
                        FOCUS_ON_NIGHT,
                      )}
                    >
                      {link.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={openBookingModal}
              className={cn(
                "min-h-10 items-center gap-2 rounded-lg border border-white/25 px-4 text-sm font-bold text-on-night transition-colors hover:bg-white/10",
                onHome ? "hidden md:inline-flex" : "inline-flex",
                FOCUS_ON_NIGHT,
              )}
            >
              <CalendarPlus aria-hidden className="size-4" /> Book
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Account menu for ${name}`}
                  className={cn("hidden rounded-full md:inline-flex", FOCUS_ON_NIGHT)}
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

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className={cn("inline-flex size-11 items-center justify-center rounded-lg hover:bg-white/10 md:hidden", FOCUS_ON_NIGHT)}
                >
                  <Menu aria-hidden className="size-6" />
                </button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[85vw] max-w-sm gap-0 border-l-0 bg-night p-0 text-on-night [&>button]:text-on-night [&>button]:opacity-100"
              >
                <div className="flex items-center gap-3 border-b border-white/10 p-5 pr-12">
                  <AccountAvatar src={userProfile?.avatar_url} initial={initial} />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-base font-bold text-on-night">
                      {userProfile?.full_name || "Your account"}
                    </SheetTitle>
                    <SheetDescription className="truncate text-sm text-on-night-subtle">
                      {userProfile?.email ?? "Signed in"}
                    </SheetDescription>
                  </div>
                </div>

                <nav aria-label="Main" className="flex-1 overflow-y-auto p-3">
                  <button
                    type="button"
                    onClick={book}
                    className={cn(
                      "mb-3 flex min-h-12 w-full items-center gap-2 rounded-lg bg-flame px-4 font-bold text-on-flame hover:bg-flame-bright",
                      FOCUS_ON_NIGHT,
                    )}
                  >
                    <CalendarPlus aria-hidden className="size-5" /> Book a detail
                  </button>
                  <ul className="space-y-1">
                    {PRIMARY_LINKS.map((link) => (
                      <SheetLink key={link.href} {...link} active={isActive(pathname, link.href)} onNavigate={() => setMenuOpen(false)} />
                    ))}
                  </ul>
                  <h2 className="mt-5 mb-1 px-4 text-xs font-semibold text-on-night-subtle">Account</h2>
                  <ul className="space-y-1">
                    {ACCOUNT_LINKS.map((link) => (
                      <SheetLink key={link.href} {...link} active={isActive(pathname, link.href)} onNavigate={() => setMenuOpen(false)} />
                    ))}
                  </ul>
                </nav>

                <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className={cn(
                      "flex min-h-12 w-full items-center gap-2 rounded-lg px-4 font-semibold text-on-night-muted hover:bg-white/10 hover:text-on-night",
                      FOCUS_ON_NIGHT,
                    )}
                  >
                    <LogOut aria-hidden className="size-5" /> Sign out
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}

function SheetLink({
  name,
  href,
  active,
  onNavigate,
}: {
  name: string;
  href: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center rounded-lg px-4 font-semibold transition-colors",
          active ? "bg-white/12 text-on-night" : "text-on-night-muted hover:bg-white/8 hover:text-on-night",
          FOCUS_ON_NIGHT,
        )}
      >
        {name}
      </Link>
    </li>
  );
}

function AccountAvatar({ src, initial }: { src?: string | null; initial: string }) {
  return (
    <Avatar className="size-9 ring-2 ring-white/25">
      {src && <AvatarImage src={src} alt="" />}
      <AvatarFallback className="bg-dusk font-bold text-on-night">{initial}</AvatarFallback>
    </Avatar>
  );
}
