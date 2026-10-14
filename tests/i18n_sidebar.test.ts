import test from 'node:test';
import assert from 'node:assert/strict';
import { t } from '../src/lib/i18n.ts';

test('Sidebar & Spaces navigation in 100% Vietnamese', () => {
  assert.equal(t('Today', 'vi'), 'Hôm nay');
  assert.equal(t('today', 'vi'), 'hôm nay');
  assert.equal(t('Daily Rhythm', 'vi'), 'Nhịp sống hàng ngày');
  assert.equal(t('Focus', 'vi'), 'Tập trung');
  assert.equal(t('Journey', 'vi'), 'Hành trình');
  assert.equal(t('Tasks', 'vi'), 'Công việc');
  assert.equal(t('Projects (P.A.R.A)', 'vi'), 'Dự án (P.A.R.A)');
  assert.equal(t('Habits', 'vi'), 'Thói quen');
  assert.equal(t('Finance', 'vi'), 'Tài chính');
  assert.equal(t('Study & Vocab', 'vi'), 'Học tập & Từ vựng');
  assert.equal(t('Journal & Notes', 'vi'), 'Sổ tay & Ghi chú');
  assert.equal(t('Goals', 'vi'), 'Mục tiêu');
  assert.equal(t('Calendar', 'vi'), 'Lịch biểu');
  assert.equal(t('Spaces', 'vi'), 'Không gian');
  assert.equal(t('System & Tools', 'vi'), 'Hệ sinh thái & Công cụ');
  assert.equal(t('Templates Marketplace', 'vi'), 'Thư viện mẫu');
  assert.equal(t('Automation Rules', 'vi'), 'Quy tắc tự động');
  assert.equal(t('Decision Engine', 'vi'), 'Bộ máy ra quyết định');
  assert.equal(t('Plans & Team', 'vi'), 'Gói & Nhóm');
  assert.equal(t('Referral 20%', 'vi'), 'Giới thiệu 20%');
  assert.equal(t('Feedback & Support', 'vi'), 'Góp ý & Hỗ trợ');
  assert.equal(t('System Admin', 'vi'), 'Quản trị hệ thống');
  assert.equal(t('Cá nhân hóa danh mục', 'vi'), 'Cá nhân hóa danh mục');
  assert.equal(t('Đóng danh mục', 'vi'), 'Đóng danh mục');
  assert.equal(t('Hết hạn', 'vi'), 'Hết hạn');
  assert.equal(t('Chưa mua', 'vi'), 'Chưa mua');
  assert.equal(t('ngày', 'vi'), 'ngày');
});

test('No garbled setFilterStatus or JSX artifacts exist in translations', () => {
  const keysToCheck = [
    'Today', 'today', 'Hôm nay', 'hôm nay', 'Daily Rhythm', 'Spaces',
    'Tất cả', 'Chưa làm', 'Đang làm', 'Hoàn thành', 'Đang chờ', 'Quá hạn',
    'All', 'To Do', 'In Progress', 'Completed', 'Pending', 'Overdue'
  ];

  for (const k of keysToCheck) {
    const viRes = t(k, 'vi');
    const enRes = t(k, 'en');
    assert.doesNotMatch(viRes, /setFilterStatus/i, `Key "${k}" in VI contains setFilterStatus: ${viRes}`);
    assert.doesNotMatch(enRes, /setFilterStatus/i, `Key "${k}" in EN contains setFilterStatus: ${enRes}`);
    assert.doesNotMatch(viRes, /[<>]/, `Key "${k}" in VI contains angle brackets: ${viRes}`);
    assert.doesNotMatch(enRes, /[<>]/, `Key "${k}" in EN contains angle brackets: ${enRes}`);
  }
});

test('Sidebar & Spaces navigation in 100% English', () => {
  assert.equal(t('Hôm nay', 'en'), 'Today');
  assert.equal(t('hôm nay', 'en'), 'today');
  assert.equal(t('Nhịp sống hàng ngày', 'en'), 'Daily Rhythm');
  assert.equal(t('Tập trung', 'en'), 'Focus');
  assert.equal(t('Hành trình', 'en'), 'Journey');
  assert.equal(t('Công việc', 'en'), 'Tasks');
  assert.equal(t('Dự án (P.A.R.A)', 'en'), 'Projects (P.A.R.A)');
  assert.equal(t('Thói quen', 'en'), 'Habits');
  assert.equal(t('Tài chính', 'en'), 'Finance');
  assert.equal(t('Học tập & Từ vựng', 'en'), 'Study & Vocab');
  assert.equal(t('Sổ tay & Ghi chú', 'en'), 'Journal & Notes');
  assert.equal(t('Mục tiêu', 'en'), 'Goals');
  assert.equal(t('Lịch biểu', 'en'), 'Calendar');
  assert.equal(t('Không gian', 'en'), 'Spaces');
  assert.equal(t('Hệ sinh thái & Công cụ', 'en'), 'Ecosystem & Tools');
  assert.equal(t('System & Tools', 'en'), 'System & Tools');
  assert.equal(t('Thư viện mẫu', 'en'), 'Template Market');
  assert.equal(t('Templates Marketplace', 'en'), 'Templates Marketplace');
  assert.equal(t('Quy tắc tự động', 'en'), 'Automation Rules');
  assert.equal(t('Bộ máy ra quyết định', 'en'), 'Decision Engine');
  assert.equal(t('Gói & Nhóm', 'en'), 'Plans & Team');
  assert.equal(t('Giới thiệu 20%', 'en'), 'Referral 20%');
  assert.equal(t('Góp ý & Hỗ trợ', 'en'), 'Feedback & Support');
  assert.equal(t('Quản trị hệ thống', 'en'), 'System Admin');
  assert.equal(t('Today', 'en'), 'Today');
  assert.equal(t('Focus', 'en'), 'Focus');
  assert.equal(t('Journey', 'en'), 'Journey');
  assert.equal(t('Tasks', 'en'), 'Tasks');
  assert.equal(t('Projects (P.A.R.A)', 'en'), 'Projects (P.A.R.A)');
  assert.equal(t('Habits', 'en'), 'Habits');
  assert.equal(t('Finance', 'en'), 'Finance');
  assert.equal(t('Study & Vocab', 'en'), 'Study & Vocab');
  assert.equal(t('Journal & Notes', 'en'), 'Journal & Notes');
  assert.equal(t('Goals', 'en'), 'Goals');
  assert.equal(t('Calendar', 'en'), 'Calendar');
  assert.equal(t('Spaces', 'en'), 'Spaces');
  assert.equal(t('Cá nhân hóa danh mục', 'en'), 'Customize Sidebar');
  assert.equal(t('Đóng danh mục', 'en'), 'Close Navigation');
  assert.equal(t('Hết hạn', 'en'), 'Expired');
  assert.equal(t('Chưa mua', 'en'), 'No Subscription');
  assert.equal(t('ngày', 'en'), 'days');
});

test('Filter status buttons in 100% Vietnamese and English', () => {
  // VI
  assert.equal(t('All', 'vi'), 'Tất cả');
  assert.equal(t('Today', 'vi'), 'Hôm nay');
  assert.equal(t('To Do', 'vi'), 'Chưa làm');
  assert.equal(t('In Progress', 'vi'), 'Đang làm');
  assert.equal(t('Completed', 'vi'), 'Hoàn thành');
  assert.equal(t('Pending', 'vi'), 'Chờ duyệt');
  assert.equal(t('Pending Review', 'vi'), 'Chờ duyệt');
  assert.equal(t('Overdue', 'vi'), 'Quá hạn');

  // EN
  assert.equal(t('Tất cả', 'en'), 'All');
  assert.equal(t('Hôm nay', 'en'), 'Today');
  assert.equal(t('Chưa làm', 'en'), 'To Do');
  assert.equal(t('Đang làm', 'en'), 'In Progress');
  assert.equal(t('Hoàn thành', 'en'), 'Completed');
  assert.equal(t('Đang chờ', 'en'), 'Pending');
  assert.equal(t('Chờ duyệt', 'en'), 'Pending Review');
  assert.equal(t('Quá hạn', 'en'), 'Overdue');
});
