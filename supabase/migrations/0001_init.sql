-- goszakup-it-radar — initial schema
-- Run this in the Supabase SQL editor (or via the Supabase CLI).

-- ─────────────────────────────────────────────────────────────────────────────
-- lots: shared catalogue of scraped IT lots. Written only by the scraper
-- (service role); read by authenticated dashboard users.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.lots (
  lot_number        text primary key,         -- e.g. "81772929-ЗЦП1"
  announce_number   text,
  announce_name     text,
  lot_name          text not null,
  customer          text,
  amount            numeric,
  quantity          numeric,
  method            text,
  status            text,
  announce_id       bigint,
  lot_id            bigint,
  url               text,
  relevance_score   real not null default 0,
  matched_keywords  text[] not null default '{}',
  first_seen        timestamptz not null default now(),
  last_seen         timestamptz not null default now()
);

create index if not exists lots_relevance_idx on public.lots (relevance_score desc);
create index if not exists lots_last_seen_idx on public.lots (last_seen desc);
create index if not exists lots_status_idx    on public.lots (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- user_lot_state: per-user triage layer (saved / dismissed / notes).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_lot_state (
  user_id     uuid not null references auth.users (id) on delete cascade,
  lot_number  text not null references public.lots (lot_number) on delete cascade,
  saved       boolean not null default false,
  dismissed   boolean not null default false,
  notes       text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, lot_number)
);

-- keep updated_at fresh on change
create extension if not exists moddatetime schema extensions;
drop trigger if exists handle_updated_at on public.user_lot_state;
create trigger handle_updated_at
  before update on public.user_lot_state
  for each row execute procedure extensions.moddatetime (updated_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- scrape_runs: one row per scraper execution, for monitoring.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.scrape_runs (
  id           bigint generated always as identity primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  lots_found   int,
  new_lots     int,
  error        text
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- The scraper uses the service-role key, which bypasses RLS — so we only need
-- read policies for the dashboard and write policies for user_lot_state.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.lots            enable row level security;
alter table public.scrape_runs     enable row level security;
alter table public.user_lot_state  enable row level security;

drop policy if exists "lots: read for authenticated" on public.lots;
create policy "lots: read for authenticated"
  on public.lots for select to authenticated using (true);

drop policy if exists "scrape_runs: read for authenticated" on public.scrape_runs;
create policy "scrape_runs: read for authenticated"
  on public.scrape_runs for select to authenticated using (true);

drop policy if exists "user_lot_state: select own" on public.user_lot_state;
create policy "user_lot_state: select own"
  on public.user_lot_state for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_lot_state: insert own" on public.user_lot_state;
create policy "user_lot_state: insert own"
  on public.user_lot_state for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_lot_state: update own" on public.user_lot_state;
create policy "user_lot_state: update own"
  on public.user_lot_state for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_lot_state: delete own" on public.user_lot_state;
create policy "user_lot_state: delete own"
  on public.user_lot_state for delete to authenticated
  using (auth.uid() = user_id);
