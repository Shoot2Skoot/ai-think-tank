-- Add policy to allow users to update messages in their own conversations
-- This is needed for features like pinning messages, editing, etc.

CREATE POLICY "Users can update messages in own conversations" ON messages
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Also add a policy specifically for editing own messages
CREATE POLICY "Users can edit own messages" ON messages
  FOR UPDATE USING (
    user_id = auth.uid()
  )
  WITH CHECK (
    user_id = auth.uid()
  );