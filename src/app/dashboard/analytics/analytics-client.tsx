"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Star, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

interface Props {
  totalBookings: number;
  totalRevenue: number;
  avgValue: number;
  mostPopular: { title: string; color: string; count: number } | null;
  dowData: { day: string; bookings: number }[];
  revData: { month: string; amount: number }[];
}

export function AnalyticsClient({ totalBookings, totalRevenue, avgValue, mostPopular, dowData, revData }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1">Insights into your bookings.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBookings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Booking Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgValue.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Most Popular</CardTitle>
            <Star className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate" style={{ color: mostPopular?.color }}>
              {mostPopular?.title || "—"}
            </div>
            {mostPopular && (
              <p className="text-xs text-muted-foreground mt-1">{mostPopular.count} bookings</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Day of Week</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dowData}>
                <XAxis dataKey="day" fontSize={11} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1c1e2e", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                />
                <Bar dataKey="bookings" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {revData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No revenue data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revData}>
                  <XAxis dataKey="month" fontSize={11} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#1c1e2e", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                    formatter={(value: unknown) => [`$${(value as number).toFixed(2)}`, "Revenue"]}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
