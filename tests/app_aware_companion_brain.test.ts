import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  companionBrain, 
  CompanionUIContext 
} from '../src/lib/companion/companionBrain';
import { 
  getCharacterProfile 
} from '../src/lib/companion/characterRegistry';
import { 
  companionTelemetry 
} from '../src/lib/companion/companionTelemetry';

describe('App-Aware AI Study Companion Brain Test Suite', () => {
  const lumi = getCharacterProfile('lumi');
  const bunny = getCharacterProfile('bunny');

  // Test A: "Trang này là gì?" khi ở /automation
  it('Test A: giải thích chính xác Automation Engine khi ở /automation', () => {
    const context: CompanionUIContext = {
      currentView: 'automation',
      activeTab: 'dashboard'
    };

    const result = companionBrain.processQuery('Trang này là gì?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.strictEqual(result.role, 'APP_ASSISTANT');
    assert.ok(result.text.includes('Tự Động Hóa') || result.text.includes('Automation'));
    assert.ok(result.text.includes('10 tab') || result.text.includes('Builder'));
    assert.strictEqual(result.actionView, 'automation');
  });

  // Test B: "Nút này làm gì?" khi trỏ vào nút Test Automation
  it('Test B: giải thích chính xác nút chạy thử nghiệm simulation', () => {
    const context: CompanionUIContext = {
      currentView: 'automation',
      activeTab: 'simulation',
      clickedElement: {
        action: 'test_simulation',
        label: 'Chạy thử nghiệm'
      }
    };

    const result = companionBrain.processQuery('Nút này làm gì?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.ok(result.text.includes('Dry-run') || result.text.includes('thử nghiệm'));
    assert.ok(result.text.includes('KHÔNG') && result.text.includes('dữ liệu thật'));
  });

  // Test C: "Tôi muốn học từ vựng thì làm thế nào?"
  it('Test C: hướng dẫn quy trình học từ vựng Spaced Repetition (SM-2) và 4 nút đánh giá', () => {
    const context: CompanionUIContext = {
      currentView: 'dashboard'
    };

    const result = companionBrain.processQuery('Tôi muốn học từ vựng thì làm thế nào?', context, bunny);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'STUDY_SUPPORT');
    assert.strictEqual(result.role, 'STUDY_COMPANION');
    assert.ok(result.text.includes('Active Recall') || result.text.includes('Flashcard'));
    assert.ok(result.text.includes('1 (Lại)'));
    assert.ok(result.text.includes('2 (Khó)'));
    assert.ok(result.text.includes('3 (Tốt)'));
    assert.ok(result.text.includes('4 (Dễ)'));
    assert.strictEqual(result.actionView, 'study');
  });

  // Test D: "Làm sao để tạo một task có checklist?"
  it('Test D: hướng dẫn tạo nhiệm vụ có Subtasks checklist', () => {
    const context: CompanionUIContext = {
      currentView: 'tasks'
    };

    const result = companionBrain.processQuery('Làm sao để tạo một task có checklist?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.ok(result.text.includes('Nhiệm vụ con (Subtasks)'));
    assert.ok(result.text.includes('thanh tiến độ %'));
    assert.strictEqual(result.actionView, 'tasks');
  });

  // Test E: "Tại sao tôi không xem được phần này?" khi gặp tính năng bị khóa
  it('Test E: giải thích tính năng yêu cầu Pro/Team và hướng dẫn nâng cấp VietQR', () => {
    const context: CompanionUIContext = {
      currentView: 'automation',
      userState: {
        role: 'USER',
        subscriptionStatus: 'FREE'
      }
    };

    const result = companionBrain.processQuery('Tại sao tôi không xem được phần này?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.ok(result.text.includes('gói hội viên Pro hoặc Team') || result.text.includes('nâng cấp'));
    assert.ok(result.text.includes('VietQR'));
    assert.strictEqual(result.actionView, 'subscription');
  });

  // Test F: "Focus Mode khác gì với Timer thường?"
  it('Test F: phân tích 4 điểm khác biệt của Focus Mode so với đồng hồ thường', () => {
    const context: CompanionUIContext = {
      currentView: 'focus'
    };

    const result = companionBrain.processQuery('Focus Mode khác gì với Timer thường?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'STUDY_SUPPORT');
    assert.ok(result.text.includes('Deep Work') || result.text.includes('âm thanh'));
    assert.ok(result.text.includes('Streak') || result.text.includes('Nhật ký'));
    assert.ok(result.text.includes('Nhiệm vụ') || result.text.includes('giờ làm việc'));
    assert.strictEqual(result.actionView, 'focus');
  });

  // Test G: "Bật nó ở đâu?" sau khi hỏi về Focus Mode (Deictic word + Conversation memory)
  it('Test G: giải mã đại từ "nó" dựa trên conversation memory để chỉ đúng Focus Mode', () => {
    const context: CompanionUIContext = {
      currentView: 'dashboard',
      conversationHistory: [
        { sender: 'user', text: 'Focus Mode là gì?', timestamp: Date.now() - 5000 },
        { sender: 'companion', text: 'Focus Mode là không gian tập trung sâu...', timestamp: Date.now() - 4000 }
      ]
    };

    const result = companionBrain.processQuery('Bật nó ở đâu?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.ok(result.text.includes('Focus Mode') || result.text.includes('/focus'));
    assert.strictEqual(result.actionView, 'focus');
  });

  // Test H: "Ứng dụng này có tính năng gửi email hàng loạt không?" (Anti-hallucination)
  it('Test H: từ chối trung thực và không bịa đặt tính năng gửi email hàng loạt', () => {
    const context: CompanionUIContext = {
      currentView: 'dashboard'
    };

    const result = companionBrain.processQuery('Ứng dụng này có tính năng gửi email hàng loạt không?', context, lumi);
    assert.strictEqual(result.isAllowed, false);
    assert.strictEqual(result.category, 'NON_EXISTENT_FEATURE');
    assert.ok(result.text.includes('không có tính năng "Gửi email hàng loạt'));
    assert.ok(result.text.includes('LifeOS là hệ điều hành'));
  });

  // Test I: "Hôm nay tôi mệt quá không muốn học" (Role Engine & Empathy)
  it('Test I: đóng vai Study Companion động viên cảm xúc và đề xuất giải pháp nghỉ ngơi', () => {
    const context: CompanionUIContext = {
      currentView: 'study'
    };

    const result = companionBrain.processQuery('Hôm nay tôi mệt quá không muốn học', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'STUDY_SUPPORT');
    assert.strictEqual(result.role, 'STUDY_COMPANION');
    assert.ok(result.text.includes('mệt mỏi là hoàn toàn bình thường') || result.text.includes('Đừng ép buộc'));
    assert.ok(result.text.includes('Streak') || result.text.includes('nghỉ ngơi'));
  });

  // Test J: "LifeOS là gì?" (App Overview)
  it('Test J: giới thiệu toàn diện hệ điều hành LifeOS', () => {
    const context: CompanionUIContext = {
      currentView: 'dashboard'
    };

    const result = companionBrain.processQuery('LifeOS là gì?', context, lumi);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.ok(result.text.includes('LifeOS'));
    assert.ok(result.text.includes('Study OS') || result.text.includes('Từ vựng'));
    assert.ok(result.text.includes('Pomodoro') || result.text.includes('Nhiệm vụ'));
  });

  // Test K: "Tab Mô phỏng trong Automation dùng để làm gì?" (Sub-feature knowledge)
  it('Test K: giải thích chi tiết mục đích và cách dùng của Tab Simulation', () => {
    const context: CompanionUIContext = {
      currentView: 'automation',
      activeTab: 'simulation'
    };

    const result = companionBrain.processQuery('Tab Mô phỏng trong Automation dùng để làm gì?', context, bunny);
    assert.strictEqual(result.isAllowed, true);
    assert.strictEqual(result.category, 'APP_HELP');
    assert.ok(result.text.includes('Phòng Giả Lập') || result.text.includes('Mô phỏng'));
    assert.ok(result.text.includes('Dry-run') || result.text.includes('giả lập'));
    assert.ok(result.text.includes('KHÔNG làm bẩn') || result.text.includes('dữ liệu'));
  });

  // Additional Test: Telemetry Feedback & Unknown Question Logging
  it('Test Telemetry: lưu trữ đánh giá 👍/👎 và ghi nhận unknown questions', () => {
    companionTelemetry.clearTelemetry();

    // 1. Thumbs Up
    const fbUp = companionTelemetry.recordFeedback({
      messageId: 'msg_test_1',
      rating: 'up',
      userQuery: 'Focus Mode là gì?',
      assistantResponse: 'Là Pomodoro tập trung sâu...',
      viewId: 'focus'
    });
    assert.strictEqual(fbUp.rating, 'up');

    // 2. Thumbs Down
    const fbDown = companionTelemetry.recordFeedback({
      messageId: 'msg_test_2',
      rating: 'down',
      userQuery: 'Cách bay lên sao hỏa?',
      assistantResponse: 'Không hỗ trợ...',
      viewId: 'dashboard'
    });
    assert.strictEqual(fbDown.rating, 'down');

    const history = companionTelemetry.getFeedbackHistory();
    assert.strictEqual(history.length, 2);

    // 3. Unknown Question log
    const unk = companionTelemetry.recordUnknownQuestion({
      query: 'Có tích hợp máy pha cà phê bluetooth không?',
      viewId: 'dashboard',
      confidenceScore: 'LOW',
      fallbackReason: 'Non-existent hardware integration'
    });
    assert.strictEqual(unk.confidenceScore, 'LOW');

    const unkList = companionTelemetry.getUnknownQuestions();
    assert.strictEqual(unkList.length, 1);
    assert.ok(unkList[0].query.includes('pha cà phê'));
  });
});
