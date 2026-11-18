import { getPrisma } from '../src/backend/db.ts';

const API_BASE = 'http://localhost:3000';

async function run() {
  console.log('\n======================================================');
  console.log('🧪 VERIFYING UNIFIED SCHEDULE & TASKS MODULE');
  console.log('======================================================\n');

  // 1. Login as Admin
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@lifeos.com', password: 'Admin@123456' })
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status}`);
  }

  const loginData = await loginRes.json();
  console.log('  Login user:', loginData.user?.email, 'id:', loginData.user?.id);
  const token = loginData.token;
  const cookie = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Cookie': cookie
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Test 1: Create a task with date and time (e.g. from Calendar slot click)
  console.log('--- TEST 1: CREATE TASK WITH DATE & TIME (CALENDAR SLOT) ---');
  const runTs = Date.now();
  const createScheduledRes = await fetch(`${API_BASE}/api/data/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `Họp giao ban sprint đầu tuần ${runTs}`,
      priority: 'Cao',
      status: 'Chưa làm',
      dueDate: todayStr,
      timeSlot: '09:00',
      estimatedHours: 1.5
    })
  });
  const scheduledTask = await createScheduledRes.json();
  console.log('  Created scheduled task:', scheduledTask.id, 'timeSlot:', scheduledTask.timeSlot, 'startDate:', scheduledTask.startDate);
  if (!scheduledTask.id || scheduledTask.timeSlot !== '09:00') {
    throw new Error('Test 1 Failed: Task does not have timeSlot 09:00');
  }
  console.log('  ✅ PASS: Task created with date & time preserved');

  // Test 2: Create an all-day / unscheduled task (no timeSlot)
  console.log('\n--- TEST 2: CREATE UNSCHEDULED TASK (NOT FORCED TO 00:00) ---');
  const createUnscheduledRes = await fetch(`${API_BASE}/api/data/tasks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `Đọc tài liệu kiến trúc phần mềm ${runTs}`,
      priority: 'Trung bình',
      status: 'Chưa làm',
      dueDate: todayStr
    })
  });
  const unscheduledTask = await createUnscheduledRes.json();
  console.log('  Created unscheduled task:', unscheduledTask.id, 'timeSlot:', unscheduledTask.timeSlot, 'startDate:', unscheduledTask.startDate);
  if (unscheduledTask.timeSlot === '00:00' || unscheduledTask.startDate === '00:00') {
    throw new Error('Test 2 Failed: Unscheduled task was incorrectly forced into 00:00 slot!');
  }
  console.log('  ✅ PASS: Unscheduled task correctly has no time slot');

  // Test 3: Drag & drop unscheduled task into timeline (assigning 14:00)
  console.log('\n--- TEST 3: TIMEBOX UNSCHEDULED TASK TO 14:00 (DRAG & DROP SYNC) ---');
  const updateTimeRes = await fetch(`${API_BASE}/api/data/tasks/${unscheduledTask.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      timeSlot: '14:00',
      startDate: '14:00',
      dueDate: todayStr
    })
  });
  const updatedTimeTask = await updateTimeRes.json();
  console.log('  Updated task timeSlot:', updatedTimeTask.timeSlot);
  if (updatedTimeTask.timeSlot !== '14:00') {
    throw new Error('Test 3 Failed: Task timeSlot was not updated to 14:00');
  }
  console.log('  ✅ PASS: Drag-and-drop / Timebox update persisted bidirectional');

  // Test 4: Complete task on Calendar / Today
  console.log('\n--- TEST 4: COMPLETE TASK (STATUS SYNC ACROSS VIEWS) ---');
  const completeRes = await fetch(`${API_BASE}/api/data/tasks/${scheduledTask.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      status: 'Hoàn thành'
    })
  });
  const completedTask = await completeRes.json();
  console.log('  Completed task status:', completedTask.status);
  if (completedTask.status !== 'Hoàn thành') {
    throw new Error('Test 4 Failed: Task status was not updated to Hoàn thành');
  }
  console.log('  ✅ PASS: Task status completion synced');

  // Test 5: Verify fetching tasks from collection
  console.log('\n--- TEST 5: GET ALL TASKS (SINGLE SOURCE OF TRUTH VERIFICATION) ---');
  const getTasksRes = await fetch(`${API_BASE}/api/data/tasks`, { headers });
  const allTasks = await getTasksRes.json();
  const fetchedScheduled = allTasks.find(t => t.id === scheduledTask.id);
  const fetchedUnscheduled = allTasks.find(t => t.id === unscheduledTask.id);
  console.log('  fetchedScheduled:', fetchedScheduled);
  console.log('  fetchedUnscheduled:', fetchedUnscheduled);

  if (!fetchedScheduled || fetchedScheduled.status !== 'Hoàn thành' || fetchedScheduled.timeSlot !== '09:00') {
    throw new Error('Test 5 Failed: Single source of truth mismatch on scheduled task');
  }
  if (!fetchedUnscheduled || fetchedUnscheduled.timeSlot !== '14:00') {
    throw new Error('Test 5 Failed: Single source of truth mismatch on updated task');
  }
  console.log('  ✅ PASS: Single source of truth verified across all tasks');

  // Cleanup test items
  await fetch(`${API_BASE}/api/data/tasks/${scheduledTask.id}`, { method: 'DELETE', headers });
  await fetch(`${API_BASE}/api/data/tasks/${unscheduledTask.id}`, { method: 'DELETE', headers });
  console.log('  Cleaned up test tasks');

  console.log('\n======================================================');
  console.log('🎉 ALL UNIFIED SCHEDULE & TASKS TESTS PASSED!');
  console.log('======================================================\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
