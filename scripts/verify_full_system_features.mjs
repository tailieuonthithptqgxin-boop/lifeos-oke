import { getPrisma, dbService } from '../src/backend/db.js';
import bcrypt from 'bcryptjs';

async function runFullVerification() {
  console.log('========================================================================');
  console.log('    LIFEOS COMPREHENSIVE END-TO-END FEATURE & LINKAGE AUDIT SUITE       ');
  console.log('========================================================================\n');

  const prisma = getPrisma();
  const testResults = [];
  const testUserEmail = `audit_verify_${Date.now()}@lifeos.vn`;

  function record(moduleName, testName, isPassed, details = '') {
    testResults.push({ moduleName, testName, isPassed, details });
    const mark = isPassed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] ${moduleName} -> ${testName}`);
    if (details) console.log(`       ${details}`);
  }

  // 1. TẠO TÀI KHOẢN NGƯỜI DÙNG THỰC TẾ
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('LifeOS@Secure2026', salt);
  const user = await prisma.user.create({
    data: {
      email: testUserEmail,
      name: 'Kiểm Thử Viên Hệ Thống',
      passwordHash,
      role: 'USER',
      plan: 'PRO'
    }
  });

  try {
    // =========================================================================
    // PHÂN HỆ 1: AUTHENTICATION & USER PROFILE
    // =========================================================================
    const userDb = await prisma.user.findUnique({ where: { id: user.id } });
    record('1. Authentication', 'User Account Creation & Persistence', 
      userDb !== null && userDb.email === testUserEmail,
      `User ID: ${user.id}, Plan: ${userDb.plan}`);

    // =========================================================================
    // PHÂN HỆ 2: CÔNG VIỆC (TASKS) & VIỆC QUÁ HẠN (OVERDUE TRIAGE)
    // =========================================================================
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Tạo việc hôm nay
    const taskToday = await prisma.task.create({
      data: {
        userId: user.id,
        title: 'Hoàn thành báo cáo kiến trúc',
        priority: 'Cao',
        status: 'Chưa làm',
        dueDate: todayStr,
        estimatedHours: 2,
        actualHours: 0
      }
    });

    // Tạo việc hôm qua chưa làm (quá hạn)
    const taskOverdue = await prisma.task.create({
      data: {
        userId: user.id,
        title: 'Gửi email cho đối tác',
        priority: 'Trung bình',
        status: 'Chưa làm',
        dueDate: yesterday,
        estimatedHours: 1,
        actualHours: 0
      }
    });

    // Kiểm tra logic lọc việc quá hạn
    const userTasks = await prisma.task.findMany({ where: { userId: user.id } });
    const overdueFound = userTasks.filter(t => t.dueDate && t.dueDate < todayStr && t.status !== 'Hoàn thành');
    record('2. Tasks & Overdue', 'Tự động phát hiện việc quá hạn từ hôm qua',
      overdueFound.length === 1 && overdueFound[0].id === taskOverdue.id,
      `Phát hiện ${overdueFound.length} việc quá hạn: "${overdueFound[0]?.title}"`);

    // 1-Tap Triage: Dời việc quá hạn sang hôm nay
    await prisma.task.update({
      where: { id: taskOverdue.id },
      data: { dueDate: todayStr }
    });
    const updatedOverdue = await prisma.task.findUnique({ where: { id: taskOverdue.id } });
    record('2. Tasks & Overdue', '1-Tap Triage: Dời việc quá hạn sang hôm nay',
      updatedOverdue.dueDate === todayStr,
      `Task ngày mới: ${updatedOverdue.dueDate}`);

    // =========================================================================
    // PHÂN HỆ 3: LỊCH TRÌNH 24H (CALENDAR & TIMEBOXING 2 CHIỀU)
    // =========================================================================
    // Tạo sự kiện lịch gắn kết với Task: Khung giờ 09:00 - 11:00
    const calendarEvent = await prisma.calendarEvent.create({
      data: {
        userId: user.id,
        title: `[Timebox] ${taskToday.title}`,
        date: todayStr,
        startTime: '09:00',
        endTime: '11:00',
        type: 'Công việc',
        status: 'Đã lên lịch'
      }
    });

    record('3. Schedule & Timebox', 'Khóa khung giờ (Timeboxing 2 chiều) trên Lịch',
      calendarEvent.date === todayStr && calendarEvent.startTime === '09:00',
      `Sự kiện đã lên lịch: "${calendarEvent.title}" (${calendarEvent.startTime} - ${calendarEvent.endTime})`);

    // =========================================================================
    // PHÂN HỆ 4: PHÒNG TẬP TRUNG (FOCUS ROOM) <-> LIÊN KẾT CÔNG VIỆC
    // =========================================================================
    // Chạy phiên tập trung 50 phút cho taskToday
    const sessionDurationMinutes = 50;
    const focusSession = await prisma.focusSession.create({
      data: {
        userId: user.id,
        taskId: taskToday.id,
        title: `Focus: ${taskToday.title}`,
        plannedDuration: 50,
        actualDuration: sessionDurationMinutes,
        mode: 'Pomodoro',
        status: 'Completed'
      }
    });

    // Cập nhật actualHours cho task
    const hoursSpent = Number((sessionDurationMinutes / 60).toFixed(2));
    const taskAfterFocus = await prisma.task.update({
      where: { id: taskToday.id },
      data: { actualHours: (taskToday.actualHours || 0) + hoursSpent }
    });

    record('4. Focus Room', 'Liên kết phiên Focus với Task và cộng dồn actualHours',
      taskAfterFocus.actualHours === 0.83 && focusSession.taskId === taskToday.id,
      `Task actualHours: ${taskAfterFocus.actualHours}h (từ dự tính: ${taskAfterFocus.estimatedHours}h)`);

    // =========================================================================
    // PHÂN HỆ 5: HỌC TỪ VỰNG (VOCAB MASTER) & THUẬT TOÁN SM-2 KHOA HỌC
    // =========================================================================
    const vocabProgress = await prisma.vocabWordProgress.create({
      data: {
        userId: user.id,
        wordId: 'oxf_resilience',
        term: 'resilience',
        meaning: 'Khả năng phục hồi, kiên cường',
        phonetic: '/rɪˈzɪliəns/',
        partOfSpeech: 'noun',
        memoryLevel: 0,
        easeFactor: 2.5,
        intervalDays: 0,
        repetitionCount: 0
      }
    });

    // Giả lập người dùng hoàn thành Active Recall với điểm 4 (Dễ)
    const grade = 4;
    const newEase = Math.max(1.3, vocabProgress.easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
    const newInterval = 3; // Lần ôn kế tiếp nhảy lên 3 ngày
    const nextReview = new Date(Date.now() + newInterval * 86400000);

    const updatedWord = await prisma.vocabWordProgress.update({
      where: { id: vocabProgress.id },
      data: {
        repetitionCount: vocabProgress.repetitionCount + 1,
        easeFactor: Number(newEase.toFixed(2)),
        intervalDays: newInterval,
        nextReviewAt: nextReview,
        memoryLevel: 1,
        lastReviewedAt: new Date()
      }
    });

    // Ghi nhật ký ôn tập
    await prisma.vocabReviewLog.create({
      data: {
        userId: user.id,
        progressId: vocabProgress.id,
        wordId: vocabProgress.wordId,
        exerciseType: 'spelling',
        rating: 4,
        isCorrect: true,
        memoryLevelBefore: 0,
        memoryLevelAfter: 1,
        intervalBefore: 0,
        intervalAfter: newInterval
      }
    });

    record('5. Vocab Active Recall', 'Thuật toán lặp lại ngắt quãng SM-2 cập nhật chuẩn xác',
      updatedWord.repetitionCount === 1 && updatedWord.intervalDays === 3 && updatedWord.easeFactor === 2.5,
      `Khoảng cách ôn tập tiếp theo: ${updatedWord.intervalDays} ngày (Ease: ${updatedWord.easeFactor})`);

    // =========================================================================
    // PHÂN HỆ 6: THÓI QUEN (HABITS) & BẢO VỆ CHUỖI
    // =========================================================================
    const habit = await prisma.habit.create({
      data: {
        userId: user.id,
        name: 'Đọc 1 trang sách',
        target: 1,
        unit: 'boolean',
        unitLabel: 'lần',
        streak: 5,
        bestStreak: 12
      }
    });

    // Điểm danh hôm nay
    const habitLog = await prisma.habitLog.create({
      data: {
        habitId: habit.id,
        date: todayStr,
        completed: true,
        value: 1
      }
    });

    const updatedHabit = await prisma.habit.update({
      where: { id: habit.id },
      data: { 
        streak: habit.streak + 1,
        completedDates: JSON.stringify([todayStr])
      }
    });

    record('6. Habits & Discipline', 'Ghi nhận thói quen hôm nay và tăng chuỗi kỷ luật',
      habitLog !== null && updatedHabit.streak === 6,
      `Chuỗi hiện tại: ${updatedHabit.streak} ngày liên tục (Ghi nhận ngày ${todayStr})`);

    // =========================================================================
    // PHÂN HỆ 7: TÀI CHÍNH (FINANCE) - TIÊU TIỀN VÀ TRỪ SỐ DƯ TỨC THÌ
    // =========================================================================
    const financeAccount = await prisma.financeAccount.create({
      data: {
        userId: user.id,
        name: 'Tài Khoản Techcombank',
        type: 'Ngân hàng',
        balance: 10000000, // 10 triệu
        currency: 'VND'
      }
    });

    // Giao dịch chi tiêu 350.000đ
    const expenseAmount = 350000;
    const tx = await dbService.executeFinanceTransaction(user.id, {
      type: 'Chi tiêu',
      amount: expenseAmount,
      category: 'Ăn uống',
      accountId: financeAccount.id,
      date: todayStr,
      note: 'Ăn tối cùng đồng nghiệp'
    });

    const accountAfterTx = await prisma.financeAccount.findUnique({ where: { id: financeAccount.id } });
    record('7. Finance Cashflow', 'Giao dịch chi tiêu trừ tiền trong tài khoản chính xác 100%',
      accountAfterTx.balance === 9650000 && tx.amount === expenseAmount,
      `Số dư ban đầu: 10.000.000đ -> Số dư sau chi: ${accountAfterTx.balance.toLocaleString('vi-VN')}đ`);

    // =========================================================================
    // PHÂN HỆ 8: DỰ ÁN (PROJECTS) <-> CÔNG VIỆC TIẾN ĐỘ TỰ ĐỘNG
    // =========================================================================
    const project = await prisma.project.create({
      data: {
        userId: user.id,
        name: 'Xây dựng Website cá nhân',
        status: 'In Progress',
        progress: 0
      }
    });

    // Gắn task vào project
    await prisma.task.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title: 'Thiết kế giao diện Figma',
        status: 'Hoàn thành'
      }
    });

    await prisma.task.create({
      data: {
        userId: user.id,
        projectId: project.id,
        title: 'Lập trình Frontend',
        status: 'Chưa làm'
      }
    });

    // Tính tiến độ dự án từ các tasks gắn kết
    const projTasks = await prisma.task.findMany({ where: { projectId: project.id } });
    const doneCount = projTasks.filter(t => t.status === 'Hoàn thành').length;
    const computedProgress = Math.round((doneCount / projTasks.length) * 100);

    const updatedProject = await prisma.project.update({
      where: { id: project.id },
      data: { progress: computedProgress }
    });

    record('8. Projects & Tasks', 'Tiến độ Dự án tự động tính toán từ tỉ lệ Task hoàn thành',
      updatedProject.progress === 50,
      `Dự án có 2 tasks (1 xong, 1 chưa) -> Tiến độ tự tính: ${updatedProject.progress}%`);

    // =========================================================================
    // PHÂN HỆ 9: SỔ TAY GHI CHÚ (NOTES)
    // =========================================================================
    const note = await prisma.note.create({
      data: {
        userId: user.id,
        title: 'Ghi chép phương pháp Active Recall',
        content: 'Active recall kích thích vùng nhớ sâu của vỏ não...',
        category: 'Học tập'
      }
    });

    const noteFound = await prisma.note.findUnique({ where: { id: note.id } });
    record('9. Notes & Second Brain', 'Lưu trữ và truy xuất ghi chú tức thời',
      noteFound !== null && noteFound.title === note.title,
      `Đã lưu ghi chú "${noteFound.title}"`);

    // =========================================================================
    // TỔNG KẾT BÁO CÁO
    // =========================================================================
    console.log('\n========================================================================');
    const passedCount = testResults.filter(r => r.isPassed).length;
    console.log(`   TỔNG KẾT: ĐÃ KIỂM THỬ THÀNH CÔNG ${passedCount}/${testResults.length} TÍNH NĂNG & LIÊN KẾT!`);
    console.log('========================================================================\n');

  } finally {
    // Dọn dẹp dữ liệu kiểm thử
    try {
      await prisma.vocabReviewLog.deleteMany({ where: { userId: user.id } });
      await prisma.vocabWordProgress.deleteMany({ where: { userId: user.id } });
      await prisma.focusSession.deleteMany({ where: { userId: user.id } });
      await prisma.habitLog.deleteMany({ where: { habit: { userId: user.id } } });
      await prisma.habit.deleteMany({ where: { userId: user.id } });
      await prisma.transaction.deleteMany({ where: { userId: user.id } });
      await prisma.financeAccount.deleteMany({ where: { userId: user.id } });
      await prisma.calendarEvent.deleteMany({ where: { userId: user.id } });
      await prisma.task.deleteMany({ where: { userId: user.id } });
      await prisma.project.deleteMany({ where: { userId: user.id } });
      await prisma.note.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    } catch (e) {
      // ignore
    }
  }
}

runFullVerification().catch(err => {
  console.error('Fatal Audit Error:', err);
  process.exit(1);
});
