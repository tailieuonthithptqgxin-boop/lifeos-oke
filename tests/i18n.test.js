import test from 'node:test';
import assert from 'node:assert/strict';
import { t, translations } from '../src/lib/i18n.ts';

test('i18n Localization and Bilingual System Test Suite', async (tSuite) => {
  await tSuite.test('1. Dictionary contains complete translations for Vietnamese and English', () => {
    assert.ok(translations.vi, 'Vietnamese dictionary exists');
    assert.ok(translations.en, 'English dictionary exists');
    const enKeysCount = Object.keys(translations.en).length;
    assert.ok(enKeysCount > 2000, `Expected > 2000 English translations, got ${enKeysCount}`);
  });

  await tSuite.test('2. Navigation and Core Views translate properly to English', () => {
    assert.equal(t('Bảng điều khiển', 'en'), 'Dashboard');
    assert.equal(t('Công việc', 'en'), 'Tasks');
    assert.equal(t('Tài chính', 'en'), 'Finance');
    assert.equal(t('Lịch biểu', 'en'), 'Calendar');
    assert.equal(t('Mục tiêu', 'en'), 'Goals');
    assert.equal(t('Thói quen', 'en'), 'Habits');
    assert.equal(t('Ghi chú', 'en'), 'Notes');
    assert.equal(t('Học tập', 'en'), 'Study');
    assert.equal(t('Bộ máy ra quyết định', 'en'), 'Decision Engine');
    assert.equal(t('Quy tắc tự động', 'en'), 'Automation Rules');
    assert.equal(t('Quản trị hệ thống', 'en'), 'System Admin');
    assert.equal(t('Thư viện mẫu', 'en'), 'Template Market');
    assert.equal(t('Lưu trữ đám mây R2', 'en'), 'Cloud Storage (R2)');
  });

  await tSuite.test('3. Buttons, Actions, and Common UI elements translate properly', () => {
    assert.equal(t('Lưu thay đổi', 'en'), 'Save Changes');
    assert.equal(t('Hủy bỏ', 'en'), 'Cancel');
    assert.equal(t('Xóa', 'en'), 'Delete');
    assert.equal(t('Tạo mới', 'en'), 'Create New');
    assert.equal(t('Chỉnh sửa', 'en'), 'Edit');
    assert.equal(t('Xác nhận', 'en'), 'Confirm');
    assert.equal(t('Đăng xuất', 'en'), 'Sign Out');
    assert.equal(t('Đăng nhập', 'en'), 'Sign In');
    assert.equal(t('Đăng ký ngay', 'en'), 'Sign up now');
  });

  await tSuite.test('4. Status badges and complex patterns translate properly', () => {
    assert.equal(t('Đang hoạt động', 'en'), 'Active');
    assert.equal(t('Chờ duyệt', 'en'), 'Pending Review');
    assert.equal(t('Đã duyệt', 'en'), 'Approved');
    assert.equal(t('Từ chối', 'en'), 'Rejected');
    assert.equal(t('Hoàn thành', 'en'), 'Completed');
    assert.equal(t('Đang làm', 'en'), 'In Progress');
    assert.equal(t('Chưa làm', 'en'), 'To Do');

    // Dynamic numeric parentheses pattern
    assert.equal(t('Thông báo (5)', 'en'), 'Notifications (5)');

    // Dynamic colon pattern
    assert.equal(t('Trạng thái: Đang hoạt động', 'en'), 'Status: Active');
  });

  await tSuite.test('5. Form placeholders and validation messages translate properly', () => {
    assert.equal(t('Vui lòng nhập họ và tên của bạn.', 'en'), 'Please enter your full name.');
    assert.equal(t('Mật khẩu không khớp.', 'en'), 'Passwords do not match.');
    assert.equal(t('Vui lòng nhập đầy đủ các trường bắt buộc.', 'en'), 'Please fill in all required fields.');
    assert.equal(t('Bạn có chắc chắn muốn thực hiện thao tác này?', 'en'), 'Are you sure you want to proceed?');
    assert.equal(t('Thao tác này không thể hoàn tác.', 'en'), 'This action cannot be undone.');
  });

  await tSuite.test('6. In Vietnamese mode, preserves Vietnamese text and translates English keys', () => {
    // Preserves Vietnamese
    assert.equal(t('Bảng điều khiển', 'vi'), 'Bảng điều khiển');
    assert.equal(t('Lưu thay đổi', 'vi'), 'Lưu thay đổi');
    assert.equal(t('Chờ duyệt', 'vi'), 'Chờ duyệt');

    // Translates English key back to Vietnamese
    assert.equal(t('Dashboard', 'vi'), 'Bảng điều khiển');
    assert.equal(t('Tasks', 'vi'), 'Công việc');
    assert.equal(t('Finance', 'vi'), 'Tài chính');
    assert.equal(t('Save', 'vi'), 'Lưu thay đổi');
    assert.equal(t('Delete', 'vi'), 'Xóa');
  });

  await tSuite.test('7. Notes View Knowledge Graph subtitle translates accurately', () => {
    const rawNoteSubtitle = 'Ghi chép, liên kết ý tưởng, quản lý cuộc họp & xây dựng Knowledge Graph cá nhân.';
    const enResult = t(rawNoteSubtitle, 'en');
    assert.equal(enResult, 'Record, connect ideas, manage meetings & build a personal Knowledge Graph.');
    const viResult = t(rawNoteSubtitle, 'vi');
    assert.equal(viResult, rawNoteSubtitle);
  });
});
