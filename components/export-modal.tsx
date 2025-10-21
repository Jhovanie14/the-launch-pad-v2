"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download } from "lucide-react";

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (
    type: "pdf" | "excel",
    status: string,
    date: string
  ) => Promise<void>;
}

export function ExportModal({
  open,
  onOpenChange,
  onExport,
}: ExportModalProps) {
  const [exportType, setExportType] = useState<"pdf" | "excel">("pdf");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      await onExport(exportType, statusFilter, dateFilter);
      onOpenChange(false);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] p-4 sm:p-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Generate Report</DialogTitle>
          <DialogDescription>
            Select your export format and filters
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3">
          {/* Export Card */}
          <div className="space-y-4 w-full">
            {/* Export Format Selection */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setExportType("excel")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportType === "excel"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">Excel</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    XLSX Format
                  </p>
                </button>
                <button
                  onClick={() => setExportType("pdf")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    exportType === "pdf"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">PDF</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF Format
                  </p>
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">
                Filter by Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <label className="text-sm font-semibold text-foreground">
                Filter by Date
              </label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isLoading}
              className="w-full h-12 text-base font-semibold gap-2"
            >
              <Download className="w-5 h-5" />
              {isLoading ? "Generating..." : "Generate & Download Report"}
            </Button>
          </div>

          {/* Info Cards */}
          <div className="space-y-4">
            <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-primary">
                  Excel Export
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Get detailed spreadsheets with all revenue data, sortable and
                  filterable columns.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-secondary/5 to-secondary/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  PDF Export
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Generate professional PDF reports ready for sharing and
                  archiving.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-accent/5 to-accent/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">
                  Real-time Data
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  All reports are generated with the latest revenue data from
                  your database.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
