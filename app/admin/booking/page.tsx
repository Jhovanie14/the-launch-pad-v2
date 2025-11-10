import { AdminSidebar } from "@/components/admin/sidebar";
import { getUserProfile } from "@/auth/actions";
import BookingsView from "./booking-view";

export default async function ServicesPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden mx-auto p-6 md:px-6 mt-16 lg:mt-0">
      <BookingsView />
    </div>
  );
}
