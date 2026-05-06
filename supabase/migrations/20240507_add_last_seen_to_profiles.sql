-- Add last_seen field to profiles for online presence tracking
alter table profiles add column if not exists last_seen timestamptz;
