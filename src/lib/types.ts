export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  subscription_tier: "free" | "pro";
  stripe_customer_id: string | null;
  booking_page_title: string | null;
  booking_page_description: string | null;
  created_at: string;
}

export interface EventType {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  color: string;
  is_active: boolean;
  max_bookings_per_day: number | null;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  location_type: "video" | "phone" | "inperson";
  location_value: string | null;
  created_at: string;
  profile?: Pick<Profile, "id" | "username" | "display_name" | "avatar_url" | "bio" | "timezone" | "booking_page_title" | "booking_page_description">;
}

export interface Availability {
  id: string;
  user_id: string;
  day_of_week: number; // 0=Sun, 6=Sat
  start_time: string; // HH:mm:ss
  end_time: string;
  is_available: boolean;
}

export interface BlockedDate {
  id: string;
  user_id: string;
  blocked_date: string;
  reason: string | null;
}

export interface Booking {
  id: string;
  event_type_id: string;
  attendee_name: string;
  attendee_email: string;
  attendee_phone: string | null;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled";
  stripe_payment_intent_id: string | null;
  amount_paid: number;
  currency: string;
  notes: string | null;
  meeting_link: string | null;
  created_at: string;
  event_types?: EventType;
}

export interface Subscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string | null;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
  created_at: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
}
