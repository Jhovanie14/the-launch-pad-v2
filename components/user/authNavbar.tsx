"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthUser } from "@/types";
import { useAuth } from "@/context/auth-context";
import {
  DropdownMenu,
  DropdownMenuShortcut,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { ThemeToggle } from "../theme-toggle";

export interface UserNavbarProps {
  user: AuthUser;
}

export function AuthNavbar() {
  const { signOut, user, userProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm dark:bg-gray-800">
      <>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/bookings"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Bookings
                </Link>
                <Link
                  href="/dashboard/pricing"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  Subscription
                </Link>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="border border-blue-800 h-8 w-8">
                    <AvatarImage
                      src={userProfile?.avatar_url || ""}
                      alt={userProfile?.full_name || "User"}
                    />
                    <AvatarFallback>
                      {userProfile?.full_name?.charAt(0) ||
                        userProfile?.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start">
                  <DropdownMenuLabel className="cursor-pointer">
                    <div className="relative ">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={userProfile?.avatar_url || ""}
                            alt={userProfile?.full_name || "User"}
                          />
                          <AvatarFallback>
                            {userProfile?.full_name?.charAt(0) ||
                              userProfile?.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {userProfile?.full_name || userProfile?.email}
                        </span>
                        <ThemeToggle />
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link className="w-full" href="/dashboard/settings">
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link className="w-full" href="/dashboard/billing">
                        Billing
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    Sign Out
                    <DropdownMenuShortcut>Q</DropdownMenuShortcut>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="-mr-2 flex items-center sm:hidden gap-1">
              {/* <button className="inline-flex bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide">
            
              Book Online
            </button> */}
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 dark:hover:bg-gray-700"
                onClick={() => setIsOpen(!isOpen)}
              >
                <span className="sr-only">Open main menu</span>
                <svg
                  className={`${isOpen ? "hidden" : "block"} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <svg
                  className={`${isOpen ? "block" : "hidden"} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isOpen && (
          <div className="sm:hidden">
            <div className="space-y-1 pb-3 pt-2">
              <Link
                href="/dashboard"
                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/bookings"
                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                Bookings
              </Link>
              <Link
                href="/dashboard/subscription"
                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                Subscription
              </Link>
              <Link
                href="/dashboard/billing"
                className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              >
                Billing
              </Link>
            </div>
            <div className="border-t border-gray-200 pb-3 pt-4 dark:border-gray-700">
              <div className="flex items-center px-4">
                <div className="flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={userProfile?.avatar_url || ""}
                      alt={userProfile?.full_name || "User"}
                    />
                    <AvatarFallback>
                      {userProfile?.full_name?.charAt(0) ||
                        userProfile?.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                    {userProfile?.full_name || userProfile?.email}
                  </div>
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {userProfile?.email}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <form action={signOut}>
                  <Button
                    variant="outline"
                    size="sm"
                    type="submit"
                    className="w-full"
                  >
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </>
    </nav>
  );
}
