-- Run this in Supabase SQL Editor to add login columns to members table
-- This merges users into members - every brod is now a user

-- Add auth columns to members
ALTER TABLE members ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT 'masig123';
ALTER TABLE members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'brod';

-- Drop the old CHECK if it exists and add new one
-- (Postgres doesn't support IF NOT EXISTS for constraints, so we use DO block)
DO $$ BEGIN
  ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
  ALTER TABLE members ADD CONSTRAINT members_role_check CHECK (role IN ('admin', 'board_member', 'brod'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Seed admin user (Gerald) if no admins exist
INSERT INTO members (full_name, username, password_hash, role, chapter, status)
SELECT 'Gerald Pena', 'gerald', 'ubag1964', 'admin', 'Manila', 'alive'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE role = 'admin');

-- The old users table can be dropped if desired
-- DROP TABLE IF EXISTS users;
