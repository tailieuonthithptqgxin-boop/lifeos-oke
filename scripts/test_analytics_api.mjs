async function testLogin() {
  const loginRes = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lifeos.com', password: 'Admin@123456' })
  });
  const loginData = await loginRes.json();
  console.log('Login success:', loginData.success, 'Token exists:', Boolean(loginData.token));

  const token = loginData.token;

  // 1. Features
  const fRes = await fetch('http://localhost:3000/api/analytics/admin/features', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const fData = await fRes.json();
  console.log('Features summary:', fData.summary);
  console.log('Top 3 features:', fData.features?.slice(0, 3));

  // 2. Users list
  const uRes = await fetch('http://localhost:3000/api/analytics/admin/users?limit=3', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const uData = await uRes.json();
  console.log('Users pagination:', uData.pagination);
  console.log('Sample user:', uData.users?.[0]);

  // 3. User X-Ray
  if (uData.users?.[0]?.id) {
    const xRes = await fetch(`http://localhost:3000/api/analytics/admin/users/${uData.users[0].id}/xray`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const xData = await xRes.json();
    console.log('X-Ray profile success:', xData.success);
    console.log('X-Ray user info:', xData.profile?.user);
    console.log('X-Ray top feature:', xData.profile?.features?.[0]);
  }
}

testLogin().catch(console.error);
