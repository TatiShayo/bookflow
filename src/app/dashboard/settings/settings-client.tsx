"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  user: { id: string; email: string };
  profile: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    timezone: string;
    booking_page_title: string | null;
    booking_page_description: string | null;
  } | null;
}

export function SettingsClient({ user, profile }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [timezone, setTimezone] = useState(profile?.timezone || "UTC");
  const [bookingTitle, setBookingTitle] = useState(profile?.booking_page_title || "");
  const [bookingDesc, setBookingDesc] = useState(profile?.booking_page_description || "");
  const [saving, setSaving] = useState(false);
  const [newBookingEmail, setNewBookingEmail] = useState(true);
  const [cancelEmail, setCancelEmail] = useState(true);

  async function handleSaveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        username: username || null,
        bio: bio || null,
        timezone,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated!");
      router.refresh();
    }
  }

  async function handleSaveBookingPage() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        booking_page_title: bookingTitle || null,
        booking_page_description: bookingDesc || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Booking page updated!");
      router.refresh();
    }
  }

  const timezones = Intl.supportedValuesOf?.("timeZone") || ["UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Asia/Kolkata", "Australia/Sydney"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="booking">Booking Page</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {(displayName || user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Free plan</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username (for booking link)</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="your-name"
                />
                {username && (
                  <p className="text-xs text-muted-foreground">
                    /book/{username}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people about yourself..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bookingTitle">Page Title (optional)</Label>
                <Input
                  id="bookingTitle"
                  value={bookingTitle}
                  onChange={(e) => setBookingTitle(e.target.value)}
                  placeholder={displayName || "My Booking Page"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bookingDesc">Page Description (optional)</Label>
                <Textarea
                  id="bookingDesc"
                  value={bookingDesc}
                  onChange={(e) => setBookingDesc(e.target.value)}
                  placeholder="Welcome to my booking page..."
                  rows={3}
                />
              </div>
              <Button onClick={handleSaveBookingPage} disabled={saving}>
                {saving ? "Saving..." : "Save Page Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">New booking email</p>
                  <p className="text-xs text-muted-foreground">Receive an email when someone books.</p>
                </div>
                <Switch checked={newBookingEmail} onCheckedChange={setNewBookingEmail} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Cancellation email</p>
                  <p className="text-xs text-muted-foreground">Receive an email when a booking is cancelled.</p>
                </div>
                <Switch checked={cancelEmail} onCheckedChange={setCancelEmail} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
