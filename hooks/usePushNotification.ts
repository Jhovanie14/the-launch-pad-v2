"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  useEffect(() => {
    // Check if browser supports notifications
    if ("Notification" in window && "serviceWorker" in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Your browser doesn't support push notifications");
      return false;
    }

    if (permission === "granted") {
      return true;
    }

    if (permission === "denied") {
      toast.error(
        "Notifications are blocked. Please enable them in your browser settings."
      );
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "granted") {
        // Register service worker
        if ("serviceWorker" in navigator) {
          try {
            const registration =
              await navigator.serviceWorker.register("/sw.js");
            console.log("Service Worker registered:", registration);
            toast.success("Push notifications enabled!");
            return true;
          } catch (error) {
            console.error("Service Worker registration failed:", error);
            toast.error("Failed to register service worker");
            return false;
          }
        }
        return true;
      } else {
        toast.error("Notification permission denied");
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return false;
    }
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== "granted") {
      return;
    }
  
    // Use Service Worker if available, otherwise fallback to browser notification
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/thelaunchpad.png",
          badge: "/thelaunchpad.png",
          requireInteraction: true, // Default to requiring interaction
          ...options, // User options can override
        });
      });
    } else {
      new Notification(title, {
        icon: "/thelaunchpad.png",
        requireInteraction: true,
        ...options,
      });
    }
  };

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    isGranted: permission === "granted",
  };
}
