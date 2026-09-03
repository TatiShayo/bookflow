"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global crash error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f1117] text-white flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold">Critical Application Error</h2>
          <p className="text-sm text-gray-400">
            A critical error occurred while rendering the page.
          </p>
          <Button onClick={() => reset()} variant="outline">
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
