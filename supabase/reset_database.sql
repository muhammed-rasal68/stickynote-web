-- Full wipe of every Sticky Note row in Supabase:
-- workspaces (connections), devices, pairing codes, notes, and todos
-- (todos are the jsonb column inside notes).
--
-- Run in the Supabase SQL Editor as the project owner.
-- This cannot be undone.

truncate table public.workspaces cascade;
