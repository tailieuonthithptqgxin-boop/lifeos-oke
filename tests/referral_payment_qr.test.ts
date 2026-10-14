import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

// 1x1 valid PNG in base64: starts with 89 50 4E 47 0D 0A 1A 0A
const VALID_PNG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Fake PNG with bad magic bytes
const FAKE_PNG_BASE64 = 'data:image/png;base64,' + Buffer.from('NOT_A_REAL_PNG_FILE_DATA').toString('base64');

describe('Requirement 133: Referral Commission Payment QR System', () => {
  let userACookie = '';
  let userAId = '';
  const testEmailA = `test_qr_user_a_${Date.now()}@lifeos.local`;

  let userBCookie = '';
  let userBId = '';
  const testEmailB = `test_qr_user_b_${Date.now()}@lifeos.local`;

  let adminCookie = '';
  const testAdminEmail = `test_qr_admin_${Date.now()}@lifeos.local`;
  const password = 'Password123!Secure';

  let uploadedQrId = '';

  it('1. Register User A and User B', async () => {
    // Register User A
    const resA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: testEmailA, password })
    });
    assert.strictEqual(resA.status, 201);
    userACookie = (resA.headers.get('set-cookie') || '').split(';')[0];
    const dataA = await resA.json();
    userAId = dataA.user.id;

    // Register User B
    const resB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: testEmailB, password })
    });
    assert.strictEqual(resB.status, 201);
    userBCookie = (resB.headers.get('set-cookie') || '').split(';')[0];
    const dataB = await resB.json();
    userBId = dataB.user.id;
  });

  it('2. Register Admin User', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Admin QR Reviewer', email: testAdminEmail, password })
    });
    assert.strictEqual(res.status, 201);
    adminCookie = (res.headers.get('set-cookie') || '').split(';')[0];

    // Promote to ADMIN in DB
    const { getPrisma } = await import('../src/backend/db.js');
    const prisma = getPrisma();
    await prisma.user.update({
      where: { email: testAdminEmail },
      data: { role: 'ADMIN' }
    });
  });

  it('3. Security: Reject QR upload with invalid magic bytes / spoofed MIME type', async () => {
    const res = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        base64Data: FAKE_PNG_BASE64,
        fileName: 'malicious.png',
        mimeType: 'image/png'
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('PNG không hợp lệ') || data.message.includes('lỗi cấu trúc'));
  });

  it('4. Security: Reject QR upload with prohibited file extension (.exe, .sh)', async () => {
    const res = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        base64Data: VALID_PNG_BASE64,
        fileName: 'exploit.exe',
        mimeType: 'image/png'
      })
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Đuôi tập tin không được phép'));
  });

  it('5. User A uploads valid bank payment QR successfully', async () => {
    const res = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        base64Data: VALID_PNG_BASE64,
        fileName: 'my_bank_qr.png',
        mimeType: 'image/png',
        bankName: 'MB Bank',
        bankAccount: '0987654321',
        accountHolder: 'NGUYEN VAN A'
      })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.paymentQr);
    assert.strictEqual(data.paymentQr.userId, userAId);
    assert.strictEqual(data.paymentQr.status, 'PENDING_VERIFICATION');
    assert.strictEqual(data.paymentQr.bankName, 'MB Bank');
    assert.strictEqual(data.paymentQr.bankAccount, '0987654321');
    assert.strictEqual(data.paymentQr.accountHolder, 'NGUYEN VAN A');
    uploadedQrId = data.paymentQr.id;
  });

  it('6. User A retrieves own Payment QR via GET /api/referrals/payment-qr', async () => {
    const res = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      headers: { 'Cookie': userACookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.paymentQr);
    assert.strictEqual(data.paymentQr.id, uploadedQrId);
    assert.strictEqual(data.paymentQr.userId, userAId);
  });

  it('7. User B gets NULL when checking payment QR (Customer isolation)', async () => {
    const res = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      headers: { 'Cookie': userBCookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.paymentQr, null, 'User B must not see User A QR');
  });

  it('8. User A dashboard includes paymentQr metadata', async () => {
    const res = await fetch(`${BASE_URL}/api/referrals/dashboard`, {
      headers: { 'Cookie': userACookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.paymentQr);
    assert.strictEqual(data.paymentQr.id, uploadedQrId);
  });

  it('9. Admin views all payment QRs via GET /api/admin/referrals/payment-qrs', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/referrals/payment-qrs`, {
      headers: { 'Cookie': adminCookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.paymentQrs));
    const found = data.paymentQrs.find((q: any) => q.id === uploadedQrId);
    assert.ok(found, 'Admin must see User A uploaded QR');
  });

  it('10. Non-admin User B is forbidden from GET /api/admin/referrals/payment-qrs', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/referrals/payment-qrs`, {
      headers: { 'Cookie': userBCookie }
    });

    assert.strictEqual(res.status, 403, 'Normal user must be forbidden from admin QR endpoint');
  });

  it('11. Admin verifies User A Payment QR', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/referrals/payment-qr/${uploadedQrId}/verify`, {
      method: 'POST',
      headers: { 'Cookie': adminCookie }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.paymentQr.status, 'VERIFIED');
    assert.strictEqual(data.paymentQr.verifiedBy, testAdminEmail);
  });

  it('12. User A creates withdrawal request -> snapshots Payment QR', async () => {
    // Top up approvedReward for User A to test withdrawal
    const { getPrisma } = await import('../src/backend/db.js');
    const prisma = getPrisma();
    await prisma.referralProfile.update({
      where: { userId: userAId },
      data: { approvedReward: 200000 }
    });

    const res = await fetch(`${BASE_URL}/api/referrals/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': userACookie
      },
      body: JSON.stringify({
        amount: 100000,
        bankName: 'MB Bank',
        bankAccount: '0987654321',
        accountHolder: 'NGUYEN VAN A',
        transferNote: 'LifeOS Rut tien hoa hong'
      })
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.request);
    assert.ok(data.request.paymentQrUrl, 'Must capture snapshot of payment QR');
    const withdrawalId = data.request.id;

    // Check that User A cannot delete QR while withdrawal is pending
    const delRes = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      method: 'DELETE',
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(delRes.status, 400);
    const delData = await delRes.json();
    assert.ok(delData.message.includes('đang có yêu cầu rút tiền đang chờ xử lý'));

    // Admin approves payout with idempotency check
    const approveRes = await fetch(`${BASE_URL}/api/admin/referrals/withdrawals/${withdrawalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        txReference: 'BANK-TXN-123456'
      })
    });
    assert.strictEqual(approveRes.status, 200);

    // Duplicate approve attempt must be rejected (Anti-double payout)
    const duplicateApproveRes = await fetch(`${BASE_URL}/api/admin/referrals/withdrawals/${withdrawalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': adminCookie
      },
      body: JSON.stringify({
        txReference: 'BANK-TXN-123456-RETRY'
      })
    });
    assert.strictEqual(duplicateApproveRes.status, 400, 'Duplicate payout must be blocked');
    const dupData = await duplicateApproveRes.json();
    assert.ok(dupData.message.includes('đã được xử lý') || dupData.message.includes('chi trả trùng'));
  });

  it('13. User A deletes Payment QR after pending withdrawal is settled', async () => {
    const delRes = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      method: 'DELETE',
      headers: { 'Cookie': userACookie }
    });
    assert.strictEqual(delRes.status, 200);
    const data = await delRes.json();
    assert.strictEqual(data.success, true);

    // Verify it is gone
    const getRes = await fetch(`${BASE_URL}/api/referrals/payment-qr`, {
      headers: { 'Cookie': userACookie }
    });
    const getData = await getRes.json();
    assert.strictEqual(getData.paymentQr, null);
  });
});
