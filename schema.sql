-- Murat Parfum Katalogu: Supabase SQL Editor'de tamamını çalıştırın.
create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default '',
  category_id uuid references public.categories(id) on delete set null,
  description text not null default '',
  notes text not null default '',
  price numeric(12,2),
  image_url text not null default '',
  gender text not null default 'Unisex',
  concentration text not null default 'EDP',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null
);

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

alter table public.admin_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "admins read admin list" on public.admin_users;
create policy "admins read admin list" on public.admin_users for select to authenticated using (public.is_catalog_admin());

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories for all to authenticated using (public.is_catalog_admin()) with check (public.is_catalog_admin());

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select to anon, authenticated using (published = true or public.is_catalog_admin());
drop policy if exists "admins manage products" on public.products;
create policy "admins manage products" on public.products for all to authenticated using (public.is_catalog_admin()) with check (public.is_catalog_admin());

drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage site settings" on public.site_settings;
create policy "admins manage site settings" on public.site_settings for all to authenticated using (public.is_catalog_admin()) with check (public.is_catalog_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-media', 'catalog-media', true, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "public view catalog media" on storage.objects;
create policy "public view catalog media" on storage.objects for select to anon, authenticated using (bucket_id = 'catalog-media');
drop policy if exists "admins upload catalog media" on storage.objects;
create policy "admins upload catalog media" on storage.objects for insert to authenticated with check (bucket_id = 'catalog-media' and public.is_catalog_admin());
drop policy if exists "admins update catalog media" on storage.objects;
create policy "admins update catalog media" on storage.objects for update to authenticated using (bucket_id = 'catalog-media' and public.is_catalog_admin()) with check (bucket_id = 'catalog-media' and public.is_catalog_admin());
drop policy if exists "admins delete catalog media" on storage.objects;
create policy "admins delete catalog media" on storage.objects for delete to authenticated using (bucket_id = 'catalog-media' and public.is_catalog_admin());

insert into public.site_settings(key,value) values
('site_name','"MURAT TINKIR"'::jsonb),
('subtitle','"PARFÜM KOLEKSİYONU"'::jsonb),
('background','"#F4F2ED"'::jsonb),
('surface','"#FFFFFF"'::jsonb),
('text','"#242321"'::jsonb),
('muted','"#77736D"'::jsonb),
('accent','"#B7B0A3"'::jsonb),
('logo_url','""'::jsonb),
('show_prices','true'::jsonb),
('whatsapp','""'::jsonb)
on conflict (key) do nothing;

-- İlk yönetici:
-- 1) Supabase Dashboard > Authentication > Users bölümünden kullanıcı oluşturun.
-- 2) Kullanıcının UUID'sini aşağıdaki sorguya yazıp çalıştırın:
-- insert into public.admin_users(user_id) values ('AUTH_USER_UUID');
