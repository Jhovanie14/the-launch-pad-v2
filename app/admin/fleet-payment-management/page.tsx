"use client";

import { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  FileText,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "sonner";

type FleetContract = {
  id: string;
  inquiry_id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  fleet_size: string;
  contract_type: "monthly" | "quarterly" | "yearly" | "custom";
  monthly_rate: number;
  discount_percentage: number;
  start_date: string;
  end_date: string | null;
  status: "active" | "pending" | "expired" | "cancelled";
  payment_terms: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

type FleetInvoice = {
  id: string;
  contract_id: string;
  invoice_number: string;
  company_name: string;
  amount: number;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  payment_date: string | null;
  notes: string;
  created_at: string;
};

export default function FleetPaymentManagement() {
 
  const [activeTab, setActiveTab] = useState<"contracts" | "invoices">(
    "contracts"
  );
  const [contracts, setContracts] = useState<FleetContract[]>([]);
  const [invoices, setInvoices] = useState<FleetInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] =
    useState<FleetContract | null>(null);

  useEffect(() => {
    fetchContracts();
    fetchInvoices();

    // Check if inquiry_id is in URL params
    const params = new URLSearchParams(window.location.search);
    const inquiryId = params.get("inquiry");
    if (inquiryId) {
      setContractDialogOpen(true);
    }
  }, []);

  const fetchContracts = async () => {
    try {
      const response = await fetch("/api/admin/fleet-contracts");
      if (!response.ok) throw new Error("Failed to fetch contracts");
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      toast.error("Error loading contracts");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/admin/fleet-invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      toast.error("Error loading invoices");
    }
  };

  const stats = {
    activeContracts: contracts.filter((c) => c.status === "active").length,
    monthlyRevenue: contracts
      .filter((c) => c.status === "active")
      .reduce((sum, c) => sum + c.monthly_rate, 0),
    pendingInvoices: invoices.filter((i) => i.status === "sent").length,
    overdueInvoices: invoices.filter((i) => i.status === "overdue").length,
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-blue-900">
            Fleet Payment Management
          </h1>
          <p className="text-muted-foreground">
            Manage fleet contracts and invoicing
          </p>
        </div>
        <Button
          onClick={() => setContractDialogOpen(true)}
          className="bg-blue-900 hover:bg-blue-800"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Active Contracts"
          value={stats.activeContracts}
          icon={<Building2 className="w-5 h-5" />}
          variant="blue"
        />
        <StatsCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-5 h-5" />}
          variant="green"
        />
        <StatsCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          icon={<Clock className="w-5 h-5" />}
          variant="yellow"
        />
        <StatsCard
          title="Overdue Invoices"
          value={stats.overdueInvoices}
          icon={<XCircle className="w-5 h-5" />}
          variant="red"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab("contracts")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "contracts"
              ? "border-b-2 border-blue-900 text-blue-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Contracts
        </button>
        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "invoices"
              ? "border-b-2 border-blue-900 text-blue-900"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Invoices
        </button>
      </div>

      {/* Contracts Tab */}
      {activeTab === "contracts" && (
        <ContractsTable
          contracts={contracts}
          onEdit={(contract) => {
            setSelectedContract(contract);
            setContractDialogOpen(true);
          }}
          onCreateInvoice={(contract) => {
            setSelectedContract(contract);
            setInvoiceDialogOpen(true);
          }}
          refetch={fetchContracts}
        />
      )}

      {/* Invoices Tab */}
      {activeTab === "invoices" && (
        <InvoicesTable invoices={invoices} refetch={fetchInvoices} />
      )}

      {/* Contract Dialog */}
      <ContractDialog
        open={contractDialogOpen}
        onClose={() => {
          setContractDialogOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        refetch={fetchContracts}
      />

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onClose={() => {
          setInvoiceDialogOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        refetch={fetchInvoices}
      />
    </div>
  );
}

/* ------------------------- Components ------------------------- */

function StatsCard({
  title,
  value,
  icon,
  variant,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  variant: "blue" | "green" | "yellow" | "red";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    green: "bg-green-50 text-green-900 border-green-200",
    yellow: "bg-yellow-50 text-yellow-900 border-yellow-200",
    red: "bg-red-50 text-red-900 border-red-200",
  };

  return (
    <Card className={`${colors[variant]} border-2`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
          </div>
          <div className="opacity-80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractsTable({
  contracts,
  onEdit,
  onCreateInvoice,
  refetch,
}: {
  contracts: FleetContract[];
  onEdit: (contract: FleetContract) => void;
  onCreateInvoice: (contract: FleetContract) => void;
  refetch: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fleet Contracts ({contracts.length})</CardTitle>
        <CardDescription>
          Active and pending fleet service agreements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Fleet Size</TableHead>
                <TableHead>Contract Type</TableHead>
                <TableHead>Monthly Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((contract) => (
                <TableRow key={contract.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-blue-900 mt-1" />
                      <div>
                        <div className="font-medium">
                          {contract.company_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {contract.contact_name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{contract.fleet_size}</TableCell>
                  <TableCell className="capitalize">
                    {contract.contract_type}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        ${contract.monthly_rate.toLocaleString()}
                      </div>
                      {contract.discount_percentage > 0 && (
                        <div className="text-sm text-green-600">
                          {contract.discount_percentage}% discount
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <ContractStatusBadge status={contract.status} />
                  </TableCell>
                  <TableCell>
                    {new Date(contract.start_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(contract)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCreateInvoice(contract)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoicesTable({
  invoices,
  refetch,
}: {
  invoices: FleetInvoice[];
  refetch: () => void;
}) {
  const markAsPaid = async (id: string) => {
    try {
      const response = await fetch("/api/admin/fleet-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "paid",
          payment_date: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Failed to update invoice");
      toast.success("Invoice marked as paid");
      refetch();
    } catch (error) {
      toast.error("Failed to update invoice");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices ({invoices.length})</CardTitle>
        <CardDescription>Fleet service invoicing history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>{invoice.company_name}</TableCell>
                  <TableCell className="font-medium">
                    ${invoice.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.issue_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {invoice.status !== "paid" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsPaid(invoice.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Mark Paid
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractDialog({
  open,
  onClose,
  contract,
  refetch,
}: {
  open: boolean;
  onClose: () => void;
  contract: FleetContract | null;
  refetch: () => void;
}) {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [loadingInquiries, setLoadingInquiries] = useState(true);
  const [formData, setFormData] = useState({
    inquiry_id: "",
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    fleet_size: "",
    contract_type: "monthly",
    monthly_rate: "",
    discount_percentage: "",
    start_date: "",
    end_date: "",
    payment_terms: "Net 30",
    notes: "",
  });

  useEffect(() => {
    fetchInquiries();

    // Check URL params for pre-selected inquiry
    const params = new URLSearchParams(window.location.search);
    const inquiryId = params.get("inquiry");
    if (inquiryId && inquiries.length > 0) {
      handleInquirySelect(inquiryId);
    }
  }, [open]);

  useEffect(() => {
    if (contract) {
      setFormData({
        inquiry_id: contract.inquiry_id,
        company_name: contract.company_name,
        contact_name: contract.contact_name,
        email: contract.email,
        phone: contract.phone,
        fleet_size: contract.fleet_size,
        contract_type: contract.contract_type,
        monthly_rate: contract.monthly_rate.toString(),
        discount_percentage: contract.discount_percentage.toString(),
        start_date: contract.start_date,
        end_date: contract.end_date || "",
        payment_terms: contract.payment_terms,
        notes: contract.notes,
      });
    }
  }, [contract]);

  const fetchInquiries = async () => {
    try {
      const response = await fetch("/api/admin/fleet-inquiries");
      if (!response.ok) throw new Error("Failed to fetch inquiries");
      const data = await response.json();
      // Filter for qualified or contacted inquiries only
      const availableInquiries = data.filter(
        (inq: any) => inq.status === "qualified" || inq.status === "contacted"
      );
      setInquiries(availableInquiries);
    } catch (error) {
      toast.error("Failed to load inquiries");
    } finally {
      setLoadingInquiries(false);
    }
  };

  const handleInquirySelect = (inquiryId: string) => {
    const selected = inquiries.find((inq) => inq.id === inquiryId);
    if (selected) {
      setFormData({
        ...formData,
        inquiry_id: inquiryId,
        company_name: selected.company_name,
        contact_name: selected.contact_name,
        email: selected.email,
        phone: selected.phone,
        fleet_size: selected.fleet_size,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = contract
        ? "/api/admin/fleet-contracts"
        : "/api/admin/fleet-contracts";

      const response = await fetch(url, {
        method: contract ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          id: contract?.id,
          monthly_rate: parseFloat(formData.monthly_rate),
          discount_percentage: parseFloat(formData.discount_percentage || "0"),
        }),
      });

      if (!response.ok) throw new Error("Failed to save contract");

      toast.success(contract ? "Contract updated" : "Contract created");
      refetch();
      onClose();
    } catch (error) {
      toast.error("Failed to save contract");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? "Edit Contract" : "Create New Contract"}
          </DialogTitle>
          <DialogDescription>
            Set up a new fleet service agreement
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!contract && (
            <div className="space-y-2">
              <Label>Select Fleet Inquiry *</Label>
              <Select
                value={formData.inquiry_id}
                onValueChange={handleInquirySelect}
                disabled={loadingInquiries}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingInquiries ? "Loading..." : "Select an inquiry"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {inquiries.map((inquiry) => (
                    <SelectItem key={inquiry.id} value={inquiry.id}>
                      {inquiry.company_name} - {inquiry.fleet_size} vehicles
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Only showing "Qualified" and "Contacted" inquiries
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                required
                value={formData.company_name}
                onChange={(e) =>
                  setFormData({ ...formData, company_name: e.target.value })
                }
                disabled={!!formData.inquiry_id && !contract}
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Name *</Label>
              <Input
                required
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                disabled={!!formData.inquiry_id && !contract}
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                required
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                disabled={!!formData.inquiry_id && !contract}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                disabled={!!formData.inquiry_id && !contract}
              />
            </div>
            <div className="space-y-2">
              <Label>Fleet Size *</Label>
              <Input
                required
                value={formData.fleet_size}
                onChange={(e) =>
                  setFormData({ ...formData, fleet_size: e.target.value })
                }
                disabled={!!formData.inquiry_id && !contract}
              />
            </div>
            <div className="space-y-2">
              <Label>Contract Type *</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, contract_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monthly Rate ($) *</Label>
              <Input
                required
                type="number"
                step="0.01"
                value={formData.monthly_rate}
                onChange={(e) =>
                  setFormData({ ...formData, monthly_rate: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Discount (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.discount_percentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount_percentage: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input
                required
                type="date"
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment Terms *</Label>
            <Select
              value={formData.payment_terms}
              onValueChange={(value) =>
                setFormData({ ...formData, payment_terms: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Net 15">Net 15</SelectItem>
                <SelectItem value="Net 30">Net 30</SelectItem>
                <SelectItem value="Net 60">Net 60</SelectItem>
                <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
              {contract ? "Update Contract" : "Create Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({
  open,
  onClose,
  contract,
  refetch,
}: {
  open: boolean;
  onClose: () => void;
  contract: FleetContract | null;
  refetch: () => void;
}) {
  const [formData, setFormData] = useState({
    amount: "",
    issue_date: new Date().toISOString().split("T")[0],
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    if (contract) {
      const dueDate = new Date();
      const terms = parseInt(contract.payment_terms.match(/\d+/)?.[0] || "30");
      dueDate.setDate(dueDate.getDate() + terms);

      setFormData({
        amount: contract.monthly_rate.toString(),
        issue_date: new Date().toISOString().split("T")[0],
        due_date: dueDate.toISOString().split("T")[0],
        notes: "",
      });
    }
  }, [contract]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/admin/fleet-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_id: contract?.id,
          company_name: contract?.company_name,
          amount: parseFloat(formData.amount),
          issue_date: formData.issue_date,
          due_date: formData.due_date,
          notes: formData.notes,
        }),
      });

      if (!response.ok) throw new Error("Failed to create invoice");

      toast.success("Invoice created successfully");
      refetch();
      onClose();
    } catch (error) {
      toast.error("Failed to create invoice");
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
          <DialogDescription>
            Generate a new invoice for {contract.company_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Amount ($) *</Label>
            <Input
              required
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Issue Date *</Label>
              <Input
                required
                type="date"
                value={formData.issue_date}
                onChange={(e) =>
                  setFormData({ ...formData, issue_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input
                required
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
              Create Invoice
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContractStatusBadge({
  status,
}: {
  status: "active" | "pending" | "expired" | "cancelled";
}) {
  const variants = {
    active: "bg-green-100 text-green-800 border-green-300",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    expired: "bg-gray-100 text-gray-800 border-gray-300",
    cancelled: "bg-red-100 text-red-800 border-red-300",
  };

  return (
    <Badge
      variant="outline"
      className={`${variants[status]} border capitalize`}
    >
      {status}
    </Badge>
  );
}

function InvoiceStatusBadge({
  status,
}: {
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
}) {
  const variants = {
    draft: "bg-gray-100 text-gray-800 border-gray-300",
    sent: "bg-blue-100 text-blue-800 border-blue-300",
    paid: "bg-green-100 text-green-800 border-green-300",
    overdue: "bg-red-100 text-red-800 border-red-300",
    cancelled: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <Badge
      variant="outline"
      className={`${variants[status]} border capitalize`}
    >
      {status}
    </Badge>
  );
}
