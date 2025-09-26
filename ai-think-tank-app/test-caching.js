#!/usr/bin/env node

/**
 * Cache Testing Script
 * Tests the caching implementation for LangChain Edge functions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.test
const envPath = path.join(__dirname, '.env.test');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
  });
} else {
  console.error('❌ .env.test file not found. Please create it first (see .env.test.example)');
  process.exit(1);
}

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const USER_ID = process.env.TEST_USER_ID;
const PERSONA_ID = process.env.TEST_PERSONA_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables in .env.test');
  process.exit(1);
}

const BASE_URL = `${SUPABASE_URL}/functions/v1`;

// Helper function to call Edge functions
async function callEdgeFunction(functionName, payload) {
  const url = `${BASE_URL}/${functionName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { status: 500, error: error.message };
  }
}

// Test caching functionality
async function testCaching() {
  console.log('\n🧪 CACHE FUNCTIONALITY TESTS');
  console.log('=' .repeat(50));

  // Test 1: Generate message with caching
  console.log('\n📝 Test 1: Generate message (should create cache)');
  const messages = [
    {
      role: 'system',
      content: 'You are a helpful assistant. This is a test of the caching system.'
    },
    {
      role: 'user',
      content: 'What is 2+2? Please respond with just the number.'
    }
  ];

  const firstResponse = await callEdgeFunction('generate-message', {
    messages,
    personaId: PERSONA_ID,
    conversationId: CONVERSATION_ID,
    userId: USER_ID,
    stream: false
  });

  if (firstResponse.status === 200) {
    console.log('✅ First request successful');
    console.log('   Usage:', firstResponse.data.usage);
    console.log('   Cost:', firstResponse.data.cost);
    if (firstResponse.data.cacheMetrics) {
      console.log('   Cache Metrics:', firstResponse.data.cacheMetrics);
    }
  } else {
    console.log('❌ First request failed:', firstResponse.data);
  }

  // Wait a moment before second request
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Same message (should use cache for OpenAI)
  console.log('\n📝 Test 2: Repeat same message (should hit cache)');
  const secondResponse = await callEdgeFunction('generate-message', {
    messages,
    personaId: PERSONA_ID,
    conversationId: CONVERSATION_ID,
    userId: USER_ID,
    stream: false
  });

  if (secondResponse.status === 200) {
    console.log('✅ Second request successful');
    console.log('   Usage:', secondResponse.data.usage);
    console.log('   Cost:', secondResponse.data.cost);
    if (secondResponse.data.cacheMetrics) {
      console.log('   Cache Metrics:', secondResponse.data.cacheMetrics);

      // Check if cache was hit
      if (secondResponse.data.cacheMetrics.hits > 0) {
        console.log('   ✅ Cache hit detected!');
        console.log('   💰 Saved cost:', secondResponse.data.cacheMetrics.savedCost);
      }
    }
  } else {
    console.log('❌ Second request failed:', secondResponse.data);
  }

  // Test 3: Cache metrics endpoint
  console.log('\n📝 Test 3: Get cache metrics');
  const metricsResponse = await callEdgeFunction('cache-metrics', {
    userId: USER_ID,
    conversationId: CONVERSATION_ID
  });

  if (metricsResponse.status === 200) {
    console.log('✅ Cache metrics retrieved');
    console.log('   Summary:', metricsResponse.data);
  } else {
    console.log('❌ Failed to get cache metrics:', metricsResponse.data);
  }

  // Test 4: Test with longer conversation (for Anthropic cache control)
  console.log('\n📝 Test 4: Longer conversation (test Anthropic caching)');
  const longConversation = [
    {
      role: 'system',
      content: 'You are an expert in mathematics and science. ' +
               'This is a detailed system prompt that should be cached. '.repeat(10)
    },
    {
      role: 'user',
      content: 'What is the theory of relativity?'
    },
    {
      role: 'assistant',
      content: 'The theory of relativity consists of two related theories...'
    },
    {
      role: 'user',
      content: 'Can you explain it more simply?'
    }
  ];

  const longResponse = await callEdgeFunction('generate-message', {
    messages: longConversation,
    personaId: PERSONA_ID,
    conversationId: CONVERSATION_ID,
    userId: USER_ID,
    stream: false
  });

  if (longResponse.status === 200) {
    console.log('✅ Long conversation successful');
    console.log('   Usage:', longResponse.data.usage);
    if (longResponse.data.usage.cachedTokens) {
      console.log('   ✅ Cached tokens detected:', longResponse.data.usage.cachedTokens);
    }
  } else {
    console.log('❌ Long conversation failed:', longResponse.data);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Cache Testing');
  console.log('=' .repeat(50));
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('User ID:', USER_ID);
  console.log('Persona ID:', PERSONA_ID);
  console.log('Conversation ID:', CONVERSATION_ID);

  try {
    await testCaching();
    console.log('\n✅ Cache testing completed');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();