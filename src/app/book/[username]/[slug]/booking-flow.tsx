"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useMemo, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, isBefore, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight, ArrowLeft, Clock, MapPin, DollarSign, Check, Globe, Calendar as CalendarIcon } from "lucide-react";
import { generateSlots, formatTime } from "@/lib/slots";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { EventType, Availability, Booking } from "@/lib/types";

interface Props {
  eventType: EventType;
  profile: {
    display_name: string;
    avatar_url: string | null;
    timezone: string;
    bio: string | null;
    username: string;
  };
  availability: Availability[];
  existingBookings: Booking[];
  blockedDates: Set<string>;
}

type Step = "date" | "time" | "details" | "payment" | "done";

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
const stripePromise = typeof window !== "undefined" && STRIPE_KEY ? loadStripe(STRIPE_KEY) : null;

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function BookingFlow({ eventType, profile, availability, existingBookings, blockedDates }: Props) {
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const localTimezone = useMemo(() => getLocalTimezone(), []);

  // Calendar
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateSlots(selectedDate, availability, existingBookings, eventType);
  }, [selectedDate, availability, existingBookings, eventType]);

  const isDateAvailable = useCallback((date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    if (blockedDates.has(dateStr)) return false;
    if (isBefore(date, startOfDay(new Date()))) return false;
    const dayOfWeek = getDay(date);
    const dayAvail = availability.filter((a) => a.day_of_week === dayOfWeek && a.is_available);
    return dayAvail.length > 0;
  }, [blockedDates, availability]);

  function handleDateSelect(date: Date) {
    if (!isDateAvailable(date)) return;
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep("time");
  }

  function handleSlotSelect(slot: { start: Date; end: Date }) {
    setSelectedSlot(slot);
    setStep("details");
  }

  function validateDetails(): boolean {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = "Required";
    if (!lastName.trim()) errors.lastName = "Required";
    if (!email.trim()) {
      errors.email = "Required";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Enter a valid email";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function formatSlotLocal(slotStart: Date, slotEnd: Date): string {
    try {
      const tz = localTimezone;
      const fmtStart = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
      });
      const fmtEnd = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz,
        timeZoneName: "short",
      });
      return `${fmtStart.format(slotStart)} - ${fmtEnd.format(slotEnd)}`;
    } catch {
      return formatTime(slotStart);
    }
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    if (!validateDetails()) return;

    const attendeeName = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (eventType.price > 0) {
      setLoading(true);
      const res = await fetch("/api/bookings/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTypeId: eventType.id,
          amount: eventType.price,
          currency: eventType.currency,
          attendeeEmail: email.trim(),
          attendeeName,
          startTime: selectedSlot.start.toISOString(),
          endTime: selectedSlot.end.toISOString(),
          attendeePhone: phone.trim(),
          notes: notes.trim(),
        }),
      });
      const json = await res.json();
      setLoading(false);

      if (json.error) {
        toast.error(json.error);
        return;
      }
      setClientSecret(json.clientSecret);
      setStep("payment");
    } else {
      await createBooking(attendeeName);
    }
  }

  async function createBooking(attendeeName: string, paymentIntentId?: string) {
    setLoading(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventTypeId: eventType.id,
        attendeeName,
        attendeeEmail: email.trim(),
        attendeePhone: phone.trim() || null,
        startTime: selectedSlot!.start.toISOString(),
        endTime: selectedSlot!.end.toISOString(),
        notes: notes.trim() || null,
        stripePaymentIntentId: paymentIntentId || null,
        amountPaid: eventType.price,
        currency: eventType.currency,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (json.error) {
      toast.error(json.error);
      return false;
    }

    setBookingId(json.booking.id);
    setStep("done");
    return true;
  }

  const googleCalUrl = useMemo(() => {
    if (!selectedSlot) return "#";
    const start = selectedSlot.start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end = selectedSlot.end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventType.title)}&dates=${start}/${end}&details=${encodeURIComponent(`Booking with ${profile.display_name || profile.username}\n\n${eventType.description || ""}`)}`;
  }, [selectedSlot, eventType, profile]);

  function generateICS(): string {
    if (!selectedSlot) return "";
    const start = selectedSlot.start.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const end = selectedSlot.end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    return `data:text/calendar;charset=utf-8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0ADTSTART:${start}%0ADTEND:${end}%0ASUMMARY:${encodeURIComponent(eventType.title)}%0ADESCRIPTION:${encodeURIComponent(eventType.description || "")}%0AEND:VEVENT%0AEND:VCALENDAR`;
  }

  const initials = (profile.display_name || profile.username)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#141420]">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <Avatar className="h-10 w-10 ring-1 ring-primary/20 shrink-0">
            <AvatarImage src={profile.avatar_url || undefined} alt={profile.display_name || profile.username} />
            <AvatarFallback className="bg-primary/20 text-primary text-sm">
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground truncate">{profile.display_name || profile.username}</p>
            <h1 className="text-base sm:text-lg font-semibold text-foreground line-clamp-1">{eventType.title}</h1>
          </div>
        </div>

        {/* Event info card */}
        <Card className="mb-6 sm:mb-8 bg-card/50">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Clock className="h-4 w-4 shrink-0" /> {eventType.duration_minutes} min
            </div>
            {eventType.location_type && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 shrink-0" /> {eventType.location_type}
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Globe className="h-4 w-4 shrink-0" />
              Displaying times in {localTimezone.replace(/_/g, " ")}
            </div>
            {eventType.price > 0 && (
              <div className="flex items-center gap-2 text-primary text-sm font-medium">
                <DollarSign className="h-4 w-4 shrink-0" />
                {eventType.currency} {eventType.price}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back button */}
        {step !== "date" && step !== "done" && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2"
            onClick={() => {
              if (step === "time") { setStep("date"); setSelectedSlot(null); }
              else if (step === "details") setStep("time");
              else if (step === "payment") setStep("details");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}

        {/* Step 1: Date Picker */}
        {step === "date" && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select a date</h2>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-medium text-sm sm:text-base">{format(currentMonth, "MMMM yyyy")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="text-[10px] sm:text-xs text-muted-foreground py-1">{d}</div>
                  ))}
                  {/* Empty cells for start of month */}
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {days.map((day) => {
                    const available = isDateAvailable(day);
                    const today = isToday(day);
                    const selected = selectedDate && format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                    return (
                      <button
                        key={day.toISOString()}
                        className={cn(
                          "aspect-square flex items-center justify-center text-xs sm:text-sm rounded-lg transition-colors",
                          available
                            ? "hover:bg-primary/10 hover:text-primary cursor-pointer"
                            : "text-muted-foreground/30 cursor-default",
                          today && "ring-1 ring-primary/50",
                          selected && "bg-primary/15 text-primary font-medium",
                          !available && selected && "bg-transparent"
                        )}
                        onClick={() => handleDateSelect(day)}
                        disabled={!available}
                        type="button"
                        aria-label={format(day, "EEEE, MMMM d")}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Time slots */}
        {step === "time" && selectedDate && (
          <div>
            <h2 className="text-lg font-semibold mb-1">
              {format(selectedDate, "EEEE, MMMM d")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Select a time</p>
            <Card>
              <CardContent className="p-4 sm:p-6">
                {availableSlots.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground">No available times for this date.</p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      onClick={() => setStep("date")}
                    >
                      Try another date
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot, i) => {
                      const isSelected = selectedSlot?.start.getTime() === slot.start.getTime();
                      return (
                        <button
                          key={i}
                          className={cn(
                            "px-3 sm:px-4 py-2 rounded-lg border text-sm transition-all",
                            "hover:border-primary hover:text-primary",
                            isSelected
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border"
                          )}
                          onClick={() => handleSlotSelect(slot)}
                          type="button"
                        >
                          {formatSlotLocal(slot.start, slot.end)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Details */}
        {step === "details" && selectedSlot && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Your details</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {format(selectedDate!, "EEEE, MMMM d")} at {formatSlotLocal(selectedSlot.start, selectedSlot.end)}
            </p>
            <form onSubmit={handleDetailsSubmit} noValidate>
              <Card>
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName">First name *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setFormErrors((p) => ({ ...p, firstName: "" })); }}
                        autoFocus
                      />
                      {formErrors.firstName && (
                        <p className="text-xs text-destructive">{formErrors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName">Last name *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); setFormErrors((p) => ({ ...p, lastName: "" })); }}
                      />
                      {formErrors.lastName && (
                        <p className="text-xs text-destructive">{formErrors.lastName}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setFormErrors((p) => ({ ...p, email: "" })); }}
                    />
                    {formErrors.email && (
                      <p className="text-xs text-destructive">{formErrors.email}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 555-0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">Notes <span className="text-muted-foreground">(optional)</span></Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special requests..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : eventType.price > 0 ? (
                      `Continue to Payment — ${eventType.currency} ${eventType.price}`
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </div>
        )}

        {/* Step 4: Payment */}
        {step === "payment" && clientSecret && stripePromise && (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <PaymentStep
              amount={eventType.price}
              currency={eventType.currency}
              eventTypeTitle={eventType.title}
              onSuccess={(paymentIntentId) => createBooking(`${firstName.trim()} ${lastName.trim()}`, paymentIntentId)}
              onBack={() => setStep("details")}
            />
          </Elements>
        )}

        {/* Step 5: Confirmation */}
        {step === "done" && selectedSlot && selectedDate && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-6">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;re booked! 🎉</h2>
            <p className="text-muted-foreground mb-6">
              {format(selectedDate, "EEEE, MMMM d, yyyy")} at {formatSlotLocal(selectedSlot.start, selectedSlot.end)}
            </p>

            {/* CSS Confetti */}
            <div className="relative mb-8 h-10 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute bottom-0 animate-[confetti_3s_ease-out_infinite]"
                  style={{
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 3}s`,
                    color: ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#ec4899"][i % 6],
                    fontSize: `${8 + Math.random() * 8}px`,
                  }}
                >
                  ●
                </span>
              ))}
            </div>

            <Card className="mb-6 text-left mx-auto max-w-sm">
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium">{eventType.title}</p>
                <p className="text-sm text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5 inline mr-1" />
                  {format(selectedDate, "EEEE, MMMM d, yyyy")} at {formatSlotLocal(selectedSlot.start, selectedSlot.end)}
                </p>
                <p className="text-sm text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  {eventType.duration_minutes} min
                </p>
                {eventType.price > 0 && (
                  <p className="text-sm font-medium text-emerald-400">
                    Paid {eventType.currency} {eventType.price}
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2 justify-center">
              <a href={googleCalUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-1" /> Google Calendar
                </Button>
              </a>
              <a href={generateICS()} download={`${eventType.title.replace(/\s+/g, "-")}.ics`}>
                <Button variant="outline" size="sm">
                  <CalendarIcon className="h-4 w-4 mr-1" /> Apple / Outlook
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentStep({
  amount,
  currency,
  eventTypeTitle,
  onSuccess,
  onBack,
}: {
  amount: number;
  currency: string;
  eventTypeTitle: string;
  onSuccess: (paymentIntentId: string) => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError("");

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {},
    });

    setProcessing(false);

    if (result.error) {
      setError(result.error.message || "Payment failed. Please try again.");
    } else if (result.paymentIntent) {
      onSuccess(result.paymentIntent.id);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Payment</h2>
      <p className="text-sm text-muted-foreground mb-4">
        {eventTypeTitle} — {currency} {amount}
      </p>
      <Card>
        <CardContent className="p-4 sm:p-6 space-y-4">
          <PaymentElement />
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} type="button" className="shrink-0">
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!stripe || processing}
              onClick={handlePayment}
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                `Pay ${currency} ${amount}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
