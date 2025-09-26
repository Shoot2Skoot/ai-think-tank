-- Add pinned field to messages table
ALTER TABLE messages
ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN pinned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient querying of pinned messages
CREATE INDEX idx_messages_pinned ON messages(conversation_id, is_pinned) WHERE is_pinned = TRUE;

-- Add comment for documentation
COMMENT ON COLUMN messages.is_pinned IS 'Whether this message is pinned in the conversation';
COMMENT ON COLUMN messages.pinned_at IS 'Timestamp when the message was pinned';
COMMENT ON COLUMN messages.pinned_by IS 'User who pinned the message';