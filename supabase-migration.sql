-- Inbora — Phase 1 database schema
-- Paste this into the Supabase SQL editor and click Run.

-- Deal overrides: stores all user-edited fields per thread (status, rate, notes, deliverables, etc.)
create table if not exists deal_overrides (
  id           bigint generated always as identity primary key,
  user_email   text        not null,
  thread_id    text        not null,
  data         jsonb       not null default '{}',
  updated_at   timestamptz not null default now(),
  unique (user_email, thread_id)
);

-- Blocked threads: threads the user has marked "not a brand deal"
create table if not exists blocked_threads (
  id           bigint generated always as identity primary key,
  user_email   text not null,
  dedup_key    text not null,
  unique (user_email, dedup_key)
);

-- Indexes for fast per-user lookups
create index if not exists deal_overrides_user_idx   on deal_overrides (user_email);
create index if not exists blocked_threads_user_idx  on blocked_threads (user_email);
