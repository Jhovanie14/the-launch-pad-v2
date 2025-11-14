"use client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Banknote,
  Calendar,
  Car,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  Ellipsis,
  Repeat,
} from "lucide-react";
import { format } from "date-fns";
import type { Booking } from "@/types";

interface UserSubscription {
  user_id: string;
  status: string;
}

interface BookingsTableProps {
  bookings: Booking[];
  user_subscription: UserSubscription[];
  onUpdateStatus: (bookingId: string, status: Booking["status"]) => void;
}

export function BookingsTable({
  bookings,
  onUpdateStatus,
  user_subscription,
}: BookingsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const formattedHours = hours % 12 || 12;
    return `${formattedHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const isSubscribed = (userId: string | null) => {
    if (!userId) return false; // no user_id → not subscribed
    return user_subscription?.some(
      (sub) => sub.user_id === userId && sub.status === "active"
    );
  };

  if (bookings.length === 0) {
    return (
      <div className="text-center py-12">
        <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No bookings found</h3>
        <p className="text-muted-foreground">
          No bookings match your current filters.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service & Add-ons</TableHead>
            <TableHead>attendant</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Date & Time</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Payment Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.map((booking) => (
            <TableRow key={booking.id}>
              <TableCell>
                <div className="">
                  <p className="font-medium text-sm text-accent-foreground">
                    Service Package:
                  </p>
                  <ul className="list-disc list-inside">
                    <li> {booking.service_package_name}</li>
                  </ul>
                </div>
                {/* Add-ons */}
                {booking.add_ons?.length > 0 && (
                  <div className="text-sm text-accent-foreground mt-1">
                    Add-ons:
                    <ul className="list-disc list-inside">
                      {booking.add_ons.map((addon) => (
                        <li key={addon.id}>{addon.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {/* Attendant Name */}
                <div className="text-sm text-accent-foreground mt-1">
                  Attendant:{" "}
                  <span className="font-medium">
                    {booking.attendant_name
                      ? booking.attendant_name.toUpperCase()
                      : "Unknown"}
                  </span>
                </div>
              </TableCell>

              <TableCell>
                <div className=" text-sm">
                  <div className="flex items-center space-x-2">
                    {isSubscribed(booking.user_id) && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                    <div className="text-muted-foreground">
                      • {booking.customer_name ?? "Guest"}
                    </div>
                    <div className="text-muted-foreground">
                      • {booking.customer_email}
                    </div>
                  </div>
                  <div className="font-medium">Customer #{booking.id}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    {booking.vehicle?.year} {booking.vehicle?.make}{" "}
                    {booking.vehicle?.model}
                  </div>
                  <div className="text-muted-foreground">
                    {booking.vehicle?.colors}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {format(new Date(booking.appointment_date), "MMM d, yyyy")}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatTime(booking.appointment_time)}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center font-medium">
                  <DollarSign className="h-4 w-4 mr-1" />
                  {booking.total_price}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center font-medium">
                  {booking.payment_method === "card" && (
                    <CreditCard className="h-4 w-4 mr-1 text-blue-500" />
                  )}
                  {booking.payment_method === "cash" && (
                    <Banknote className="h-4 w-4 mr-1 text-green-500" />
                  )}
                  {booking.payment_method === "subscription" && (
                    <Repeat className="h-4 w-4 mr-1 text-purple-500" />
                  )}
                  {booking.payment_method}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Select
                  value={booking.status}
                  onValueChange={(value) =>
                    onUpdateStatus(booking.id, value as Booking["status"])
                  }
                >
                  <SelectTrigger className="w-10 h-10 p-0 border-none bg-transparent hover:bg-gray-100 rounded-full flex items-center justify-center [&>svg:last-child]:hidden">
                    <Ellipsis className="w-6 h-6 text-black" />
                  </SelectTrigger>
                  <SelectContent align="center">
                    <SelectItem value="pending">pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancel</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
