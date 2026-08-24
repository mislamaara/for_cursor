-- 膳食本 · Supabase 初始表结构
-- 在 Supabase Dashboard → SQL Editor 里运行，或通过 GitHub 集成自动迁移

create extension if not exists "pgcrypto";

-- ========== 食谱 ==========
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (category in ('bread', 'dessert', 'sauce', 'other')),
  yield_amount numeric not null default 1,
  yield_unit text not null default '份',
  ingredients jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 批次 ==========
create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  made_on date not null,
  yield_amount numeric not null,
  remaining_amount numeric not null,
  yield_unit text not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 饮食 ==========
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  name text not null,
  amount numeric not null,
  unit text not null,
  batch_id uuid references public.batches (id) on delete set null,
  recipe_id uuid references public.recipes (id) on delete set null,
  nutrients jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 运动 ==========
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  name text not null,
  duration_min numeric,
  distance_km numeric,
  kcal numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ========== 照片（文件在 Storage，这里只存路径） ==========
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('day', 'batch', 'recipe')),
  ref_id text not null,
  storage_path text not null,
  mime_type text not null default 'image/jpeg',
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists batches_user_id_idx on public.batches (user_id);
create index if not exists foods_user_date_idx on public.foods (user_id, date);
create index if not exists workouts_user_date_idx on public.workouts (user_id, date);
create index if not exists photos_user_ref_idx on public.photos (user_id, kind, ref_id);

-- ========== RLS：每人只能看自己的数据 ==========
alter table public.recipes enable row level security;
alter table public.batches enable row level security;
alter table public.foods enable row level security;
alter table public.workouts enable row level security;
alter table public.photos enable row level security;

create policy "recipes_own" on public.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "batches_own" on public.batches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "foods_own" on public.foods
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workouts_own" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "photos_own" on public.photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== Storage 桶（照片） ==========
insert into storage.buckets (id, name, public)
values ('kitchen-photos', 'kitchen-photos', false)
on conflict (id) do nothing;

create policy "photo_read_own" on storage.objects
  for select using (
    bucket_id = 'kitchen-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "photo_write_own" on storage.objects
  for insert with check (
    bucket_id = 'kitchen-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "photo_update_own" on storage.objects
  for update using (
    bucket_id = 'kitchen-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "photo_delete_own" on storage.objects
  for delete using (
    bucket_id = 'kitchen-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
