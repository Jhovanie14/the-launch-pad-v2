"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AuthUser } from "@/types";
import {
  Settings,
  LogOut,
  Home,
  X,
  Calendar,
  CreditCard,
  Car,
  Truck,
  Notebook,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
// import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";

interface AdminSidebarProps {
  user?: AuthUser;
}

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Home },
  // { name: "Users", href: "/admin/users", icon: Users },
  { name: "Bookings", href: "/admin/booking", icon: Calendar },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Services", href: "/admin/services", icon: Car },
  { name: "Add-ons", href: "/admin/addons", icon: Truck },
  { name: "Blog", href: "/admin/blog", icon: Notebook },
  { name: "Contact", href: "/admin/contact", icon: MessageCircle },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

const restrictedForModerators = [
  "/admin/addons",
  "/admin/subscriptions",
  "/admin/services",
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const supabase = createClient();

    const fetchContacts = async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "new"); // only count new/unreplied contacts

      if (!error && typeof count === "number") {
        setUnreadCount(count);
      }
    };

    fetchContacts();

    // Optional: listen for live changes (realtime)
    const channel = supabase
      .channel("contacts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts" },
        () => fetchContacts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredNav =
    user?.role === "moderator"
      ? navigation.filter(
          (item) => !restrictedForModerators.includes(item.href)
        )
      : navigation;

  return (
    <div
      className={`${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
    >
      <div className="flex items-center justify-center h-32 px-6 border-b border-sidebar-border">
        <Link href="/">
          <div className="flex flex-col items-center space-x-3">
            <Image
              src="/thelaunchpad.png"
              alt="The Launch Pad"
              width={48}
              height={48}
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
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

        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="mt-6 px-3">
        {filteredNav.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-900 text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              {/* ICON + BADGE WRAPPER */}
              <div className="relative mr-3 flex items-center justify-center">
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {item.name === "Contact" && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>

              {/* LABEL */}
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
      <div className="flex-1"></div>

      {user && (
        <div className="flex flex-shrink-0 border-t border-gray-400 p-4 space-x-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user.avatar_url || undefined}
                  alt={user.full_name || "Admin"}
                />
                <AvatarFallback>
                  {user.full_name?.charAt(0) ||
                    user.email.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">
                {user.full_name || user.email}
              </p>
              <p className="text-xs text-gray-400">
                {user.role === "admin" ? "Administrator" : "Moderator"}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <form action={signOut}>
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="text-gray-400 hover hover:border-indigo-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
