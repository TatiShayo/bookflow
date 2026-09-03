import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto">
          <Zap className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <h2 className="text-xl font-semibold text-foreground mt-2">Page Not Found</h2>
          <p className="text-sm text-muted-foreground mt-2">
            The booking page or resource you are looking for does not exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <Button variant="default">Return Home</Button>
        </Link>
      </div>
    </div>
  );
}
