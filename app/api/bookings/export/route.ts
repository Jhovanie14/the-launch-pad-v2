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
    )
    .order("appointment_date", { ascending: true });

  // Filter by status if provided
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  // Filter by date if provided
  const today = new Date();
  if (dateFilter && dateFilter !== "all") {
    if (dateFilter === "today") {
      const fromDate = today.toISOString().split("T")[0];
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

  const { data: bookings, error } = await query;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  // Calculate totals from filtered data
  let totalRevenue = 0;
  let completedCount = 0;
  bookings.forEach((b) => {
    totalRevenue += b.total_price || 0;
    if (b.status === "completed") completedCount++;
  });

  // ===== EXCEL REPORT =====
  if (type === "excel") {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Revenue Report");

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

    sheet.addRows(bookings);

    // Style rows and header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6B5B95" },
    };
    headerRow.alignment = { horizontal: "center" };

    bookings.forEach((row, i) => {
      const excelRow = sheet.getRow(i + 2);
      excelRow.getCell("D").numFmt = "$#,##0.00";
      excelRow.alignment = { horizontal: "left" };
    });

    // Summary section
    const summaryRow = sheet.addRow([]);
    sheet.addRow(["Total Bookings:", bookings.length]);
    sheet.addRow(["Completed:", completedCount]);
    sheet.addRow(["Total Revenue:", totalRevenue]).getCell(2).numFmt =
      "$#,##0.00";

    const buffer = await workbook.xlsx.writeBuffer();
    return new Response(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="revenue-report.xlsx"',
      },
    });
  }

  // ===== PDF REPORT =====
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const primaryColor = rgb(0.42, 0.36, 0.58);
  const accentColor = rgb(0.95, 0.95, 0.98);
  const textColor = rgb(0.15, 0.15, 0.15);

  const pageHeight = 792;
  const pageWidth = 612;
  const margin = 50;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // --- Header ---
  page.drawText("REVENUE REPORT", {
    x: margin,
    y,
    size: 28,
    font: boldFont,
    color: primaryColor,
  });
  y -= 30;
  page.drawText("Booking Revenue Summary", {
    x: margin,
    y,
    size: 12,
    font,
    color: rgb(0.55, 0.55, 0.55),
  });
  y -= 20;

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  page.drawText(`Report Generated: ${reportDate}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: rgb(0.6, 0.6, 0.6),
  });
  y -= 25;

  // --- Summary Box (first page only) ---
  const boxHeight = 60;
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: pageWidth - margin * 2,
    height: boxHeight,
    color: accentColor,
    borderColor: primaryColor,
    borderWidth: 1,
  });
  const statsY = y - 15;
  page.drawText(`Total Bookings: ${bookings.length}`, {
    x: margin + 20,
    y: statsY,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  page.drawText(`Completed: ${completedCount}`, {
    x: margin + 200,
    y: statsY,
    size: 11,
    font: boldFont,
    color: textColor,
  });
  page.drawText(`Total Revenue: $${totalRevenue.toFixed(2)}`, {
    x: margin + 310,
    y: statsY,
    size: 11,
    font: boldFont,
    color: primaryColor,
  });
  y -= boxHeight + 20;

  // --- Table Header ---
  const colX = [margin, 140, 240, 320, 390, 460];
  const headers = ["Customer", "Service", "Price", "Date", "Payment", "Status"];

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: pageWidth - margin * 2,
      height: 20,
      color: primaryColor,
    });
    headers.forEach((header, i) => {
      page.drawText(header, {
        x: colX[i],
        y: y - 15,
        size: 10,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
    });
    y -= 25;
  };

  // Initial header
  drawTableHeader();

  // --- Table Rows ---
  const rowHeight = 15;
  const bottomMargin = 50;

  bookings.forEach((b, index) => {
    // Check if new page is needed
    if (y - rowHeight < bottomMargin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawTableHeader();
    }

    // Alternating row background
    if (index % 2 === 0) {
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: pageWidth - margin * 2,
        height: rowHeight,
        color: accentColor,
      });
    }

    const payment =
      b.payment_method === "card"
        ? "Card"
        : b.payment_method === "cash"
          ? "Cash"
          : "Subscription";

    page.drawText((b.customer_name || "Unknown").substring(0, 15), {
      x: colX[0],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText((b.service_package_name || "N/A").substring(0, 12), {
      x: colX[1],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText(`$${(b.total_price || 0).toFixed(2)}`, {
      x: colX[2],
      y: y - 12,
      size: 9,
      font: boldFont,
      color: primaryColor,
    });
    page.drawText(b.appointment_date || "N/A", {
      x: colX[3],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText(payment, {
      x: colX[4],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });
    page.drawText(b.status || "N/A", {
      x: colX[5],
      y: y - 12,
      size: 9,
      font,
      color: textColor,
    });

    y -= rowHeight;
  });

  // --- Footer (each page) ---
  const pageCount = pdfDoc.getPageCount();
  for (let i = 0; i < pageCount; i++) {
    const p = pdfDoc.getPage(i);
    p.drawText(`Revenue Report - Confidential`, {
      x: margin,
      y: 30,
      size: 9,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });
    p.drawText(`Page ${i + 1} of ${pageCount} | Generated on ${reportDate}`, {
      x: 400,
      y: 30,
      size: 9,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Response(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="revenue-report.pdf"',
    },
  });
}
