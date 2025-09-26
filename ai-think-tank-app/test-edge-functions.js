#!/usr/bin/env node

/**
 * Edge Functions Test Suite
 *
 * Usage:
 * 1. First, create a .env.test file with your credentials (see .env.test.example)
 * 2. Run: node test-edge-functions.js
 */

const fs = require('fs');
const path = require('path');

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

// Additional persona IDs for multi-persona testing
const PERSONA_IDS = process.env.TEST_PERSONA_IDS ? process.env.TEST_PERSONA_IDS.split(',') : [PERSONA_ID];

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables in .env.test');
  process.exit(1);
}

const BASE_URL = `${SUPABASE_URL}/functions/v1`;

// Helper function to make requests
async function testFunction(functionName, data, description) {
  console.log(`\n📝 Testing: ${description}`);
  console.log(`   Function: ${functionName}`);
  console.log(`   Request:`, JSON.stringify(data, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = responseText;
    }

    if (response.ok) {
      console.log(`   ✅ Success (${response.status}):`,
        typeof responseData === 'object' ? JSON.stringify(responseData, null, 2) : responseData);
      return { success: true, data: responseData };
    } else {
      console.log(`   ❌ Error (${response.status}):`, responseData);
      return { success: false, error: responseData };
    }
  } catch (error) {
    console.log(`   ❌ Network Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Test suite
async function runTests() {
  console.log('🚀 Starting Edge Functions Test Suite');
  console.log('=====================================');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`User ID: ${USER_ID || 'Not set (will use dynamic)'}`);
  console.log(`Persona ID: ${PERSONA_ID || 'Not set (will use dynamic)'}`);
  console.log(`Conversation ID: ${CONVERSATION_ID || 'Not set (will use dynamic)'}`);

  let testResults = {
    total: 0,
    passed: 0,
    failed: 0
  };

  // Test 1: Calculate Costs - Get Pricing Info
  console.log('\n\n🔍 TEST GROUP 1: Calculate Costs Function');
  console.log('=========================================');

  const pricingTest = await testFunction('calculate-costs', {},
    'Get all model pricing information');
  testResults.total++;
  if (pricingTest.success) testResults.passed++; else testResults.failed++;

  // Test 2: Calculate Costs - Calculate Actual Cost
  const costCalcTest = await testFunction('calculate-costs', {
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      cachedTokens: 0
    }
  }, 'Calculate cost for OpenAI GPT-3.5-turbo usage');
  testResults.total++;
  if (costCalcTest.success) testResults.passed++; else testResults.failed++;

  // Test 3: Calculate Costs - Estimate from Messages
  const costEstimateTest = await testFunction('calculate-costs', {
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is the weather like today?' }
    ]
  }, 'Estimate cost from messages for Anthropic Claude Haiku');
  testResults.total++;
  if (costEstimateTest.success) testResults.passed++; else testResults.failed++;

  // Test 4: Calculate Costs - Get User Budget (if USER_ID is set)
  if (USER_ID) {
    const budgetTest = await testFunction('calculate-costs', {
      userId: USER_ID,
      period: 'daily'
    }, 'Get user budget and daily spending');
    testResults.total++;
    if (budgetTest.success) testResults.passed++; else testResults.failed++;
  }

  // Test 5: Cache Management - Set Cache
  console.log('\n\n🔍 TEST GROUP 2: Cache Management Function');
  console.log('==========================================');

  const cacheKey = `test-${Date.now()}`;
  const cacheSetTest = await testFunction('manage-cache', {
    action: 'set',
    key: cacheKey,
    value: {
      test: 'data',
      timestamp: new Date().toISOString(),
      nested: {
        property: 'value'
      }
    },
    ttl: 60000, // 1 minute
    userId: USER_ID
  }, 'Set cache entry with 1 minute TTL');
  testResults.total++;
  if (cacheSetTest.success) testResults.passed++; else testResults.failed++;

  // Test 6: Cache Management - Get Cache
  const cacheGetTest = await testFunction('manage-cache', {
    action: 'get',
    key: cacheKey,
    userId: USER_ID
  }, 'Retrieve cached entry');
  testResults.total++;
  if (cacheGetTest.success) testResults.passed++; else testResults.failed++;

  // Test 7: Cache Management - Get Stats
  const cacheStatsTest = await testFunction('manage-cache', {
    action: 'stats'
  }, 'Get cache statistics');
  testResults.total++;
  if (cacheStatsTest.success) testResults.passed++; else testResults.failed++;

  // Test 8: Cache Management - Delete Entry
  const cacheDeleteTest = await testFunction('manage-cache', {
    action: 'delete',
    key: cacheKey,
    userId: USER_ID
  }, 'Delete specific cache entry');
  testResults.total++;
  if (cacheDeleteTest.success) testResults.passed++; else testResults.failed++;

  // Test 9: Determine Next Speaker - Random Mode
  console.log('\n\n🔍 TEST GROUP 3: Determine Next Speaker Function');
  console.log('================================================');

  if (PERSONA_IDS.length > 1) {
    const randomSpeakerTest = await testFunction('determine-next-speaker', {
      conversationId: CONVERSATION_ID || 'test-conv-123',
      currentSpeaker: PERSONA_IDS[0],
      availablePersonaIds: PERSONA_IDS,
      orchestrationMode: 'random',
      userId: USER_ID || 'test-user-123'
    }, 'Select next speaker using random mode');
    testResults.total++;
    if (randomSpeakerTest.success) testResults.passed++; else testResults.failed++;

    // Test 10: Determine Next Speaker - Round-Robin Mode
    const roundRobinTest = await testFunction('determine-next-speaker', {
      conversationId: CONVERSATION_ID || 'test-conv-123',
      currentSpeaker: PERSONA_IDS[0],
      availablePersonaIds: PERSONA_IDS,
      orchestrationMode: 'round-robin',
      userId: USER_ID || 'test-user-123'
    }, 'Select next speaker using round-robin mode');
    testResults.total++;
    if (roundRobinTest.success) testResults.passed++; else testResults.failed++;

    // Test 11: Determine Next Speaker - Intelligent Mode (requires valid data)
    if (CONVERSATION_ID && USER_ID) {
      const intelligentSpeakerTest = await testFunction('determine-next-speaker', {
        conversationId: CONVERSATION_ID,
        currentSpeaker: PERSONA_IDS[0],
        availablePersonaIds: PERSONA_IDS,
        orchestrationMode: 'intelligent',
        userId: USER_ID
      }, 'Select next speaker using intelligent AI mode');
      testResults.total++;
      if (intelligentSpeakerTest.success) testResults.passed++; else testResults.failed++;
    }
  } else {
    console.log('   ⚠️  Skipping multi-persona tests (need multiple persona IDs in TEST_PERSONA_IDS)');
  }

  // Test 12: Generate Message (requires valid persona and conversation)
  console.log('\n\n🔍 TEST GROUP 4: Generate Message Function');
  console.log('==========================================');

  if (PERSONA_ID && CONVERSATION_ID && USER_ID) {
    const generateMessageTest = await testFunction('generate-message', {
      personaId: PERSONA_ID,
      conversationId: CONVERSATION_ID,
      userId: USER_ID,
      messages: [
        { role: 'system', content: 'You are a helpful test assistant. Keep responses brief.' },
        { role: 'user', content: 'Say "Test successful" if you can read this.' }
      ],
      stream: false
    }, 'Generate AI message response (non-streaming)');
    testResults.total++;
    if (generateMessageTest.success) testResults.passed++; else testResults.failed++;
  } else {
    console.log('   ⚠️  Skipping generate-message test (needs PERSONA_ID, CONVERSATION_ID, and USER_ID)');
  }

  // Print summary
  console.log('\n\n📊 TEST SUMMARY');
  console.log('================');
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${testResults.total > 0 ?
    Math.round((testResults.passed / testResults.total) * 100) : 0}%`);

  if (testResults.failed === 0 && testResults.total > 0) {
    console.log('\n🎉 All tests passed successfully!');
  } else if (testResults.failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the output above for details.');
  }
}

// Run the test suite
runTests().catch(console.error);