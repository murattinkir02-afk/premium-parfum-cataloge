-- Anonymous catalog visit analytics. No IP address, user agent, name, email, or phone is stored.
create table if not exists public.catalog_analytics_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null,
  event_type text not null check (event_type in ('page_view', 'product_view')),
  product_id uuid references public.products(id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint catalog_analytics_product_event_check
    check ((event_type = 'product_view' and product_id is not null) or event_type = 'page_view')
);

create index if not exists catalog_analytics_events_occurred_at_idx
  on public.catalog_analytics_events (occurred_at desc);
create index if not exists catalog_analytics_events_visitor_time_idx
  on public.catalog_analytics_events (visitor_id, occurred_at desc);
create index if not exists catalog_analytics_events_product_idx
  on public.catalog_analytics_events (product_id, occurred_at desc)
  where event_type = 'product_view';

alter table public.catalog_analytics_events enable row level security;
revoke all on public.catalog_analytics_events from public, anon, authenticated;

create or replace function public.record_catalog_event(
  p_visitor_id uuid,
  p_event_type text,
  p_product_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and public.is_catalog_admin() then
    return;
  end if;
  if p_visitor_id is null or p_event_type not in ('page_view', 'product_view') then
    return;
  end if;
  if p_event_type = 'product_view' then
    insert into public.catalog_analytics_events(visitor_id, event_type, product_id)
    select p_visitor_id, p_event_type, p.id
      from public.products p
     where p.id = p_product_id and p.published = true;
  else
    insert into public.catalog_analytics_events(visitor_id, event_type)
    values (p_visitor_id, p_event_type);
  end if;
end;
$$;

create or replace function public.get_catalog_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if not public.is_catalog_admin() then
    raise exception 'Administrator access required';
  end if;

  select jsonb_build_object(
    'today_unique', (
      select count(distinct visitor_id)
        from public.catalog_analytics_events
       where occurred_at >= date_trunc('day', now())
    ),
    'total_visits', (
      select count(*) from public.catalog_analytics_events
    ),
    'last_7_days', (
      select count(*) from public.catalog_analytics_events
       where occurred_at >= now() - interval '7 days'
    ),
    'last_30_days', (
      select count(*) from public.catalog_analytics_events
       where occurred_at >= now() - interval '30 days'
    ),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day::text, 'visits', d.visits) order by d.day)
      from (
        select days.day::date as day, count(e.id)::integer as visits
          from generate_series(current_date - 29, current_date, interval '1 day') as days(day)
          left join public.catalog_analytics_events e
            on e.occurred_at >= days.day
           and e.occurred_at < days.day + interval '1 day'
         group by days.day
      ) d
    ), '[]'::jsonb),
    'top_products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_id', ranked.id, 'name', ranked.name, 'brand', ranked.brand, 'views', ranked.views
      ) order by ranked.views desc, ranked.name)
      from (
        select p.id, p.name, p.brand, count(e.id)::integer as views
          from public.catalog_analytics_events e
          join public.products p on p.id = e.product_id and p.published = true
         where e.event_type = 'product_view'
         group by p.id, p.name, p.brand
         order by count(e.id) desc, p.name
         limit 10
      ) ranked
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.record_catalog_event(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.record_catalog_event(uuid, text, uuid) to anon, authenticated;
revoke all on function public.get_catalog_analytics() from public, anon, authenticated;
grant execute on function public.get_catalog_analytics() to authenticated;
