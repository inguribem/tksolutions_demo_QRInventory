-- ============================================================
-- Extend search_inventory() to also match items.name and
-- items.keywords, not just fields on boxes.
-- ============================================================

create or replace function public.search_inventory(
  search_text text
)
returns table (
  box_id uuid,
  box_code text,
  box_name text,
  description text,
  location_name text,
  category_name text
)
language sql
stable
security invoker
as $$
  select
    b.id,
    b.box_code,
    b.name,
    b.description,
    l.name,
    c.name
  from public.boxes b

  left join public.locations l
    on l.id = b.location_id

  left join public.categories c
    on c.id = b.category_id

  where
    b.user_id = auth.uid()
    and (
      b.name ilike '%' || search_text || '%'
      or b.description ilike '%' || search_text || '%'
      or exists (
        select 1
        from unnest(b.keywords) k
        where k ilike '%' || search_text || '%'
      )
      or exists (
        select 1
        from public.items i
        where i.box_id = b.id
          and i.user_id = auth.uid()
          and (
            i.name ilike '%' || search_text || '%'
            or exists (
              select 1
              from unnest(i.keywords) ik
              where ik ilike '%' || search_text || '%'
            )
          )
      )
    )

  order by b.updated_at desc;
$$;
