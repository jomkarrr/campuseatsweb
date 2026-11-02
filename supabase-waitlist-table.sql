-- Run this once in Supabase Dashboard -> SQL Editor on the campuseats project.
-- Creates the table the website's /api/waitlist route reads and writes.
-- The route uses the SERVICE ROLE key (server-side only), which bypasses RLS,
-- so no extra policies are needed. Never expose the service role key publicly.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  role text not null check (role in ('student', 'outlet', 'delivery')),
  block_or_outlet text,
  created_at timestamptz not null default now()
);
