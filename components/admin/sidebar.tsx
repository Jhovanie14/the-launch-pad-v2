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
  HandHelping,
  QrCode,
  RadioTower,
  UserRound,
  MessageSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/auth-context";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import LoadingDots from "../loading";

interface AdminSidebarProps {
  user?: AuthUser;
}

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: Home },
  { name: "Users", href: "/admin/users", icon: UserRound },
  { name: "fleet inquiry", href: "/admin/fleet-inquiry", icon: MessageSquare },
  { name: "fleet payment management", href: "/admin/fleet-payment-management", icon: MessageSquare },
  { name: "Bookings", href: "/admin/booking", icon: Calendar },
  { name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
  { name: "Services", href: "/admin/services", icon: Car },
  { name: "Add-ons", href: "/admin/addons", icon: Truck },
  { name: "Promo codes", href: "/admin/promo", icon: HandHelping },
  { name: "QR payment/Tip", href: "/admin/qr", icon: QrCode },
  { name: "Blog", href: "/admin/blog", icon: Notebook },
  { name: "Contact", href: "/admin/contact", icon: MessageCircle },
  { name: "Broadcasts", href: "/admin/broadcast", icon: RadioTower },
  { name: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userType, setUserType] = useState<string>("admin"); // 👈 added

  const handleSignOut = async () => {
    setIsLoggingOut(true); // show full-screen loader
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await signOut(); // your logout logic
    // router.push('/login') happens inside signOut or after it
    // no need to set isLoggingOut(false) because the page will redirect
  };

  // ✅ Fetch user_type from profiles
  useEffect(() => {
    const supabase = createClient();
    const fetchUserType = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();
      if (!error && data) {
        setUserType(data.user_type || "customer");
      }
    };
    fetchUserType();
  }, [user]);

  const filteredNavigation = navigation.filter((item) => {
    if (
      ["Services", "Promo codes", "Add-ons", "Subscriptions"].includes(
        item.name
      ) &&
      userType === "admin"
    ) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const supabase = createClient();

    const fetchContacts = async () => {
      const { count, error } = await supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      if (!error && typeof count === "number") {
        setUnreadCount(count);
      }
    };

    fetchContacts();

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

  return (
    <>
      {isLoggingOut && <LoadingDots />}
      {/* Overlay for small screens */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:inset-0 flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-32 px-6 border-b border-sidebar-border">
          <Link href="/">
            <div className="flex flex-col items-center space-x-3">
              <Image
                src="/xmas-launchpad-logo.png"
                alt="The Launch Pad"
                width={48}
                height={48}
                className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
              />
              <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-foreground tracking-tight">
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
            className="fixed top-4 right-4 z-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-8 w-8" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "bg-blue-900 text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
              >
                <div className="relative mr-3 flex items-center justify-center">
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {item.name === "Contact" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        {user && (
          <div className="flex-shrink-0 border-t border-gray-400 p-4 flex items-center justify-between">
            <div className="flex items-center">
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
              <div className="ml-3">
                <p className="text-sm font-medium">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              type="submit"
              variant="outline"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Hamburger Button */}
      <div className="fixed top-4 right-4 z-50 lg:hidden">
        <Button
          variant="outline"
          className="w-12 h-12 border-black"
          onClick={() => setSidebarOpen(true)}
        >
          <Home className="w-14 h-14 text-black" />
        </Button>
      </div>
    </>
  );
}
