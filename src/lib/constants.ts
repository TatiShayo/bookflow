export const SITE_NAME = "BookFlow";
export const SITE_TAGLINE = "Get booked and paid. No extra apps needed.";
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const DURATIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
  { label: "2 hours", value: 120 },
  { label: "3 hours", value: 180 },
];

export const COLORS = [
  { label: "Violet", value: "#8b5cf6" },
  { label: "Sky", value: "#0ea5e9" },
  { label: "Emerald", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Rose", value: "#f43f5e" },
  { label: "Pink", value: "#ec4899" },
];

export const BUFFER_TIMES = [0, 5, 10, 15, 30];

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const FREE_TIER_EVENT_LIMIT = 3;
export const PRO_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || "";

export const CURRENCIES = [
  { label: "USD ($)", value: "USD" },
  { label: "EUR (€)", value: "EUR" },
  { label: "GBP (£)", value: "GBP" },
  { label: "CAD (C$)", value: "CAD" },
  { label: "AUD (A$)", value: "AUD" },
  { label: "INR (₹)", value: "INR" },
];
