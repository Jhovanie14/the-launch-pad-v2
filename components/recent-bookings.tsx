"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RecentBookings({ bookings }: { bookings: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-800";
      case "completed":
        return "bg-green-800";
      case "pending":
        return "bg-orange-800";
      default:
        return "bg-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <CardDescription>Your latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        {bookings.map((booking) => (
          <div key={booking.id} className="flex items-center space-x-4 mb-3">
            <div
              className={`h-2 w-2 rounded-full ${getStatusColor(booking.status)}`}
            />
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{booking.status}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(booking.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
