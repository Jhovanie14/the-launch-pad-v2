"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  Search,
  Filter,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

type FleetInquiry = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  fleet_size: string;
  message: string;
  status: "pending" | "contacted" | "qualified" | "closed";
  created_at: string;
  updated_at: string;
  user_id: string | null;
};

export default function FleetInquiriesAdmin() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<FleetInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInquiry, setSelectedInquiry] = useState<FleetInquiry | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const response = await fetch("/api/admin/fleet-inquiries");
      if (!response.ok) throw new Error("Failed to fetch inquiries");
      const data = await response.json();
      setInquiries(data);
    } catch (error) {
      toast.error("Error", {
        description: "Failed to load fleet inquiries",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch("/api/admin/fleet-inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setInquiries((prev) =>
        prev.map((inquiry) =>
          inquiry.id === id ? { ...inquiry, status: status as any } : inquiry
        )
      );

      toast.success("Status Updated", {
        description: `Inquiry marked as ${status}`,
      });
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update status",
      });
    }
  };

  const viewDetails = (inquiry: FleetInquiry) => {
    setSelectedInquiry(inquiry);
    setDetailsOpen(true);
  };

  const filteredInquiries = inquiries.filter((inquiry) => {
    const matchesSearch =
      inquiry.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inquiry.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || inquiry.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: inquiries.length,
    pending: inquiries.filter((i) => i.status === "pending").length,
    contacted: inquiries.filter((i) => i.status === "contacted").length,
    qualified: inquiries.filter((i) => i.status === "qualified").length,
    closed: inquiries.filter((i) => i.status === "closed").length,
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">Fleet Inquiries</h1>
          <p className="text-muted-foreground">
            Manage and track fleet service requests
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatsCard title="Total" value={statusCounts.all} variant="default" />
        <StatsCard
          title="Pending"
          value={statusCounts.pending}
          variant="pending"
        />
        <StatsCard
          title="Contacted"
          value={statusCounts.contacted}
          variant="contacted"
        />
        <StatsCard
          title="Qualified"
          value={statusCounts.qualified}
          variant="qualified"
        />
        <StatsCard
          title="Closed"
          value={statusCounts.closed}
          variant="closed"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by company, contact name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inquiries ({filteredInquiries.length})</CardTitle>
          <CardDescription>
            View and manage all fleet service inquiries
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInquiries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No fleet inquiries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Fleet Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInquiries.map((inquiry) => (
                    <TableRow key={inquiry.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-blue-900 mt-1" />
                          <div>
                            <div className="font-medium">
                              {inquiry.company_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {inquiry.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {inquiry.contact_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {inquiry.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{inquiry.fleet_size}</TableCell>
                      <TableCell>
                        <Select
                          value={inquiry.status}
                          onValueChange={(value) =>
                            updateStatus(inquiry.id, value)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue>
                              <StatusBadge status={inquiry.status} />
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(inquiry.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewDetails(inquiry)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          {(inquiry.status === "qualified" ||
                            inquiry.status === "contacted") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/admin/fleet-payment-management?inquiry=${inquiry.id}`
                                )
                              }
                              className="text-blue-900 border-blue-900 hover:bg-blue-50"
                            >
                              Create Contract
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-900" />
              Fleet Inquiry Details
            </DialogTitle>
            <DialogDescription>
              Full information about this fleet service request
            </DialogDescription>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Company Name
                  </label>
                  <p className="mt-1 font-medium">
                    {selectedInquiry.company_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Fleet Size
                  </label>
                  <p className="mt-1 font-medium">
                    {selectedInquiry.fleet_size}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Contact Name
                  </label>
                  <p className="mt-1 font-medium">
                    {selectedInquiry.contact_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <div className="mt-1">
                    <StatusBadge status={selectedInquiry.status} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </label>
                  <p className="mt-1 font-medium">{selectedInquiry.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    Phone
                  </label>
                  <p className="mt-1 font-medium">{selectedInquiry.phone}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Message
                </label>
                <div className="mt-1 p-4 bg-gray-50 rounded-md">
                  <p className="text-sm whitespace-pre-wrap wrap-break-word">
                    {selectedInquiry.message}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Submitted On
                  </label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedInquiry.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Last Updated
                  </label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedInquiry.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`mailto:${selectedInquiry.email}`)}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(`tel:${selectedInquiry.phone}`)}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Call
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------- Components ------------------------- */

function StatsCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: number;
  variant: "default" | "pending" | "contacted" | "qualified" | "closed";
}) {
  const colors = {
    default: "bg-blue-50 text-blue-900 border-blue-200",
    pending: "bg-yellow-50 text-yellow-900 border-yellow-200",
    contacted: "bg-purple-50 text-purple-900 border-purple-200",
    qualified: "bg-green-50 text-green-900 border-green-200",
    closed: "bg-gray-50 text-gray-900 border-gray-200",
  };

  return (
    <Card className={`${colors[variant]} border-2`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "contacted" | "qualified" | "closed";
}) {
  const variants = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    contacted: "bg-purple-100 text-purple-800 border-purple-300",
    qualified: "bg-green-100 text-green-800 border-green-300",
    closed: "bg-gray-100 text-gray-800 border-gray-300",
  };

  const labels = {
    pending: "Pending",
    contacted: "Contacted",
    qualified: "Qualified",
    closed: "Closed",
  };

  return (
    <Badge
      variant="outline"
      className={`${variants[status]} border capitalize`}
    >
      {labels[status]}
    </Badge>
  );
}
