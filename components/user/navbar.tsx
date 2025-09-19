"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  CircleQuestionMark,
  NotebookPen,
  Phone,
  User,
  Users,
} from "lucide-react";
import { useBooking } from "@/context/bookingContext";

// import { signOut } from '@/lib/auth/actions'
// import { AuthUser } from '@/types'

const services: {
  title: string;
  href: string;
  description: string;
  icon?: React.ComponentType<any>;
}[] = [
  {
    icon: User,
    title: "What is The Launch Pad",
    href: "/launchpad",
    description:
      "Our signature premium wash with ceramic coating protection and interior detailing.",
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
  {
    icon: CircleQuestionMark,
    title: "FAQ",
    href: "/services/paint-correction",
    description:
      "Professional paint restoration to remove swirls, scratches, and oxidation.",
  },
  //   {
  //     title: "Interior Detailing",
  //     href: "/services/interior-detail",
  //     description:
  //       "Deep cleaning and protection for leather, fabric, and all interior surfaces.",
  //   },
];

function ListItem({
  title,
  children,
  href,
  icon,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & {
  href: string;
  icon?: React.ComponentType<any>;
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

// interface UserNavbarProps {
//   user: AuthUser
// }

export function UserNavbar() {
  const {openBookingModal} = useBooking()
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="bg-white shadow-sm dark:bg-gray-800">
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
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavigationMenu className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100">
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>
                      About Launch Pad
                    </NavigationMenuTrigger>
                    <NavigationMenuContent className="">
                      <ul className="grid w-[500px] gap-2 md:w-[600px] md:grid-cols-2 lg:w-[700px]">
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
                href="/dashboard"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Products
              </Link>
              <Link
                href="/dashboard/projects"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Subscription
              </Link>
              {/* <Link
                href="/dashboard/settings"
                className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Settings
              </Link> */}
            </div>
          </div>
          {/* <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="relative ml-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {user.full_name || user.email}
                </span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar_url || ''} alt={user.full_name || 'User'} />
                  <AvatarFallback>
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <form action={signOut}>
                  <Button variant="outline" size="sm" type="submit">
                    Sign Out
                  </Button>
                </form>
              </div>
            </div>
          </div> */}
          <div className="hidden md:flex flex-shrink-0 items-center gap-1">
            <Button
              size="sm"
              onClick={openBookingModal}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide"
            >
              {/* onClick={openBookingModal} */}
              Book Online
            </Button>
            <Link href="/login">
              <Button
                size="sm"
                variant="ghost"
                className="hover:text-blue-800 font-semibold transition-all duration-200 uppercase tracking-wide"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Login</span>
              </Button>
            </Link>
            {/* Mobile Menu Button */}

            {/* onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} */}
          </div>
          <div className="-mr-2 flex items-center sm:hidden gap-1">
            <button className="inline-flex bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-md transition-all duration-200 shadow-md hover:shadow-lg uppercase tracking-wide">
              {/* onClick={openBookingModal} */}
              Book Online
            </button>
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
              Login
            </Link>
            <Link
              href="/dashboard/projects"
              className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            >
              Products
            </Link>
            <Link
              href="/dashboard/settings"
              className="block border-l-4 border-transparent py-2 pl-3 pr-4 text-base font-medium text-gray-500 hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            >
              Subscription
            </Link>
          </div>
          {/* <div className="border-t border-gray-200 pb-3 pt-4 dark:border-gray-700">
            <div className="flex items-center px-4">
              <div className="flex-shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url || ''} alt={user.full_name || 'User'} />
                  <AvatarFallback>
                    {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800 dark:text-gray-200">
                  {user.full_name || user.email}
                </div>
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {user.email}
                </div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit" className="w-full">
                  Sign Out
                </Button>
              </form>
            </div>
          </div> */}
        </div>
      )}
    </nav>
  );
}
