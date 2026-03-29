-- Update status values: alive/deceased → active/inactive/immortal
-- Run this in Supabase SQL Editor

-- First update existing data
UPDATE members SET status = 'active' WHERE status = 'alive';
UPDATE members SET status = 'inactive' WHERE status = 'deceased';

-- Drop old constraint and add new one
DO $$ BEGIN
  ALTER TABLE members DROP CONSTRAINT IF EXISTS members_status_check;
  ALTER TABLE members ADD CONSTRAINT members_status_check CHECK (status IN ('active', 'inactive', 'immortal'));
EXCEPTION WHEN others THEN NULL;
END $$;
