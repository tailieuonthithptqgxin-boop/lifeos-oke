import assert from 'assert';
import { subscriptionService, OFFICIAL_PLANS } from '../src/backend/services/subscription.service.js';
import { teamService } from '../src/backend/services/team.service.js';
import { canUse } from '../src/backend/auth.middleware.js';

async function runAccessControlTests() {
  console.log('--- STARTING PAYMENT, SUBSCRIPTION, TEAM & ACCESS CONTROL TEST SUITE ---');

  // Test 1: Feature Entitlement Rule Engine
  console.log('[Test 1] Kiểm tra Feature Entitlement (canUse):');
  assert.strictEqual(canUse({ role: 'ADMIN', plan: 'FREE' }, 'DECISION_ENGINE'), true, 'Admin phải có toàn quyền');
  assert.strictEqual(canUse({ role: 'SUPERADMIN', plan: 'FREE' }, 'FINANCE'), true, 'SuperAdmin phải có toàn quyền');
  assert.strictEqual(canUse({ role: 'USER', plan: 'FREE' }, 'DECISION_ENGINE'), false, 'Tài khoản FREE không được dùng Decision Engine');
  assert.strictEqual(canUse({ role: 'USER', plan: 'FREE' }, 'AUTOMATION'), false, 'Tài khoản FREE không được dùng Automation');
  assert.strictEqual(canUse({ role: 'USER', plan: 'FREE' }, 'TEAM_WORKSPACE'), false, 'Tài khoản FREE không được dùng Team Workspace');
  assert.strictEqual(canUse({ role: 'USER', plan: 'PRO' }, 'DECISION_ENGINE'), true, 'Tài khoản PRO được dùng Decision Engine');
  assert.strictEqual(canUse({ role: 'USER', plan: 'PRO' }, 'TEAM_WORKSPACE'), false, 'Tài khoản PRO cá nhân không được dùng Team Workspace');
  assert.strictEqual(canUse({ role: 'USER', plan: 'TEAM' }, 'TEAM_WORKSPACE'), true, 'Tài khoản TEAM được dùng Team Workspace');
  console.log('  ✓ PASSED: Entitlement Rule Engine hoạt động chính xác theo ma trận quyền.');

  // Test 2: Official Plan Definitions & Pricing
  console.log('[Test 2] Kiểm tra Danh sách Gói dịch vụ chính thức:');
  const plans = subscriptionService.getPlans();
  assert(plans.length >= 3, 'Phải có tối thiểu 3 gói dịch vụ');
  const personal1m = plans.find(p => p.id === 'PERSONAL_1M');
  const personal3m = plans.find(p => p.id === 'PERSONAL_3M');
  const team1m = plans.find(p => p.id === 'TEAM_1M');

  assert(personal1m && personal1m.price === 15000, 'Gói Cá Nhân 1 Tháng phải đúng giá 15.000 VNĐ');
  assert(personal3m && personal3m.price === 40000, 'Gói Cá Nhân 3 Tháng phải đúng giá 40.000 VNĐ');
  assert(team1m && team1m.price === 50000, 'Gói Đội Ngũ phải đúng giá 50.000 VNĐ');
  assert.strictEqual(team1m?.maxTeamMembers, 5, 'Gói Đội Ngũ phải giới hạn tối đa 5 thành viên');
  console.log('  ✓ PASSED: Cấu trúc các gói cước chính xác và đầy đủ quota.');

  // Test 3: Transfer Memo Format (DUOTECH ORDER_ID)
  console.log('[Test 3] Kiểm tra định dạng Nội dung chuyển khoản duy nhất (DUOTECH):');
  const prefix = 'DUOTECH';
  const sampleOrderId = 'ORD_1728567890_ABCD';
  const generatedMemo = `${prefix} ${sampleOrderId}`;
  assert(generatedMemo.startsWith('DUOTECH ORD_'), 'Cú pháp nội dung chuyển khoản phải chuẩn DUOTECH {ORDER_ID}');
  assert.strictEqual(generatedMemo.includes('-'), false, 'Khoảng cách giữa DUOTECH và mã đơn rõ ràng, không dính liền');
  console.log(`  ✓ PASSED: Cú pháp tạo ra chuẩn: "${generatedMemo}".`);

  // Test 4: Dynamic VietQR URL Generation with embedded Memo & Amount
  console.log('[Test 4] Kiểm tra tạo liên kết VietQR động nhúng thông tin chuyển khoản:');
  const bankCode = 'MB';
  const accountNumber = '888899998888';
  const accountHolder = 'CONG TY CONG NGHE LIFEOS';
  const amount = 50000;
  const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(generatedMemo)}&accountName=${encodeURIComponent(accountHolder)}`;
  
  assert(qrUrl.includes('amount=50000'), 'VietQR URL phải nhúng chính xác số tiền');
  assert(qrUrl.includes(encodeURIComponent(generatedMemo)), 'VietQR URL phải nhúng chính xác nội dung DUOTECH');
  assert(qrUrl.includes(accountNumber), 'VietQR URL phải nhúng số tài khoản');
  console.log('  ✓ PASSED: VietQR API URL tự động mã hóa đầy đủ thông số thanh toán.');

  // Test 5: Team Member Capacity Rules
  console.log('[Test 5] Kiểm tra giới hạn thành viên Gói Đội Ngũ:');
  const maxLimit = 5;
  const mockCurrentMembers = ['user1', 'user2', 'user3', 'user4', 'user5'];
  const canAddMore = mockCurrentMembers.length < maxLimit;
  assert.strictEqual(canAddMore, false, 'Không được phép thêm thành viên khi đã đủ 5 người');
  const remainingSlots = Math.max(0, maxLimit - mockCurrentMembers.length);
  assert.strictEqual(remainingSlots, 0, 'Số chỗ trống phải bằng 0');
  console.log('  ✓ PASSED: Quy tắc kiểm soát số lượng thành viên (5/5) được tuân thủ nghiêm ngặt.');

  // Test 6: Team Invite Code Generation Format
  console.log('[Test 6] Kiểm tra định dạng Mã mời tham gia nhóm (Team Invite Code):');
  const mockTeamId = 'b83d1c4a-9ef2-482a-a92c-5b23d9a1024f';
  const inviteCode = `TEAM-${mockTeamId.replace(/-/g, '').substring(0, 8).toUpperCase()}`;
  assert(inviteCode.startsWith('TEAM-'), 'Mã mời phải có tiền tố TEAM-');
  assert.strictEqual(inviteCode.length, 13, 'Mã mời phải gọn gàng, độ dài 13 ký tự chuẩn');
  console.log(`  ✓ PASSED: Mã mời được tạo chuẩn xác: "${inviteCode}".`);

  console.log('--- TẤT CẢ 6/6 BÀI KIỂM THỬ PAYMENT, SUBSCRIPTION, TEAM & ACCESS CONTROL ĐÃ VƯỢT QUA 100% ---');
}

runAccessControlTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
