async function testAdmin() {
  console.log('Testing Admin Login and Endpoints...');
  const loginRes = await fetch('http://127.0.0.1:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lifeos.com', password: 'Admin@123456' })
  });

  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Failed to log in as admin:', loginData);
    process.exit(1);
  }

  const token = loginData.token;
  console.log('Admin login OK! Role:', loginData.user.role);

  const endpoints = [
    '/api/admin/reset-requests',
    '/api/admin/referrals/overview',
    '/api/admin/plans',
    '/api/admin/languages',
    '/api/admin/users?limit=10',
    '/api/analytics/admin/features',
    '/api/analytics/admin/study-rooms',
    '/api/analytics/admin/users?page=1&limit=25'
  ];

  for (const ep of endpoints) {
    const res = await fetch('http://127.0.0.1:3000' + ep, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Endpoint ${ep}: HTTP ${res.status}`);
    if (!res.ok) {
      const err = await res.text();
      console.error(`  Error on ${ep}:`, err);
    }
  }

  console.log('Admin endpoints test complete: ALL SUCCESS!');
}

testAdmin().catch(console.error);
