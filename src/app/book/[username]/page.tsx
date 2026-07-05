import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, Globe, Zap } from "lucide-react";
import Link from "next/link";
import type { Profile, EventType } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("profiles")
    .select("display_name, booking_page_title, booking_page_description")
    .eq("username", username)
    .single();

  const p = raw as Record<string, unknown> | null;
  const name = (p?.display_name as string) || username;
  const title = ((p?.booking_page_title as string) || `${name}'s Booking Page`) + " | BookFlow";
  const description = (p?.booking_page_description as string) || `Book a session with ${name}. View available services and schedule instantly.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
  };
}

export default async function BookUserPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (!rawProfile) notFound();
  const profile = rawProfile as Record<string, unknown>;

  const { data: rawEvents } = await supabase
    .from("event_types")
    .select("*")
    .eq("user_id", profile.id as string)
    .eq("is_active", true)
    .order("price", { ascending: true });

  const events = (rawEvents || []) as unknown as EventType[];
  const displayName = (profile.display_name as string) || username;
  const bio = profile.bio as string | null;
  const timezone = profile.timezone as string;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-[#141420]">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Profile header */}
        <div className="text-center mb-10">
          <Avatar className="h-20 w-20 mx-auto mb-4 ring-2 ring-primary/30">
            <AvatarImage src={(profile.avatar_url as string) || undefined} alt={displayName} />
            <AvatarFallback className="bg-primary/20 text-primary text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            {displayName}
          </h1>
          {bio && (
            <p className="text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">{bio}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-3">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              <Globe className="h-3.5 w-3.5" />
              {timezone}
            </span>
          </div>
        </div>

        {/* Event types grid */}
        {events.length > 0 ? (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
              Select a service
            </h2>
            <div className="space-y-3">
              {events.map((et) => (
                <Link key={et.id} href={`/book/${username}/${et.slug}`} className="block group">
                  <Card className="relative overflow-hidden hover:border-primary/50 transition-all duration-200 cursor-pointer group-hover:shadow-lg group-hover:shadow-primary/5">
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: et.color }}
                    />
                    <CardContent className="py-4 pl-6 pr-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {et.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {et.duration_minutes} min
                          </span>
                          {et.location_type && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {et.location_type}
                            </span>
                          )}
                        </div>
                        {et.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {et.description}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {et.price > 0 ? (
                          <Badge variant="default" className="text-sm whitespace-nowrap">
                            {et.currency} {et.price}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-sm whitespace-nowrap">
                            Free
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
              <Zap className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Check back soon
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {displayName} hasn&apos;t set up any services yet. Bookmark this page and come back later.
            </p>
          </div>
        )}

        {/* Footer badge */}
        <div className="text-center mt-12 pb-8">
          <p className="text-xs text-muted-foreground/50">
            Powered by{" "}
            <span className="inline-flex items-center gap-1">
              <Zap className="h-3 w-3 text-primary/50" />
              BookFlow
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
