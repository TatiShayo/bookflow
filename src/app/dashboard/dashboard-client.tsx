"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/slots";
import { Calendar, DollarSign, TrendingUp, AlertTriangle, Plus, Copy, BarChart3 } from "lucide-react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface Props {
  username: string;
  todayTotal: number;
  weekRevenue: number;
  monthTotal: number;
  cancelPercent: number;
  upcomingBookings: Array<{
    id: string;
    attendee_name: string;
    attendee_email: string;
    start_time: string;
    amount_paid: number;
    currency: string;
    event_types: { title: string; color: string } | null;
  }>;
  chartData: Array<{ date: string; amount: number }>;
}

export function DashboardClient({ username, todayTotal, weekRevenue, monthTotal, cancelPercent, upcomingBookings, chartData }: Props) {
  const bookingLink = typeof window !== "undefined" ? `${window.location.origin}/book/${username}` : "/book/";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your bookings and revenue.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">bookings today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${weekRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bookings</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancel Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelPercent}%</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/events/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" /> Create Event Type
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            navigator.clipboard.writeText(bookingLink);
            toast.success("Booking link copied!");
          }}
        >
          <Copy className="h-4 w-4 mr-2" /> Copy Booking Link
        </Button>
        <Link href="/dashboard/analytics">
          <Button size="sm" variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" /> View Analytics
          </Button>
        </Link>
      </div>

      {/* Upcoming */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming bookings yet.</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback style={{ backgroundColor: `${b.event_types?.color || "#8b5cf6"}20`, color: b.event_types?.color || "#8b5cf6" }}>
                      {b.attendee_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.attendee_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.event_types?.title || "Meeting"} · {formatDateTime(b.start_time)}
                    </p>
                  </div>
                  <Badge variant={b.amount_paid > 0 ? "default" : "outline"}>
                    {b.amount_paid > 0 ? `Paid $${b.amount_paid}` : "Free"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" fontSize={11} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                <YAxis fontSize={11} tick={{ fill: "#64748b" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#1c1e2e", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(value: unknown) => [`$${(value as number).toFixed(2)}`, "Revenue"]}
                />
                <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
