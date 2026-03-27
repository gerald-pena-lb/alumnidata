-- Add agenda column to meeting_summaries
ALTER TABLE meeting_summaries ADD COLUMN IF NOT EXISTS agenda JSONB DEFAULT '[]';
