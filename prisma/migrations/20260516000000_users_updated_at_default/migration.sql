-- Fix: handle_new_user trigger does not set updated_at, but the column is
-- NOT NULL with no default → every Supabase signup returned 500 with:
--   "null value in column \"updated_at\" of relation \"users\""
--
-- Applying the same default as created_at (now()) so any insert path
-- (trigger, direct INSERT) gets a sane value.

ALTER TABLE "public"."users"
  ALTER COLUMN "updated_at" SET DEFAULT now();
