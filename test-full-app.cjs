/**
 * ПОВНИЙ ТЕСТ ВСЬОГО ФУНКЦІОНАЛУ
 */

const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

class FullAppTester {
  constructor() {
    this.baseURL = 'http://localhost:3001';
    this.results = {
      passed: [],
      failed: [],
      total: 0
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);
      const client = url.protocol === 'https:' ? https : http;

      const req = client.request(url, {
        method: options.method || 'GET',
        headers: {
          'Cookie': 'auth=authorized; auth_user=janeDVDops',
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: jsonData,
              raw: data
            });
          } catch {
            resolve({
              status: res.statusCode,
              headers: res.headers,
              data: null,
              raw: data
            });
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

  async test(category, name, testFn) {
    this.results.total++;
    const fullName = `${category}: ${name}`;

    try {
      await testFn();
      this.results.passed.push(fullName);
      console.log(`✅ ${fullName}`);
      return true;
    } catch (error) {
      this.results.failed.push({ test: fullName, error: error.message });
      console.log(`❌ ${fullName}`);
      console.log(`   Error: ${error.message}`);
      return false;
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  async runAllTests() {
    console.log('🚀 STARTING COMPLETE FUNCTIONALITY TEST\n');
    console.log('=' .repeat(60));

    // 1. SERVER TESTS
    console.log('\n📦 SERVER & STATIC FILES\n');

    await this.test('Server', 'Homepage loads', async () => {
      const res = await this.request('/');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.raw.includes('TeamPulse'), 'No TeamPulse in HTML');
    });

    await this.test('Server', 'Login page loads', async () => {
      const res = await this.request('/login');
      this.assert(res.status === 200, `Status ${res.status}`);
    });

    await this.test('Server', 'Manifest.json loads', async () => {
      const res = await this.request('/manifest.json');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.data?.name === 'TeamPulse Negotiations Turbo', 'Wrong manifest');
    });

    await this.test('Server', 'Service Worker loads', async () => {
      const res = await this.request('/sw.js');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.raw.includes('CACHE_VERSION'), 'No cache version');
    });

    await this.test('Server', 'Offline sync script loads', async () => {
      const res = await this.request('/js/offline-sync.js');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.raw.includes('OfflineSyncManager'), 'No OfflineSyncManager');
    });

    // 2. API AUTHENTICATION
    console.log('\n🔐 AUTHENTICATION\n');

    await this.test('Auth', 'Login with valid credentials', async () => {
      const res = await this.request('/api/v1/auth/login', {
        method: 'POST',
        body: { username: 'janeDVDops', password: 'jane2210' }
      });
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.data?.success === true, 'Login failed');
    });

    await this.test('Auth', 'Login with invalid credentials', async () => {
      const res = await this.request('/api/v1/auth/login', {
        method: 'POST',
        body: { username: 'wrong', password: 'wrong' }
      });
      this.assert(res.status === 401, `Status ${res.status}`);
      this.assert(res.data?.success === false, 'Should fail');
    });

    await this.test('Auth', 'Verify authentication', async () => {
      const res = await this.request('/api/v1/auth/verify');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.data?.authenticated === true, 'Not authenticated');
    });

    // 3. CLIENTS API
    console.log('\n👥 CLIENTS API\n');

    let clientId;

    await this.test('Clients', 'Get all clients', async () => {
      const res = await this.request('/api/v1/clients');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(Array.isArray(res.data), 'Not an array');
    });

    await this.test('Clients', 'Create new client', async () => {
      const res = await this.request('/api/v1/clients', {
        method: 'POST',
        body: {
          name: 'Test Company',
          email: 'test@test.com',
          phone: '+380501234567',
          company_sector: 'IT',
          team_size: 10,
          status: 'active'
        }
      });
      this.assert(res.status === 200 || res.status === 201, `Status ${res.status}`);
      clientId = res.data?.id;
    });

    if (clientId) {
      await this.test('Clients', 'Get client by ID', async () => {
        const res = await this.request(`/api/v1/clients/${clientId}`);
        this.assert(res.status === 200, `Status ${res.status}`);
        this.assert(res.data?.id === clientId, 'Wrong client');
      });

      await this.test('Clients', 'Update client', async () => {
        const res = await this.request(`/api/v1/clients/${clientId}`, {
          method: 'PUT',
          body: { name: 'Updated Company' }
        });
        this.assert(res.status === 200, `Status ${res.status}`);
      });

      await this.test('Clients', 'Delete client', async () => {
        const res = await this.request(`/api/v1/clients/${clientId}`, {
          method: 'DELETE'
        });
        this.assert(res.status === 200 || res.status === 204, `Status ${res.status}`);
      });
    }

    // 4. TEAMS API
    console.log('\n👨‍👩‍👧‍👦 TEAMS API\n');

    let teamId;

    await this.test('Teams', 'Get all teams', async () => {
      const res = await this.request('/api/v1/teams');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(Array.isArray(res.data), 'Not an array');
    });

    await this.test('Teams', 'Create new team', async () => {
      const res = await this.request('/api/v1/teams', {
        method: 'POST',
        body: {
          name: 'Test Team',
          client_id: 1,
          team_size: 5,
          created_by: 'janeDVDops'
        }
      });
      this.assert(res.status === 200 || res.status === 201, `Status ${res.status}`);
      teamId = res.data?.id;
    });

    // 5. PROSPECTS API
    console.log('\n💼 PROSPECTS API\n');

    await this.test('Prospects', 'Get all prospects', async () => {
      const res = await this.request('/api/v1/prospects');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(Array.isArray(res.data), 'Not an array');
    });

    await this.test('Prospects', 'Create new prospect', async () => {
      const res = await this.request('/api/v1/prospects', {
        method: 'POST',
        body: {
          first_name: 'John',
          last_name: 'Doe',
          position: 'Developer',
          english_level: 'B2',
          salary: 3000,
          status: 'new'
        }
      });
      this.assert(res.status === 200 || res.status === 201, `Status ${res.status}`);
    });

    // 6. ANALYSIS API
    console.log('\n🔍 ANALYSIS API\n');

    await this.test('Analysis', 'Health check', async () => {
      const res = await this.request('/api/v1/analyze/health');
      this.assert(res.status === 200, `Status ${res.status}`);
    });

    // 7. SEARCH API
    console.log('\n🔎 SEARCH API\n');

    await this.test('Search', 'Search clients', async () => {
      const res = await this.request('/api/v1/search?q=test&type=clients');
      this.assert(res.status === 200, `Status ${res.status}`);
    });

    // 8. ERROR HANDLING
    console.log('\n⚠️ ERROR HANDLING\n');

    await this.test('Errors', 'Log client error', async () => {
      const res = await this.request('/api/v1/errors', {
        method: 'POST',
        body: {
          error: 'Test error',
          url: '/test',
          line: 1,
          column: 1
        }
      });
      this.assert(res.status === 200, `Status ${res.status}`);
    });

    await this.test('Errors', '404 handling', async () => {
      const res = await this.request('/api/nonexistent');
      this.assert(res.status === 404, `Status ${res.status}`);
    });

    // 9. HEALTH & MONITORING
    console.log('\n💚 HEALTH & MONITORING\n');

    await this.test('Health', 'Health endpoint', async () => {
      const res = await this.request('/health');
      this.assert(res.status === 200 || res.status === 503, `Status ${res.status}`);
      this.assert(res.data?.status, 'No status');
    });

    await this.test('Health', 'Ready endpoint', async () => {
      const res = await this.request('/ready');
      this.assert(res.status === 200 || res.status === 503, `Status ${res.status}`);
    });

    await this.test('Health', 'API info', async () => {
      const res = await this.request('/api/v1/info');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.data?.name === 'TeamPulse Turbo API', 'Wrong API name');
    });

    // 10. USAGE & STATS
    console.log('\n📊 USAGE & STATS\n');

    await this.test('Stats', 'Get usage', async () => {
      const res = await this.request('/api/usage');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(typeof res.data?.percentage === 'number', 'No percentage');
    });

    await this.test('Stats', 'Get stats', async () => {
      const res = await this.request('/api/v1/stats');
      this.assert(res.status === 200, `Status ${res.status}`);
      this.assert(res.data?.server, 'No server stats');
    });

    // RESULTS
    console.log('\n' + '=' .repeat(60));
    console.log('\n📊 RESULTS\n');
    console.log(`✅ Passed: ${this.results.passed.length}/${this.results.total}`);
    console.log(`❌ Failed: ${this.results.failed.length}/${this.results.total}`);
    console.log(`🎯 Success Rate: ${Math.round((this.results.passed.length / this.results.total) * 100)}%`);

    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results.failed.forEach((fail, i) => {
        console.log(`${i + 1}. ${fail.test}`);
        console.log(`   Error: ${fail.error}`);
      });
    }

    console.log('\n' + '=' .repeat(60));

    if (this.results.failed.length === 0) {
      console.log('\n🎉 ALL TESTS PASSED! READY FOR PRODUCTION!');
    } else {
      console.log('\n⚠️ SOME TESTS FAILED - FIX BEFORE DEPLOYING!');
    }

    return this.results.failed.length === 0;
  }
}

// Run tests
async function main() {
  const tester = new FullAppTester();

  console.log('⏳ Starting server on port 3001...\n');

  const server = spawn('npm', ['run', 'dev'], {
    cwd: '/Users/olehkaminskyi/Desktop/Teampulse Negotiations Postgres',
    env: { ...process.env, PORT: '3001' }
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const success = await tester.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('Test runner error:', error);
    process.exit(1);
  } finally {
    server.kill();
  }
}

main();