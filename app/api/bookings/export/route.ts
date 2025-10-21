import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "pdf";
  const dateFilter = searchParams.get("date");
  const statusFilter = searchParams.get("status");

  let query = supabase
    .from("bookings")
    .select(
      "customer_name, customer_email, service_package_name, total_price, appointment_date, appointment_time, payment_method, status"
    );

  if (statusFilter && statusFilter !== "all")
    query = query.eq("status", statusFilter);

  if (dateFilter && dateFilter !== "all") {
    const today = new Date();
    let fromDate: string | null = null;

    if (dateFilter === "today") {
      fromDate = today.toISOString().split("T")[0];
      query = query.eq("appointment_date", fromDate);
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      query = query.gte(
        "appointment_date",
        weekAgo.toISOString().split("T")[0]
      );
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      query = query.gte(
        "appointment_date",
        monthAgo.toISOString().split("T")[0]
      );
    }
  } 

  const { data, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  if (type === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Revenue Report");

    // Set column widths
    sheet.columns = [
      { header: "Customer", key: "customer_name", width: 22 },
      { header: "Email", key: "customer_email", width: 28 },
      { header: "Service", key: "service_package_name", width: 22 },
      { header: "Price", key: "total_price", width: 12 },
      { header: "Date", key: "appointment_date", width: 15 },
      { header: "Time", key: "appointment_time", width: 12 },
      { header: "Payment Method", key: "payment_method", width: 16 },
      { header: "Status", key: "status", width: 14 },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6B5B95" }, // Primary purple color
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 24;

    // Add data rows
    sheet.addRows(data);

    // Style data rows with alternating colors
    let totalRevenue = 0;
    data.forEach((row, index) => {
      const excelRow = sheet.getRow(index + 2);
      totalRevenue += row.total_price || 0;

      // Alternating row colors
      if (index % 2 === 0) {
        excelRow.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F3F8" }, // Light purple
        };
      }

      // Format price column
      excelRow.getCell("D").numFmt = "$#,##0.00";
      excelRow.alignment = { horizontal: "left", vertical: "middle" };
      excelRow.height = 18;

      // Center align status
      excelRow.getCell("H").alignment = { horizontal: "center" };
    });

    // Add summary section
    const summaryStartRow = data.length + 3;
    const summarySheet = sheet;

    summarySheet.getCell(`A${summaryStartRow}`).value = "SUMMARY";
    summarySheet.getCell(`A${summaryStartRow}`).font = {
      bold: true,
      size: 14,
      color: { argb: "FF6B5B95" },
    };

    summarySheet.getCell(`A${summaryStartRow + 1}`).value = "Total Bookings:";
    summarySheet.getCell(`B${summaryStartRow + 1}`).value = data.length;
    summarySheet.getCell(`A${summaryStartRow + 2}`).value = "Total Revenue:";
    summarySheet.getCell(`B${summaryStartRow + 2}`).value = totalRevenue;
    summarySheet.getCell(`B${summaryStartRow + 2}`).numFmt = "$#,##0.00";

    // Style summary section
    for (let i = 1; i <= 2; i++) {
      summarySheet.getCell(`A${summaryStartRow + i}`).font = { bold: true };
      summarySheet.getCell(`B${summaryStartRow + i}`).font = { bold: true };
    }

    // Add borders to all cells
    const range = `A1:H${data.length + 1}`;
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="revenue-report.xlsx"',
      },
    });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Standard letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.42, 0.36, 0.58); // Purple
  const accentColor = rgb(0.95, 0.95, 0.98); // Light background
  const textColor = rgb(0.15, 0.15, 0.15); // Dark text

  let y = 750;

  // Header section
  page.drawText("REVENUE REPORT", {
    x: 50,
    y,
    size: 28,
    font: boldFont,
    color: primaryColor,
  });
  y -= 10;
  page.drawText("Booking Revenue Summary", {
    x: 50,
    y,
    size: 12,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
  y -= 25;

  // Date and report info
  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(`Report Generated: ${reportDate}`, {
    x: 50,
    y,
    size: 10,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 20;

  // Summary statistics box
  const summaryBoxY = y;
  const boxHeight = 60;
  const boxWidth = 512;

  // Draw summary box background
  page.drawRectangle({
    x: 50,
    y: summaryBoxY - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: accentColor,
    borderColor: primaryColor,
    borderWidth: 1,
  });

  // Calculate totals
  let totalRevenue = 0;
  let completedCount = 0;
  data.forEach((b) => {
    totalRevenue += b.total_price || 0;
    if (b.status === "completed") completedCount++;
  });

  // Summary stats
  const statsY = summaryBoxY - 15;
  page.drawText(`Total Bookings: ${data.length}`, {
    x: 70,
    y: statsY,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  page.drawText(`Completed: ${completedCount}`, {
    x: 250,
    y: statsY,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  page.drawText(`Total Revenue: $${totalRevenue.toFixed(2)}`, {
    x: 380,
    y: statsY,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });

  y = summaryBoxY - boxHeight - 30;

  // Table header
  const tableHeaderY = y;
  const colWidths = [90, 100, 80, 70, 70];
  const colX = [50, 140, 240, 320, 390];
  const headers = ["Customer", "Service", "Price", "Date", "Status"];

  // Draw header background
  page.drawRectangle({
    x: 50,
    y: tableHeaderY - 20,
    width: 512,
    height: 20,
    color: primaryColor,
  });

  // Draw header text
  headers.forEach((header, i) => {
    page.drawText(header, {
      x: colX[i],
      y: tableHeaderY - 15,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
  });

  y = tableHeaderY - 25;

  // Table rows (limit to 20 rows per page for readability)
  const rowsPerPage = 20;
  data.slice(0, rowsPerPage).forEach((booking, index) => {
    // Alternating row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: 50,
        y: y - 15,
        width: 512,
        height: 15,
        color: accentColor,
      });
    }

    // Draw row data
    const customerName = (booking.customer_name || "Unknown").substring(0, 15);
    const serviceName = (booking.service_package_name || "N/A").substring(
      0,
      12
    );
    const price = `$${(booking.total_price || 0).toFixed(2)}`;
    const date = booking.appointment_date || "N/A";
    const status = booking.status || "N/A";

    page.drawText(customerName, {
      x: colX[0],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText(serviceName, {
      x: colX[1],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText(price, {
      x: colX[2],
      y: y - 12,
      size: 9,
      font: boldFont,
      color: primaryColor,
    });
    page.drawText(date, {
      x: colX[3],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText(status, {
      x: colX[4],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });

    y -= 15;
  });

  // Footer
  page.drawText("Revenue Report - Confidential", {
    x: 50,
    y: 30,
    size: 9,
    font,
    color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText(`Page 1 of 1 | Generated on ${reportDate}`, {
    x: 450,
    y: 30,
    size: 9,
    font,
    color: rgb(0.7, 0.7, 0.7),
  });

  const pdfBytes = await pdfDoc.save();
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="revenue-report.pdf"',
    },
  });
}
