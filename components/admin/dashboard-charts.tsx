"use client";

import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

Chart.register(...registerables);

interface DashboardChartsProps {
  data: {
    revenue: number[];
    expenses: number[];
    userGrowth: number[]; // daily user signups
    bookingGrowth?: number[]; // optional: daily bookings if you add it
    categories: number[];
    categoryLabels: string[];
  };
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const revenueChartRef = useRef<HTMLCanvasElement>(null);
  const bookingChartRef = useRef<HTMLCanvasElement>(null);
  const serviceChartRef = useRef<HTMLCanvasElement>(null);

  const revenueChartInstance = useRef<Chart | null>(null);
  const bookingChartInstance = useRef<Chart | null>(null);
  const serviceChartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    // ✅ Dynamic month labels for last 7 months
    const now = new Date();
    const monthLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
      return d.toLocaleString("default", { month: "short" });
    });

    // 🟦 Revenue vs Expenses (Line Chart)
    if (revenueChartRef.current) {
      const ctx = revenueChartRef.current.getContext("2d");
      if (ctx) {
        if (revenueChartInstance.current)
          revenueChartInstance.current.destroy();

        revenueChartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: monthLabels,
            datasets: [
              {
                label: "Revenue",
                data: data.revenue,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                tension: 0.4,
                fill: true,
              },
              {
                label: "Expenses",
                data: data.expenses,
                borderColor: "rgb(239, 68, 68)",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                tension: 0.4,
                fill: true,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "top" },
              title: { display: false },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (value) {
                    return "₱" + Number(value).toLocaleString();
                  },
                },
              },
            },
          },
        });
      }
    }

    // 🟩 Weekly Booking or User Growth (Bar Chart)
    if (bookingChartRef.current) {
      const ctx = bookingChartRef.current.getContext("2d");
      if (ctx) {
        if (bookingChartInstance.current)
          bookingChartInstance.current.destroy();

        bookingChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            datasets: [
              {
                label: "New Users",
                // ✅ Change to `data.bookingGrowth` if you return that from backend
                data: data.userGrowth,
                backgroundColor: "rgba(34, 197, 94, 0.8)",
                borderColor: "rgb(34, 197, 94)",
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "New Users This Week", // rename if you switch to bookings
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1 },
              },
            },
          },
        });
      }
    }

    // 🟣 Service Distribution (Doughnut Chart)
    if (serviceChartRef.current) {
      const ctx = serviceChartRef.current.getContext("2d");
      if (ctx) {
        if (serviceChartInstance.current)
          serviceChartInstance.current.destroy();

        serviceChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: data.categoryLabels, // ✅ use real names from DB
            datasets: [
              {
                data: data.categories,
                backgroundColor: [
                  "rgba(59, 130, 246, 0.8)",
                  "rgba(34, 197, 94, 0.8)",
                  "rgba(251, 191, 36, 0.8)",
                  "rgba(168, 85, 247, 0.8)",
                  "rgba(156, 163, 175, 0.8)",
                ],
                borderColor: [
                  "rgb(59, 130, 246)",
                  "rgb(34, 197, 94)",
                  "rgb(251, 191, 36)",
                  "rgb(168, 85, 247)",
                  "rgb(156, 163, 175)",
                ],
                borderWidth: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom" },
              title: { display: false },
            },
          },
        });
      }
    }

    // 🧹 Cleanup
    return () => {
      revenueChartInstance.current?.destroy();
      bookingChartInstance.current?.destroy();
      serviceChartInstance.current?.destroy();
    };
  }, [data]);

  return (
    <>
      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Financial Overview */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <canvas ref={revenueChartRef}></canvas>
            </div>
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Service Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <canvas ref={serviceChartRef}></canvas>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Growth */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <canvas ref={bookingChartRef}></canvas>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
