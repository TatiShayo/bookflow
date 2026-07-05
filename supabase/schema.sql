-- BookFlow Schema
create extension if not exists "uuid-ossp";

create table profiles (
  id uuid references auth.users primary key,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  timezone text default 'UTC',
  subscription_tier text default 'free',
  stripe_customer_id text,
  booking_page_title text,
  booking_page_description text,
  created_at timestamptz default now()
);

-- Trigger to prevent authenticated users from changing subscription_tier and stripe_customer_id
create or replace function public.preserve_sensitive_profile_columns()
returns trigger as $$
begin
  if (current_setting('role', true) = 'authenticated') then
    new.subscription_tier := old.subscription_tier;
    new.stripe_customer_id := old.stripe_customer_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger preserve_sensitive_profile_columns_trigger
before update on profiles
for each row execute function public.preserve_sensitive_profile_columns();

create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  stripe_subscription_id text unique,
  plan text,
  status text,
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create table event_types (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  duration_minutes int default 60,
  price numeric default 0,
  currency text default 'USD',
  color text default '#8b5cf6',
  is_active boolean default true,
  max_bookings_per_day int,
  buffer_before_minutes int default 0,
  buffer_after_minutes int default 0,
  location_type text default 'video',
  location_value text,
  created_at timestamptz default now(),
  unique(user_id, slug)
);

create table availability (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  day_of_week int not null,
  start_time time not null,
  end_time time not null,
  is_available boolean default true
);

create table blocked_dates (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade,
  blocked_date date not null,
  reason text
);

create table bookings (
  id uuid default uuid_generate_v4() primary key,
  event_type_id uuid references event_types(id) on delete cascade,
  attendee_name text not null,
  attendee_email text not null,
  attendee_phone text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'confirmed',
  stripe_payment_intent_id text unique,
  amount_paid numeric default 0,
  currency text default 'USD',
  notes text,
  meeting_link text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
alter table event_types enable row level security;
alter table availability enable row level security;
alter table blocked_dates enable row level security;
alter table bookings enable row level security;

-- Profiles: owners full access, public can read (for booking page)
create policy "Users own their data select" on profiles for select using (auth.uid() = id);
create policy "Users own their data update" on profiles for update using (auth.uid() = id);
create policy "Public can read profiles" on profiles for select using (true);

-- Event types: owners full access, public can read active
create policy "Users own their data" on event_types for all using (auth.uid() = user_id);
create policy "Public can read active event types" on event_types for select using (is_active = true);

-- Availability: owners full access, public can read (for slot calculation)
create policy "Users own availability" on availability for all using (auth.uid() = user_id);
create policy "Public can read availability" on availability for select using (true);

-- Blocked dates: owners full access, public can read (for slot calculation)
create policy "Users own blocked dates" on blocked_dates for all using (auth.uid() = user_id);
create policy "Public can read blocked dates" on blocked_dates for select using (true);

-- Bookings: owners read, owners update
create policy "Owners manage their bookings" on bookings for update using (
  auth.uid() = (select user_id from event_types where id = event_type_id)
);
create policy "Owners read their bookings" on bookings for select using (
  auth.uid() = (select user_id from event_types where id = event_type_id)
);
