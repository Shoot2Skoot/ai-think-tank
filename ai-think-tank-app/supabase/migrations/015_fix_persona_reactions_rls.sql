-- Fix RLS policies for persona reactions

-- Drop the existing insert policy that only allows user reactions
DROP POLICY IF EXISTS "Users can add own reactions" ON message_reactions;

-- Create a new insert policy that allows both user and persona reactions
CREATE POLICY "Users can add reactions" ON message_reactions
  FOR INSERT WITH CHECK (
    -- Either adding a user reaction for themselves
    (auth.uid() = user_id AND persona_id IS NULL)
    OR
    -- Or adding a persona reaction (system/AI generated)
    (persona_id IS NOT NULL AND user_id IS NULL)
    -- AND ensuring the message belongs to a conversation the user owns
    AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
        AND c.user_id = auth.uid()
    )
  );

-- Also update the delete policy to handle persona reactions
DROP POLICY IF EXISTS "Users can remove own reactions" ON message_reactions;

CREATE POLICY "Users can remove reactions" ON message_reactions
  FOR DELETE USING (
    -- Can delete their own user reactions
    (auth.uid() = user_id)
    OR
    -- Can delete persona reactions from their conversations
    (persona_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_reactions.message_id
        AND c.user_id = auth.uid()
    ))
  );

-- Grant execute permission on the add_persona_reaction function
GRANT EXECUTE ON FUNCTION add_persona_reaction(UUID, UUID, TEXT) TO authenticated;