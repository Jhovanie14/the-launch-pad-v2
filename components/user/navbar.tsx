"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPlus, ChevronDown, LogIn, LogOut, Menu, Phone, ShoppingBasket } from "lucide-react";
import LoadingDots from "@/components/loading";
import { useAuth } from "@/context/auth-context";
import { useBooking } from "@/context/bookingContext";
import { useProductCart } from "@/context/product-cart-context";
import { isNavActive, showSignOutLoader } from "@/lib/navigation/isNavActive";
import { cn } from "@/lib/utils";
import { AccountAvatar } from "@/components/user/AccountAvatar";
import { SheetLink } from "@/components/user/SheetLink";
import { ACCOUNT_LINKS, MORE_LINKS, PRIMARY_LINKS, publicPhoneMenu } from "@/lib/navigation/publicPhoneMenu";

const FOCUS_ON_NIGHT = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-flame";

const PILL = "inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold transition-colors motion-reduce:transition-none";
const pillState = (active: boolean) =>
  active ? "bg-white/12 text-on-night" : "text-on-night-muted hover:bg-white/8 hover:text-on-night";

/**
 * The public pages' bar: the dashboard bar's sibling (navy, logo, quiet
 * links, a quiet "Book"), and it knows who is signed in. Below 1024px the
 * menu button opens the navy phone menu, the dashboard menu's sibling.
 */
export function UserNavbar() {
  const { openBookingModal } = useBooking();
  const { count: cartCount } = useProductCart();
  const { user, userProfile, isLoading, signOut } = useAuth();
  const pathname = usePathname() ?? "";
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // The phone sheet renders only after mount (it used to cause a hydration mismatch).
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const name = userProfile?.full_name || userProfile?.email || "Your account";
  const initial = (userProfile?.full_name || userProfile?.email || "?").charAt(0).toUpperCase();
  const moreActive = MORE_LINKS.some((l) => isNavActive(pathname, l.href));
  const menu = publicPhoneMenu({ signedIn: !!user, cartCount });
  const closeMenu = () => setIsMobileMenuOpen(false);

  function book() {
    closeMenu();
    openBookingModal();
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // The bar stays mounted on public pages: never leave the loader up.
      setSigningOut(false);
    }
  }

  return (
    <>
      {showSignOutLoader(signingOut, !!user) && <LoadingDots />}
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
              onClick={() => setIsMobileMenuOpen(true)}
              aria-expanded={isMobileMenuOpen}
              className={cn("inline-flex size-11 items-center justify-center rounded-lg border border-white/25 hover:bg-white/10 lg:hidden", FOCUS_ON_NIGHT)}
            >
              <span className="sr-only">Open main menu</span>
              <Menu aria-hidden className="size-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Phone menu: the dashboard menu's navy sibling. */}
      {isMounted && (
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-sm gap-0 border-l-0 bg-night p-0 text-on-night [&>button]:text-on-night [&>button]:opacity-100"
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-5 pr-12">
              {user ? (
                <>
                  <AccountAvatar src={userProfile?.avatar_url} initial={initial} />
                  <div className="min-w-0">
                    <SheetTitle className="truncate text-base font-bold text-on-night">
                      {userProfile?.full_name || "Your account"}
                    </SheetTitle>
                    <SheetDescription className="truncate text-sm text-on-night-subtle">
                      {userProfile?.email ?? "Signed in"}
                    </SheetDescription>
                  </div>
                </>
              ) : (
                <>
                  <Image src="/thelaunchpad.png" alt="" width={36} height={36} className="size-9 object-contain" />
                  <SheetTitle className="text-base font-bold text-on-night">The Launch Pad</SheetTitle>
                  <SheetDescription className="sr-only">Site menu</SheetDescription>
                </>
              )}
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
                {menu.primary.map((link) => (
                  <SheetLink key={link.href} {...link} active={isNavActive(pathname, link.href)} onNavigate={closeMenu} />
                ))}
              </ul>
              <h2 className="mt-5 mb-1 px-4 text-xs font-semibold text-on-night-subtle">More</h2>
              <ul className="space-y-1">
                {menu.more.map((link) => (
                  <SheetLink key={link.href} {...link} active={isNavActive(pathname, link.href)} onNavigate={closeMenu} />
                ))}
              </ul>
              {menu.account.length > 0 && (
                <>
                  <h2 className="mt-5 mb-1 px-4 text-xs font-semibold text-on-night-subtle">Account</h2>
                  <ul className="space-y-1">
                    {menu.account.map((link) => (
                      <SheetLink key={link.href} {...link} active={isNavActive(pathname, link.href)} onNavigate={closeMenu} />
                    ))}
                  </ul>
                </>
              )}
            </nav>

            <div className="space-y-1 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    handleSignOut();
                  }}
                  className={cn("flex min-h-12 w-full items-center gap-2 rounded-lg px-4 font-semibold text-on-night-muted hover:bg-white/10 hover:text-on-night", FOCUS_ON_NIGHT)}
                >
                  <LogOut aria-hidden className="size-5" /> Sign out
                </button>
              )}
              {!isLoading && !user && (
                <Link href="/login" onClick={closeMenu} className={cn("flex min-h-12 w-full items-center gap-2 rounded-lg px-4 font-semibold text-on-night-muted hover:bg-white/10 hover:text-on-night", FOCUS_ON_NIGHT)}>
                  <LogIn aria-hidden className="size-5" /> Sign in
                </Link>
              )}
              <a href="tel:+18322198320" className={cn("flex min-h-12 w-full items-center gap-2 rounded-lg px-4 font-semibold text-on-night-muted hover:bg-white/10 hover:text-on-night", FOCUS_ON_NIGHT)}>
                <Phone aria-hidden className="size-5" /> Call (832) 219-8320
              </a>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
