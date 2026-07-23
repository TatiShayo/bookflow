import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BookFlow — Smart Scheduling with Built-in Payments",
  description: "Book meetings. Collect payments. Done.",
  openGraph: {
    title: "BookFlow — Smart Scheduling with Built-in Payments",
    description: "Booking pages with Stripe payments built in. Share your link, get booked, get paid.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={0}>
          {children}
        </TooltipProvider>
        <Toaster richColors theme="dark" />
      </body>
    </html>
  );
}
