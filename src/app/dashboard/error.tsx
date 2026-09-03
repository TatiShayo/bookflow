"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="p-8 text-center space-y-4 max-w-md mx-auto">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mx-auto">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-bold">Failed to load dashboard data</h2>
      <p className="text-sm text-muted-foreground">
        We encountered an error loading your events or schedule. Please try refreshing.
      </p>
      <Button onClick={() => reset()} variant="outline">
        Reload Dashboard
      </Button>
    </div>
  );
}
