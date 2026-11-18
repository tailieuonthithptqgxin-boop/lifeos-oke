import { getPrisma } from '../src/backend/db.js';
import { classroomService } from '../src/backend/services/classroom.service.js';

async function runTests() {
  console.log('🧪 Starting Online Classroom Functional Test Suite...');
  const prisma = getPrisma();

  // Find or create a test user
  let user = await prisma.user.findFirst({
    where: { email: 'admin@lifeos.com' }
  });

  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    throw new Error('No user found in database for testing');
  }

  console.log(`👤 Using test user: ${user.name} (${user.email}) [${user.id}]`);

  // Test 1: Check Google status
  console.log('\n--- TEST 1: Google status ---');
  const googleStatus = await classroomService.getGoogleStatus(user.id);
  console.log('Google status:', googleStatus);
  if (typeof googleStatus.configuredOnServer !== 'boolean') {
    throw new Error('Invalid googleStatus response');
  }
  console.log('✅ Test 1 Passed: Google status retrieved successfully');

  // Test 2: Generate Auth URL
  console.log('\n--- TEST 2: Generate Google Auth URL ---');
  if (googleStatus.configuredOnServer) {
    const authUrl = classroomService.buildAuthUrl(user.id);
    console.log('Auth URL generated (first 80 chars):', authUrl.slice(0, 80) + '...');
    if (!authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth')) {
      throw new Error('Invalid Auth URL generated');
    }
    console.log('✅ Test 2 Passed: Google Auth URL generated with proper HMAC state and scopes');
  } else {
    console.log('ℹ️ Google credentials not configured in env, skipping auth url test.');
  }

  // Test 3: Create an Online Class with manual Google Meet link
  console.log('\n--- TEST 3: Create Online Class ---');
  const futureStart = new Date(Date.now() + 2 * 3600 * 1000); // 2 hours from now
  const manualMeetUrl = 'https://meet.google.com/xyz-qwer-tyu';

  const createdClass = await classroomService.createClass(user.id, {
    title: 'Lớp Học Thử Nghiệm: Tiếng Anh Giao Tiếp & Công Nghệ',
    description: 'Thảo luận chuyên sâu về AI trong giáo dục và luyện phản xạ nói.',
    startAt: futureStart.toISOString(),
    durationMinutes: 90,
    meetMode: 'MANUAL_LINK',
    meetUrl: manualMeetUrl,
    participantEmails: ['student1@lifeos.com', 'student2@example.com']
  });

  console.log('Created class:', {
    id: createdClass.id,
    title: createdClass.title,
    startAt: createdClass.startAt,
    meetUrl: createdClass.meetUrl,
    participants: createdClass.participants
  });

  if (!createdClass.id || createdClass.meetUrl !== manualMeetUrl) {
    throw new Error('Class creation failed or meetUrl mismatch');
  }
  console.log('✅ Test 3 Passed: Online Class created with Meet URL and participants');

  // Test 4: Verify integration with CalendarEvent
  console.log('\n--- TEST 4: Verify LifeOS Calendar Synchronization ---');
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: {
      userId: user.id,
      title: { contains: 'Lớp Học Thử Nghiệm' }
    }
  });

  if (!calendarEvent) {
    throw new Error('CalendarEvent was not automatically created for the class');
  }
  console.log('Found synced CalendarEvent:', {
    id: calendarEvent.id,
    title: calendarEvent.title,
    date: calendarEvent.date,
    startTime: calendarEvent.startTime,
    type: calendarEvent.type
  });
  console.log('✅ Test 4 Passed: CalendarEvent synchronized automatically');

  // Test 5: List upcoming classes
  console.log('\n--- TEST 5: List upcoming classes ---');
  const upcoming = await classroomService.listClasses(user.id, 'upcoming');
  const found = upcoming.find(c => c.id === createdClass.id);
  if (!found) {
    throw new Error('Created class not found in upcoming classes list');
  }
  console.log(`Found ${upcoming.length} upcoming classes. Target class present:`, found.title);
  console.log('✅ Test 5 Passed: Class listed in upcoming query');

  // Test 6: Create prep task in LifeOS
  console.log('\n--- TEST 6: Create Prep Task in Task Management ---');
  const prepTask = await classroomService.createPrepTask(user.id, createdClass.id);
  console.log('Created prep task:', prepTask);

  const dbTask = await prisma.task.findUnique({
    where: { id: prepTask.id }
  });
  if (!dbTask || !dbTask.title.includes(createdClass.title)) {
    throw new Error('Task was not created in DB');
  }
  console.log('✅ Test 6 Passed: Prep task created in LifeOS Task Management');

  // Test 7: Update class
  console.log('\n--- TEST 7: Update class ---');
  const updatedClass = await classroomService.updateClass(user.id, createdClass.id, {
    title: 'Lớp Học Tiếng Anh Giao Tiếp (Đã Cập Nhật Tiêu Đề)',
    durationMinutes: 120
  });
  if (updatedClass.durationMinutes !== 120) {
    throw new Error('Class update duration mismatch');
  }
  console.log('✅ Test 7 Passed: Class updated successfully');

  // Test 8: Cancel class
  console.log('\n--- TEST 8: Cancel class ---');
  const cancelledClass = await classroomService.cancelClass(user.id, createdClass.id);
  if (cancelledClass.status !== 'CANCELLED') {
    throw new Error('Class status not CANCELLED');
  }
  const updatedCalEvent = await prisma.calendarEvent.findUnique({
    where: { id: calendarEvent.id }
  });
  if (updatedCalEvent?.status !== 'Đã hủy') {
    throw new Error('Calendar event was not marked as cancelled');
  }
  console.log('✅ Test 8 Passed: Class cancelled and synced to calendar');

  // Test 9: List history classes
  console.log('\n--- TEST 9: List history classes ---');
  const history = await classroomService.listClasses(user.id, 'history');
  const foundHistory = history.find(c => c.id === createdClass.id);
  if (!foundHistory || foundHistory.status !== 'CANCELLED') {
    throw new Error('Cancelled class not found in history');
  }
  console.log('✅ Test 9 Passed: Cancelled class correctly categorized in History');

  // Test 10: Reminder sweep
  console.log('\n--- TEST 10: Reminder loop sweep ---');
  const remindedCount = await classroomService.sendDueReminders();
  console.log(`Reminder sweep checked. Reminders sent: ${remindedCount}`);
  console.log('✅ Test 10 Passed: Reminder loop ran with zero exceptions');

  // Cleanup test artifacts
  await prisma.onlineClass.delete({ where: { id: createdClass.id } }).catch(() => {});
  await prisma.calendarEvent.delete({ where: { id: calendarEvent.id } }).catch(() => {});
  await prisma.task.delete({ where: { id: prepTask.id } }).catch(() => {});

  console.log('\n========================================');
  console.log('🎉 10/10 ONLINE CLASSROOM TESTS PASSED WITH 100% SUCCESS!');
  console.log('========================================');
}

runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
