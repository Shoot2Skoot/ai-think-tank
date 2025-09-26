# Edge Functions Testing Guide

## Quick Start

### 1. Setup Environment Variables

Copy `.env.test.example` to `.env.test` and fill in your values:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your actual values:
- `SUPABASE_URL`: Already set to your project URL
- `SUPABASE_ANON_KEY`: Get from Supabase Dashboard → Settings → API → anon/public key

### 2. Get Test Data IDs (Optional but Recommended)

Run these SQL queries in your Supabase Dashboard (SQL Editor):

```sql
-- Get your user ID
SELECT id, email FROM auth.users LIMIT 1;

-- Get persona IDs (pick 2-3 for testing)
SELECT id, display_name, provider, model
FROM personas
WHERE is_global = true OR user_id IS NOT NULL
LIMIT 5;

-- Get or create a test conversation
SELECT id, title FROM conversations LIMIT 1;

-- Or create a test conversation:
INSERT INTO conversations (user_id, title)
VALUES ('YOUR_USER_ID', 'Edge Function Test Conversation')
RETURNING id;
```

Add these IDs to your `.env.test` file.

### 3. Run the Test Suite

```bash
node test-edge-functions.js
```

## Test Coverage

The automated test suite covers:

### 1. **Calculate Costs Function**
- ✅ Get all model pricing information
- ✅ Calculate actual costs from token usage
- ✅ Estimate costs from messages
- ✅ Get user budget information (requires USER_ID)

### 2. **Cache Management Function**
- ✅ Set cache entries with TTL
- ✅ Retrieve cached data
- ✅ Get cache statistics
- ✅ Delete cache entries

### 3. **Determine Next Speaker Function**
- ✅ Random speaker selection
- ✅ Round-robin speaker selection
- ✅ Intelligent AI-based selection (requires valid IDs)

### 4. **Generate Message Function**
- ✅ Generate AI responses (requires all IDs)
- ✅ Token usage tracking
- ✅ Cost calculation

## Manual Testing

### Test Streaming Response

Streaming requires a different approach. Use this curl command:

```bash
curl -N -X POST https://efawfnidriiiiwzxadbx.supabase.co/functions/v1/generate-message \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "personaId": "YOUR_PERSONA_ID",
    "conversationId": "YOUR_CONVERSATION_ID",
    "userId": "YOUR_USER_ID",
    "messages": [
      {"role": "user", "content": "Tell me a short story"}
    ],
    "stream": true
  }'
```

The `-N` flag disables buffering to see the stream in real-time.

### Test with Different Providers

Test each AI provider by using personas with different providers:

```javascript
// In your test, use personas with different providers
const providers = ['openai', 'anthropic', 'gemini'];
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your SUPABASE_ANON_KEY is correct
2. **404 Persona not found**: Ensure the persona ID exists in the database
3. **429 Budget exceeded**: Check user budget limits in user_budgets table
4. **500 API key errors**: Ensure Edge Function secrets are configured

### Check Function Logs

View real-time logs in Supabase Dashboard:
1. Go to Edge Functions
2. Click on the function name
3. View "Logs" tab

### Verify Edge Function Secrets

Ensure these are set in your Supabase project:

```bash
npx supabase secrets list
```

Required secrets:
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

Set them if missing:
```bash
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set GEMINI_API_KEY=AI...
```

## Expected Output

A successful test run should show:

```
🚀 Starting Edge Functions Test Suite
=====================================
Supabase URL: https://efawfnidriiiiwzxadbx.supabase.co
User ID: abc123...
Persona ID: def456...
Conversation ID: ghi789...

🔍 TEST GROUP 1: Calculate Costs Function
=========================================
📝 Testing: Get all model pricing information
   ✅ Success (200): { pricingInfo: {...} }

[... more tests ...]

📊 TEST SUMMARY
================
Total Tests: 12
✅ Passed: 12
❌ Failed: 0
Success Rate: 100%

🎉 All tests passed successfully!
```

## Next Steps

After successful testing:

1. **Monitor Performance**: Check Edge Function metrics in Supabase Dashboard
2. **Set Up Monitoring**: Configure alerts for errors or high latency
3. **Test at Scale**: Run load tests with multiple concurrent requests
4. **Integrate with Frontend**: Update your app to use the new Edge Functions
5. **Configure Rate Limiting**: Add rate limiting if needed for production