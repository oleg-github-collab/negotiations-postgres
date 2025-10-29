#!/usr/bin/env node
/**
 * Comprehensive Initialization Test
 * Перевіряє що всі модулі правильно ініціалізуються
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let cookieJar = '';

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

    req.on('error', reject);

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
  console.log('\n🔍 COMPREHENSIVE INITIALIZATION TEST\n');

  const results = [];

  // Login first
  console.log('🔐 Аутентифікація...\n');

  results.push(await test('Login works', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'janeDVDops', password: 'jane2210' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('Login failed');
  }));

  // Test all API endpoints work
  console.log('\n📡 API Endpoints...\n');

  results.push(await test('Clients API works', async () => {
    const res = await request('/api/v1/clients');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('No success flag');
  }));

  results.push(await test('Prospects API works', async () => {
    const res = await request('/api/v1/prospects');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('No success flag');
  }));

  results.push(await test('Teams API works', async () => {
    const res = await request('/api/v1/teams');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('No success flag');
  }));

  // Test creating resources
  console.log('\n📝 Resource Creation...\n');

  let testClientId = null;

  results.push(await test('Can create client', async () => {
    const res = await request('/api/v1/clients', {
      method: 'POST',
      body: {
        company: 'Test Init Client',
        negotiator: 'Test Person',
        sector: 'Technology',
        company_size: 'medium',
        negotiation_type: 'sales',
        deal_value: '$100K',
        timeline: '3 months',
        goal: 'Test',
        decision_criteria: 'Test'
      }
    });
    if (res.status !== 200 && res.status !== 201) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('Create failed');
    testClientId = res.data.client.id;
  }));

  results.push(await test('Created client appears in list', async () => {
    const res = await request('/api/v1/clients');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    const found = res.data.clients.find(c => c.id === testClientId);
    if (!found) throw new Error('Client not in list');
  }));

  results.push(await test('Can retrieve specific client', async () => {
    const res = await request(`/api/v1/clients/${testClientId}`);
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('API error');
    if (res.data.client.company !== 'Test Init Client') throw new Error('Wrong data');
  }));

  // Test static resources
  console.log('\n🎨 Frontend Resources...\n');

  results.push(await test('Service Worker loads', async () => {
    const res = await request('/sw.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('CACHE_VERSION')) throw new Error('Invalid SW');
  }));

  results.push(await test('Manifest loads', async () => {
    const res = await request('/manifest.json');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.name) throw new Error('Invalid manifest');
  }));

  results.push(await test('UI improvements CSS loads', async () => {
    const res = await request('/ui-improvements.css');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('.btn')) throw new Error('Invalid CSS');
  }));

  results.push(await test('Modals JS loads', async () => {
    const res = await request('/modals.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('ModalManager')) throw new Error('Invalid JS');
  }));

  results.push(await test('Prospects manager loads', async () => {
    const res = await request('/prospects-manager.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('ProspectsManager')) throw new Error('Invalid JS');
  }));

  results.push(await test('App init loads', async () => {
    const res = await request('/app-init.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.includes('AppInit')) throw new Error('Invalid JS');
  }));

  // Summary
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(Boolean).length;
  const total = results.length;
  const percentage = Math.round((passed / total) * 100);

  console.log(`\n📊 Results: ${passed}/${total} passed (${percentage}%)`);

  if (passed === total) {
    console.log('\n🎉 PERFECT! All initialization checks passed!\n');
  } else {
    console.log(`\n❌ ${total - passed} check(s) failed\n`);
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
