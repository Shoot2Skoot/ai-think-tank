-- Add avatar and color columns to personas table
ALTER TABLE personas
ADD COLUMN IF NOT EXISTS avatar TEXT,
ADD COLUMN IF NOT EXISTS color TEXT;

-- Add default values for existing rows
UPDATE personas
SET avatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || name
WHERE avatar IS NULL;

UPDATE personas
SET color = '#6366f1'
WHERE color IS NULL;