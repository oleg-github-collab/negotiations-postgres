#!/usr/bin/env node
/**
 * Comprehensive User Flow Test
 * Tests complete user journey through the application
 */

const http = require('http');

const DEFAULT_PORT = process.env.TEST_PORT || process.env.PORT || 3000;
const BASE_URL = process.env.TEST_BASE_URL || process.env.BASE_URL || `http://localhost:${DEFAULT_PORT}`;
let cookieJar = '';

// Helper function to make HTTP requests
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Cookie': cookieJar,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(opts, (res) => {
      let data = '';

      // Capture Set-Cookie headers
      if (res.headers['set-cookie']) {
        const cookies = Array.isArray(res.headers['set-cookie'])
          ? res.headers['set-cookie']
          : [res.headers['set-cookie']];
        cookieJar = cookies.map(c => c.split(';')[0]).join('; ');
      }

      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => reject(new Error(`Request to ${url.href} failed: ${err.message}`)));

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }

    req.end();
  });
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    return true;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n🎯 COMPREHENSIVE USER FLOW TEST\n');
  console.log('Target:', BASE_URL, '\n');

  const results = [];

  // Phase 1: Initial Application Load
  console.log('📱 Phase 1: Initial Application Load\n');

  results.push(await test('Homepage loads successfully', async () => {
    const res = await request('/');
    // Homepage may redirect to login if not authenticated, or show content
    if (res.status !== 200 && res.status !== 302) throw new Error(`Status ${res.status}`);
  }));

  results.push(await test('Service Worker is available', async () => {
    const res = await request('/sw.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('CACHE_VERSION')) throw new Error('Invalid SW');
  }));

  results.push(await test('PWA manifest is valid', async () => {
    const res = await request('/manifest.json');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.name) throw new Error('Invalid manifest');
  }));

  results.push(await test('UI improvements CSS loads', async () => {
    const res = await request('/ui-improvements.css');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('.btn')) throw new Error('Missing styles');
  }));

  // Phase 2: Public API Access (Before Login)
  console.log('\n🔓 Phase 2: Public API Access\n');

  results.push(await test('API info endpoint accessible', async () => {
    const res = await request('/api/v1/info');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.version) throw new Error('Missing version');
  }));

  results.push(await test('Health check endpoint works', async () => {
    const res = await request('/health');
    if (res.status !== 200 && res.status !== 503) throw new Error(`Status ${res.status}`);
    if (!res.data.status) throw new Error('No status in health response');
  }));

  results.push(await test('Protected endpoints redirect when not logged in', async () => {
    const res = await request('/api/v1/clients');
    if (res.status !== 302 && res.status !== 401) throw new Error(`Expected redirect, got ${res.status}`);
  }));

  // Phase 3: Authentication Flow
  console.log('\n🔐 Phase 3: Authentication Flow\n');

  results.push(await test('User can login successfully', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'janeDVDops', password: 'jane2210' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('Login failed');
    if (!cookieJar.includes('session_token')) throw new Error('No session cookie');
  }));

  results.push(await test('Session is persisted in cookies', async () => {
    if (!cookieJar) throw new Error('No cookies set');
    if (!cookieJar.includes('session_token')) throw new Error('Missing session token');
  }));

  // Phase 4: Protected API Access (After Login)
  console.log('\n🔒 Phase 4: Protected API Access\n');

  results.push(await test('Can access clients list', async () => {
    const res = await request('/api/v1/clients');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('API error');
    if (!Array.isArray(res.data.clients)) throw new Error('Invalid response format');
  }));

  results.push(await test('Can access prospects list', async () => {
    const res = await request('/api/v1/prospects');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('API error');
  }));

  results.push(await test('Can access teams list', async () => {
    const res = await request('/api/v1/teams');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('API error');
    if (!Array.isArray(res.data.teams)) throw new Error('Invalid response format');
  }));

  // Phase 5: Client Management Flow
  console.log('\n👥 Phase 5: Client Management Flow\n');

  let testClientId = null;

  results.push(await test('Can create new client', async () => {
    const res = await request('/api/v1/clients', {
      method: 'POST',
      body: {
        company: 'Test Company Flow',
        negotiator: 'Test Negotiator',
        sector: 'Technology',
        company_size: 'medium',
        negotiation_type: 'partnership',
        deal_value: '$100K-$500K',
        timeline: '3-6 months',
        goal: 'Strategic partnership',
        decision_criteria: 'ROI, Timeline'
      }
    });
    if (res.status !== 200 && res.status !== 201) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('Creation failed');
    if (!res.data.client || !res.data.client.id) throw new Error('No client ID returned');
    testClientId = res.data.client.id;
  }));

  results.push(await test('Can retrieve specific client', async () => {
    if (!testClientId) throw new Error('No client ID available');
    const res = await request(`/api/v1/clients/${testClientId}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('API error');
    if (!res.data.client) throw new Error('Client not found');
    if (res.data.client.company !== 'Test Company Flow') throw new Error('Wrong client data');
  }));

  results.push(await test('Client appears in clients list', async () => {
    const res = await request('/api/v1/clients');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const found = res.data.clients.find(c => c.id === testClientId);
    if (!found) throw new Error('Client not in list');
  }));

  // Phase 6: Analysis Flow
  console.log('\n📊 Phase 6: Analysis Flow\n');

  results.push(await test('Analysis health endpoint responds', async () => {
    const res = await request('/api/v1/analyze/health');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data?.success) throw new Error('Analysis health failed');
  }));

  results.push(await test('Can retrieve client with analysis count', async () => {
    if (!testClientId) throw new Error('No client ID available');
    const res = await request(`/api/v1/clients/${testClientId}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.client) throw new Error('Client not found');
    // analyses_count should exist (0 or more)
    if (typeof res.data.client.analyses_count === 'undefined') {
      throw new Error('analyses_count field missing');
    }
  }));

  // Phase 7: Error Handling
  console.log('\n⚠️  Phase 7: Error Handling\n');

  results.push(await test('404 for non-existent routes', async () => {
    const res = await request('/api/v1/nonexistent');
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  }));

  results.push(await test('Error logging endpoint works', async () => {
    const res = await request('/api/v1/errors', {
      method: 'POST',
      body: {
        error: 'Test error from flow test',
        url: '/test-flow',
        timestamp: new Date().toISOString()
      }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  }));

  results.push(await test('Invalid client ID returns 404', async () => {
    const res = await request('/api/v1/clients/999999999');
    if (res.status !== 404) throw new Error(`Expected 404, got ${res.status}`);
  }));

  // Phase 8: Logout Flow
  console.log('\n🚪 Phase 8: Logout Flow\n');

  results.push(await test('Can logout successfully', async () => {
    const res = await request('/api/v1/auth/logout', { method: 'POST' });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  }));

  results.push(await test('Protected endpoints redirect after logout', async () => {
    cookieJar = ''; // Clear cookies
    const res = await request('/api/v1/clients');
    if (res.status !== 302 && res.status !== 401) throw new Error(`Expected redirect, got ${res.status}`);
  }));

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(Boolean).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`\n📊 Results: ${passed}/${total} passed (${percentage}%)`);

  if (passed === total) {
    console.log('\n🎉 PERFECT! All user flows working flawlessly!\n');
  } else {
    console.log(`\n❌ ${total - passed} test(s) failed\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
