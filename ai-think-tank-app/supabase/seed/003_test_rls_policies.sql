-- Test script to verify Row Level Security (RLS) policies are working correctly
-- Run this after creating tables and before adding real data

-- Step 1: Check if RLS is enabled on all necessary tables
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_preferences',
    'user_api_keys',
    'conversations',
    'personas',
    'messages',
    'cost_records',
    'hourly_costs',
    'user_budgets',
    'budget_alerts'
  )
ORDER BY tablename;

-- Expected: All tables should have rowsecurity = true

-- Step 2: Check RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected: Should see multiple policies for each table

-- Step 3: Test user isolation (requires authenticated user)
-- This would be run after a user is authenticated
-- Example test queries that should only return user's own data:

-- Test conversations access
-- Should only see conversations where user_id matches authenticated user
-- SELECT * FROM conversations;

-- Test messages access
-- Should only see messages from user's own conversations
-- SELECT * FROM messages;

-- Test cost records access
-- Should only see cost records for authenticated user
-- SELECT * FROM cost_records;

-- Step 4: Verify public tables are accessible
-- These tables should be readable by all authenticated users
SELECT COUNT(*) as persona_template_count FROM persona_templates;
SELECT COUNT(*) as conversation_template_count FROM conversation_templates;

-- Expected: Should return counts without error

-- Step 5: Test that platform_api_keys is NOT accessible to regular users
-- This should fail with permission denied for non-admin users
-- SELECT * FROM platform_api_keys;

-- Step 6: Verify indexes are created for performance
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected: Should see multiple indexes for foreign keys and commonly queried fields

-- Step 7: Check triggers are working
SELECT
  trigger_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;

-- Expected: Should see update_updated_at triggers

-- Step 8: Test helper - Create a test user and verify isolation
-- This would be done through your application's auth flow
-- but here's how you could test it manually:

/*
-- Create test users (would normally be done through Supabase Auth)
-- This is pseudo-code for testing concept:

1. Create User A through Supabase Auth
2. Create User B through Supabase Auth

3. As User A:
   - Create a conversation
   - Add messages
   - Verify you can see your conversation

4. As User B:
   - Try to query User A's conversation (should return empty)
   - Create your own conversation
   - Verify you only see your own data

5. As User A again:
   - Verify you still only see your data, not User B's
*/

-- Step 9: Performance check - Ensure queries use indexes
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM conversations
WHERE user_id = 'some-uuid-here'
ORDER BY created_at DESC
LIMIT 10;

-- Expected: Should show index scan, not sequential scan

-- Step 10: Verify cascade deletes work properly
-- Warning: Only run this on test data!
/*
-- Test cascade delete (careful - destructive!)
-- 1. Create a test conversation with messages
-- 2. Delete the conversation
-- 3. Verify all related messages, personas, cost_records are also deleted

-- Example:
-- DELETE FROM conversations WHERE id = 'test-conversation-id';
-- SELECT * FROM messages WHERE conversation_id = 'test-conversation-id';
-- Expected: No messages should remain
*/

-- Summary Report Query
SELECT
  'RLS Status Check' as check_type,
  COUNT(*) FILTER (WHERE rowsecurity = true) as enabled_count,
  COUNT(*) as total_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE rowsecurity = true) = COUNT(*)
    THEN '✅ All tables have RLS enabled'
    ELSE '❌ Some tables missing RLS'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'user_preferences',
    'user_api_keys',
    'conversations',
    'personas',
    'messages',
    'cost_records',
    'hourly_costs',
    'user_budgets',
    'budget_alerts'
  )
UNION ALL
SELECT
  'Policy Count' as check_type,
  COUNT(*) as enabled_count,
  9 as total_count, -- Expected minimum number of tables with policies
  CASE
    WHEN COUNT(DISTINCT tablename) >= 9
    THEN '✅ Policies exist for all protected tables'
    ELSE '❌ Missing policies on some tables'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT
  'Index Count' as check_type,
  COUNT(*) as enabled_count,
  15 as total_count, -- Expected minimum number of indexes
  CASE
    WHEN COUNT(*) >= 15
    THEN '✅ Performance indexes created'
    ELSE '⚠️ Some indexes may be missing'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname NOT LIKE '%_pkey';