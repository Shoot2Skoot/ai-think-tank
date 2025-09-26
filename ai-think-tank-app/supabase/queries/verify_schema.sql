-- Verify the current database schema is correct after our migrations

-- 1. Check if personas table has the correct structure (should NOT have conversation_id)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'personas'
ORDER BY ordinal_position;

-- 2. Check if conversation_personas junction table exists and has correct structure
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversation_personas'
ORDER BY ordinal_position;

-- 3. List all tables in the public schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_type, table_name;

-- 4. Check constraints on personas table
SELECT
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'personas';

-- 5. Check foreign key relationships for conversation_personas
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'conversation_personas'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 6. Verify personas doesn't have conversation_id column
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'personas'
    AND column_name = 'conversation_id'
) AS has_conversation_id_column;

-- Should return FALSE if migrations ran correctly