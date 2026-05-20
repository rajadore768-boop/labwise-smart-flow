
-- requests
create type public.request_type as enum ('lab_change', 'timetable', 'resource');
create type public.request_status as enum ('pending', 'approved', 'rejected');

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references auth.users(id) on delete cascade,
  type public.request_type not null,
  title text not null,
  details text,
  allocation_id uuid references public.allocations(id) on delete set null,
  suggested_lab_id uuid references public.labs(id) on delete set null,
  status public.request_status not null default 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.requests enable row level security;
create policy "Faculty view own requests" on public.requests for select to authenticated
  using (faculty_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Faculty create own requests" on public.requests for insert to authenticated
  with check (faculty_id = auth.uid());
create policy "Admins manage requests" on public.requests for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "Admins delete requests" on public.requests for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- attendance
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  allocation_id uuid not null references public.allocations(id) on delete cascade,
  faculty_id uuid not null references auth.users(id) on delete cascade,
  present_count integer not null default 0,
  total_count integer not null default 0,
  note text,
  created_at timestamptz not null default now()
);
alter table public.attendance enable row level security;
create policy "Faculty view own attendance" on public.attendance for select to authenticated
  using (faculty_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Faculty insert own attendance" on public.attendance for insert to authenticated
  with check (faculty_id = auth.uid());
create policy "Faculty update own attendance" on public.attendance for update to authenticated
  using (faculty_id = auth.uid());

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;
create policy "Users view own notifications" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "Users update own notifications" on public.notifications for update to authenticated
  using (user_id = auth.uid());
create policy "Admins insert notifications" on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(),'admin') or user_id = auth.uid());

-- allocations faculty link
alter table public.allocations add column if not exists faculty_id uuid references auth.users(id) on delete set null;
