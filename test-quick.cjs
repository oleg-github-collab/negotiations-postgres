const http = require('http');

const DEFAULT_PORT = process.env.TEST_PORT || process.env.PORT || 3001;
const baseURL = process.env.TEST_BASE_URL || process.env.BASE_URL || `http://localhost:${DEFAULT_PORT}`;
const results = { passed: 0, failed: 0, errors: [] };

async function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseURL);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Cookie': 'auth=authorized; auth_user=janeDVDops',
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : {},
            raw: data
          });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
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
    results.passed++;
    console.log(`✅ ${name}`);
  } catch (err) {
    results.failed++;
    results.errors.push({ name, error: err.message });
    console.log(`❌ ${name}: ${err.message}`);
  }
}

(async () => {
  console.log('🧪 QUICK TESTS\n');
  console.log('Base URL:', baseURL, '\n');

  // Basic
  await test('Health check', async () => {
    const res = await request('/health');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Homepage loads', async () => {
    const res = await request('/');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.raw.includes('TeamPulse')) throw new Error('No TeamPulse');
  });

  await test('Manifest loads', async () => {
    const res = await request('/manifest.json');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Service Worker loads', async () => {
    const res = await request('/sw.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Offline sync loads', async () => {
    const res = await request('/js/offline-sync.js');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('UI improvements CSS loads', async () => {
    const res = await request('/ui-improvements.css');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // API
  await test('API info', async () => {
    const res = await request('/api/v1/info');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Get clients', async () => {
    const res = await request('/api/v1/clients');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
    if (!res.data.success) throw new Error('No success flag');
    if (!Array.isArray(res.data.clients)) throw new Error('Clients not array');
  });

  await test('Get prospects', async () => {
    const res = await request('/api/v1/prospects');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Get teams', async () => {
    const res = await request('/api/v1/teams');
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Login endpoint', async () => {
    const res = await request('/api/v1/auth/login', {
      method: 'POST',
      body: { username: 'janeDVDops', password: 'jane2210' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  await test('Error logging', async () => {
    const res = await request('/api/v1/errors', {
      method: 'POST',
      body: { error: 'test', url: '/test' }
    });
    if (res.status !== 200) throw new Error(`Status ${res.status}`);
  });

  // Results
  console.log(`\n📊 Results: ${results.passed}/${results.passed + results.failed} passed`);
  if (results.failed > 0) {
    console.log('\n❌ Failures:');
    results.errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
  }
  process.exit(results.failed > 0 ? 1 : 0);
})();
