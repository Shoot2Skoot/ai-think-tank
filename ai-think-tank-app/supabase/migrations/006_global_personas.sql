-- Add support for global personas that are available to all users
-- These personas don't require a conversation_id and serve as defaults

-- Add is_global column to persona_templates to mark globally available personas
ALTER TABLE persona_templates
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

-- Add color column for UI consistency
ALTER TABLE persona_templates
ADD COLUMN IF NOT EXISTS color TEXT;

-- Ensure avatar_url column exists (rename from avatar_url if needed)
ALTER TABLE persona_templates
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add index for better performance when querying global personas
CREATE INDEX IF NOT EXISTS idx_persona_templates_is_global
ON persona_templates(is_global)
WHERE is_global = true;

-- Update existing templates to be global by default
UPDATE persona_templates
SET is_global = true
WHERE is_global IS NULL;

-- Add comment to clarify the purpose
COMMENT ON COLUMN persona_templates.is_global IS 'Indicates if this persona is globally available to all users';
COMMENT ON COLUMN persona_templates.color IS 'UI color for the persona avatar/card';
COMMENT ON COLUMN persona_templates.avatar_url IS 'URL or path to the persona avatar image';