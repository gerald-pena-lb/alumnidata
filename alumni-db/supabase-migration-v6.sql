-- Add membership duration fields
ALTER TABLE members ADD COLUMN IF NOT EXISTS active_start_date TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS active_end_date TEXT;
