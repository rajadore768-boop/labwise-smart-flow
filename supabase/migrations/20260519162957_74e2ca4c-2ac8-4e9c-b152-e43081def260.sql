
-- Roles
create type public.app_role as enum ('admin', 'faculty');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

-- Domain tables
create table public.labs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  capacity integer not null check (capacity > 0),
  floor integer not null default 0,
  systems integer not null default 0,
  status text not null default 'available',
  ac boolean not null default false,
  lab_type text not null default 'Computer',
  created_at timestamptz not null default now()
);
alter table public.labs enable row level security;

create table public.sections (
  id uuid primary key default gen_random_uuid(),
  section_name text not null,
  department text not null,
  semester integer not null,
  student_count integer not null check (student_count > 0),
  created_at timestamptz not null default now()
);
alter table public.sections enable row level security;

create table public.allocations (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  lab_id uuid not null references public.labs(id) on delete cascade,
  date date not null,
  time_slot text not null,
  unused_seats integer not null default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.allocations enable row level security;
create index allocations_lab_date_slot_idx on public.allocations(lab_id, date, time_slot);

-- RLS policies
create policy "Anyone authenticated can view profiles" on public.profiles
  for select to authenticated using (true);
create policy "Users update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "Users see own roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles
  for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Auth can view labs" on public.labs for select to authenticated using (true);
create policy "Admins manage labs" on public.labs for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Auth can view sections" on public.sections for select to authenticated using (true);
create policy "Admins manage sections" on public.sections for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "Auth can view allocations" on public.allocations for select to authenticated using (true);
create policy "Admins manage allocations" on public.allocations for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default faculty role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'faculty')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
