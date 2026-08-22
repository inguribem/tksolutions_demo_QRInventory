-- ============================================================
-- HOME INVENTORY
-- Supabase / PostgreSQL Schema
-- Version 1.0
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "vector";


-- ============================================================
-- 2. ENUM TYPES
-- ============================================================

do $$
begin

  if not exists (
    select 1 from pg_type where typname = 'box_status'
  ) then
    create type public.box_status as enum (
      'stored',
      'partially_empty',
      'borrowed',
      'needs_organization',
      'empty',
      'archived'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'location_type'
  ) then
    create type public.location_type as enum (
      'house',
      'room',
      'closet',
      'shelf',
      'cabinet',
      'drawer',
      'garage',
      'storage',
      'other'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'photo_type'
  ) then
    create type public.photo_type as enum (
      'cover',
      'content',
      'label',
      'location',
      'other'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'ai_status'
  ) then
    create type public.ai_status as enum (
      'pending',
      'processing',
      'completed',
      'failed'
    );
  end if;

end $$;


-- ============================================================
-- 3. PROFILES
-- Extends Supabase auth.users
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 4. LOCATIONS
-- Example:
-- House
--   Closet principal
--      Shelf 2
-- ============================================================

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  location_type public.location_type
    not null default 'other',

  parent_location_id uuid
    references public.locations(id)
    on delete cascade,

  description text,

  sort_order integer default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, name, parent_location_id)
);


-- ============================================================
-- 5. CATEGORIES
-- Example:
-- Decoration
-- Clothing
-- School
-- Toys
-- Tools
-- etc.
-- ============================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),

  user_id uuid
    references auth.users(id)
    on delete cascade,

  name text not null,

  description text,

  icon text,

  color text,

  parent_category_id uuid
    references public.categories(id)
    on delete set null,

  is_system boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 6. BOXES
-- Main inventory table
-- ============================================================

create table if not exists public.boxes (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  -- Human-friendly identifier
  box_code text not null,

  name text not null,

  description text,

  status public.box_status
    not null default 'stored',

  category_id uuid
    references public.categories(id)
    on delete set null,

  location_id uuid
    references public.locations(id)
    on delete set null,

  -- Searchable keywords
  keywords text[] default '{}',

  -- Optional notes
  notes text,

  -- QR destination
  qr_token uuid not null default gen_random_uuid(),

  -- Cover photo
  cover_photo_url text,

  -- AI-related fields
  ai_description text,
  ai_confidence numeric(5,4),
  ai_last_processed_at timestamptz,

  -- Semantic search embedding
  embedding vector(1536),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(user_id, box_code),
  unique(qr_token)
);


-- ============================================================
-- 7. ITEMS
-- Individual objects inside a box
--
-- IMPORTANT:
-- These are optional.
-- We don't need to catalog every single object.
-- ============================================================

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  box_id uuid not null
    references public.boxes(id)
    on delete cascade,

  name text not null,

  description text,

  quantity numeric(10,2) default 1,

  unit text,

  keywords text[] default '{}',

  category_id uuid
    references public.categories(id)
    on delete set null,

  -- AI confidence for automatic identification
  ai_confidence numeric(5,4),

  embedding vector(1536),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- ============================================================
-- 8. PHOTOS
-- Files live in Supabase Storage.
-- This table stores metadata.
-- ============================================================

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  box_id uuid
    references public.boxes(id)
    on delete cascade,

  item_id uuid
    references public.items(id)
    on delete cascade,

  photo_type public.photo_type
    not null default 'content',

  storage_bucket text not null default 'inventory',

  storage_path text not null,

  original_filename text,

  mime_type text,

  file_size bigint,

  width integer,

  height integer,

  caption text,

  sort_order integer default 0,

  created_at timestamptz not null default now(),

  -- A photo must belong to a box OR an item
  constraint photo_parent_check
  check (
    box_id is not null
    or item_id is not null
  )
);


-- ============================================================
-- 9. TAGS
-- ============================================================

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  name text not null,

  created_at timestamptz not null default now(),

  unique(user_id, name)
);


-- ============================================================
-- 10. BOX ↔ TAGS
-- Many-to-many relationship
-- ============================================================

create table if not exists public.box_tags (
  box_id uuid not null
    references public.boxes(id)
    on delete cascade,

  tag_id uuid not null
    references public.tags(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key(box_id, tag_id)
);


-- ============================================================
-- 11. ITEM ↔ TAGS
-- ============================================================

create table if not exists public.item_tags (
  item_id uuid not null
    references public.items(id)
    on delete cascade,

  tag_id uuid not null
    references public.tags(id)
    on delete cascade,

  created_at timestamptz not null default now(),

  primary key(item_id, tag_id)
);


-- ============================================================
-- 12. AI ANALYSIS
-- Keeps a history of AI processing
-- ============================================================

create table if not exists public.ai_analysis (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  box_id uuid
    references public.boxes(id)
    on delete cascade,

  photo_id uuid
    references public.photos(id)
    on delete cascade,

  status public.ai_status
    not null default 'pending',

  model text,

  prompt_version text,

  raw_response jsonb,

  generated_name text,

  generated_description text,

  generated_keywords text[],

  generated_category text,

  confidence numeric(5,4),

  error_message text,

  processing_started_at timestamptz,

  processing_completed_at timestamptz,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 13. BOX HISTORY
-- Tracks changes to boxes
-- ============================================================

create table if not exists public.box_history (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  box_id uuid not null
    references public.boxes(id)
    on delete cascade,

  action text not null,

  changed_fields jsonb,

  previous_data jsonb,

  new_data jsonb,

  created_at timestamptz not null default now()
);


-- ============================================================
-- 14. QR SCANS
-- Optional analytics
-- ============================================================

create table if not exists public.qr_scans (
  id uuid primary key default gen_random_uuid(),

  box_id uuid not null
    references public.boxes(id)
    on delete cascade,

  user_id uuid
    references auth.users(id)
    on delete set null,

  scanned_at timestamptz not null default now(),

  device text,

  user_agent text
);


-- ============================================================
-- 15. INDEXES
-- ============================================================

create index if not exists idx_boxes_user
on public.boxes(user_id);

create index if not exists idx_boxes_category
on public.boxes(category_id);

create index if not exists idx_boxes_location
on public.boxes(location_id);

create index if not exists idx_boxes_status
on public.boxes(status);

create index if not exists idx_boxes_keywords
on public.boxes using gin(keywords);

create index if not exists idx_items_user
on public.items(user_id);

create index if not exists idx_items_box
on public.items(box_id);

create index if not exists idx_items_keywords
on public.items using gin(keywords);

create index if not exists idx_photos_box
on public.photos(box_id);

create index if not exists idx_photos_item
on public.photos(item_id);

create index if not exists idx_tags_user
on public.tags(user_id);

create index if not exists idx_history_box
on public.box_history(box_id);

create index if not exists idx_qr_token
on public.boxes(qr_token);

create index if not exists idx_qr_scans_box
on public.qr_scans(box_id);


-- ============================================================
-- 16. UPDATED_AT FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- 17. UPDATED_AT TRIGGERS
-- ============================================================

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();


drop trigger if exists locations_updated_at on public.locations;

create trigger locations_updated_at
before update on public.locations
for each row
execute function public.set_updated_at();


drop trigger if exists categories_updated_at on public.categories;

create trigger categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();


drop trigger if exists boxes_updated_at on public.boxes;

create trigger boxes_updated_at
before update on public.boxes
for each row
execute function public.set_updated_at();


drop trigger if exists items_updated_at on public.items;

create trigger items_updated_at
before update on public.items
for each row
execute function public.set_updated_at();


-- ============================================================
-- 18. AUTO-CREATE PROFILE
-- When a Supabase Auth user is created
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin

  insert into public.profiles (
    id,
    full_name
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.email
    )
  );

  return new;

end;
$$;


drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ============================================================
-- 19. GENERATE NEXT BOX CODE
--
-- Example:
-- HOME-0001
-- HOME-0002
-- HOME-0003
-- ============================================================

create or replace function public.generate_box_code(
  p_user_id uuid
)
returns text
language plpgsql
security definer
as $$
declare
  next_number integer;
begin

  select coalesce(
    max(
      case
        when box_code ~ '^HOME-[0-9]+$'
        then substring(box_code from 6)::integer
        else 0
      end
    ),
    0
  ) + 1
  into next_number
  from public.boxes
  where user_id = p_user_id;

  return 'HOME-' || lpad(next_number::text, 4, '0');

end;
$$;


-- ============================================================
-- 20. SEARCH FUNCTION
-- Basic keyword/full text search
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
    )

  order by b.updated_at desc;
$$;


-- ============================================================
-- 21. VECTOR SEARCH FUNCTION
-- Uses pgvector embeddings
-- ============================================================

create or replace function public.match_boxes(
  query_embedding vector(1536),
  match_threshold float default 0.70,
  match_count integer default 20
)
returns table (
  id uuid,
  box_code text,
  name text,
  description text,
  similarity float
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
    1 - (b.embedding <=> query_embedding) as similarity
  from public.boxes b
  where
    b.user_id = auth.uid()
    and b.embedding is not null
    and 1 - (b.embedding <=> query_embedding) >= match_threshold
  order by b.embedding <=> query_embedding
  limit match_count;
$$;


-- ============================================================
-- 22. ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.locations enable row level security;
alter table public.categories enable row level security;
alter table public.boxes enable row level security;
alter table public.items enable row level security;
alter table public.photos enable row level security;
alter table public.tags enable row level security;
alter table public.box_tags enable row level security;
alter table public.item_tags enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.box_history enable row level security;
alter table public.qr_scans enable row level security;


-- ============================================================
-- 23. PROFILE POLICIES
-- ============================================================

drop policy if exists "Users can view own profile"
on public.profiles;

create policy "Users can view own profile"
on public.profiles
for select
using (auth.uid() = id);


drop policy if exists "Users can update own profile"
on public.profiles;

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);


-- ============================================================
-- 24. LOCATIONS POLICIES
-- ============================================================

drop policy if exists "Users manage own locations"
on public.locations;

create policy "Users manage own locations"
on public.locations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 25. CATEGORIES POLICIES
-- ============================================================

drop policy if exists "Users manage own categories"
on public.categories;

create policy "Users manage own categories"
on public.categories
for all
using (
  user_id = auth.uid()
  or (user_id is null and is_system = true)
)
with check (
  user_id = auth.uid()
);


-- ============================================================
-- 26. BOXES POLICIES
-- ============================================================

drop policy if exists "Users manage own boxes"
on public.boxes;

create policy "Users manage own boxes"
on public.boxes
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 27. ITEMS POLICIES
-- ============================================================

drop policy if exists "Users manage own items"
on public.items;

create policy "Users manage own items"
on public.items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 28. PHOTOS POLICIES
-- ============================================================

drop policy if exists "Users manage own photos"
on public.photos;

create policy "Users manage own photos"
on public.photos
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 29. TAG POLICIES
-- ============================================================

drop policy if exists "Users manage own tags"
on public.tags;

create policy "Users manage own tags"
on public.tags
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 30. BOX TAG POLICIES
-- ============================================================

drop policy if exists "Users manage own box tags"
on public.box_tags;

create policy "Users manage own box tags"
on public.box_tags
for all
using (
  exists (
    select 1
    from public.boxes b
    where b.id = box_id
      and b.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.boxes b
    where b.id = box_id
      and b.user_id = auth.uid()
  )
);


-- ============================================================
-- 31. ITEM TAG POLICIES
-- ============================================================

drop policy if exists "Users manage own item tags"
on public.item_tags;

create policy "Users manage own item tags"
on public.item_tags
for all
using (
  exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.items i
    where i.id = item_id
      and i.user_id = auth.uid()
  )
);


-- ============================================================
-- 32. AI ANALYSIS POLICIES
-- ============================================================

drop policy if exists "Users manage own AI analysis"
on public.ai_analysis;

create policy "Users manage own AI analysis"
on public.ai_analysis
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- ============================================================
-- 33. HISTORY POLICIES
-- ============================================================

drop policy if exists "Users view own box history"
on public.box_history;

create policy "Users view own box history"
on public.box_history
for select
using (auth.uid() = user_id);


-- ============================================================
-- 34. QR SCAN POLICIES
-- ============================================================

drop policy if exists "Users view own QR scans"
on public.qr_scans;

create policy "Users view own QR scans"
on public.qr_scans
for select
using (auth.uid() = user_id);


-- ============================================================
-- 35. STORAGE BUCKET
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'inventory',
  'inventory',
  false
)
on conflict (id)
do nothing;


-- ============================================================
-- 36. STORAGE POLICIES
-- ============================================================

drop policy if exists "Users can upload inventory photos"
on storage.objects;

create policy "Users can upload inventory photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'inventory'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Users can view inventory photos"
on storage.objects;

create policy "Users can view inventory photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'inventory'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Users can update inventory photos"
on storage.objects;

create policy "Users can update inventory photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'inventory'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'inventory'
  and (storage.foldername(name))[1] = auth.uid()::text
);


drop policy if exists "Users can delete inventory photos"
on storage.objects;

create policy "Users can delete inventory photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'inventory'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- ============================================================
-- 37. DEFAULT CATEGORIES
-- These are global/system categories.
-- ============================================================

insert into public.categories (
  user_id,
  name,
  description,
  icon,
  is_system
)
select
  null,
  category_name,
  category_description,
  category_icon,
  true
from (
  values
    ('Decoración', 'Decoración del hogar y temporadas', '🎄'),
    ('Ropa', 'Ropa y accesorios', '👕'),
    ('Zapatos', 'Zapatos y calzado', '👟'),
    ('Manualidades', 'Materiales para manualidades', '🎨'),
    ('Escuela', 'Material escolar', '📚'),
    ('Juguetes', 'Juguetes y juegos', '🧸'),
    ('Playa', 'Artículos para playa', '🏖️'),
    ('Camping', 'Artículos para camping', '🏕️'),
    ('Herramientas', 'Herramientas y reparación', '🛠️'),
    ('Documentos', 'Documentos y papelería', '🧾'),
    ('Regalos', 'Regalos y artículos para regalar', '🎁'),
    ('Cocina', 'Artículos de cocina', '🍽️'),
    ('Tecnología', 'Tecnología y accesorios', '💻'),
    ('Viajes', 'Artículos relacionados con viajes', '🧳'),
    ('Otros', 'Artículos varios', '📦')
) as categories(
  category_name,
  category_description,
  category_icon
)
where not exists (
  select 1
  from public.categories c
  where c.name = category_name
    and c.is_system = true
);


-- ============================================================
-- 38. COMPLETE
-- ============================================================

-- The database is now ready for:
--
-- 1. Web/PWA application
-- 2. n8n automation
-- 3. OpenAI image analysis
-- 4. QR generation
-- 5. Label generation
-- 6. Semantic search
--
-- ============================================================