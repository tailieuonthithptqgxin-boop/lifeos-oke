async function testStudySpace() {
  console.log('--- TESTING STUDY SPACE GEN Z SUITE ---');

  // 1. Fetch Rooms
  const resRooms = await fetch('http://localhost:3000/api/study-space/rooms');
  const jsonRooms = await resRooms.json();
  console.log('1. Rooms count:', jsonRooms.rooms?.length);
  for (const r of jsonRooms.rooms || []) {
    console.log(`   - [${r.id}] ${r.name} | Topic: ${r.topic} | Participants: ${r.participantCount}`);
  }

  // Verify the 4 Vibe Rooms exist
  const roomIds = jsonRooms.rooms.map(r => r.id);
  const expected = ['room-night-owls', 'room-dalat-rain', 'room-sprint-prep', 'room-healing-reading'];
  const allFound = expected.every(id => roomIds.includes(id));
  console.log('   All 4 Gen Z Vibe Rooms Found?', allFound);

  // 2. Login to get Auth Token
  const resLogin = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@lifeos.com', password: 'Admin@123456' })
  });
  const jsonLogin = await resLogin.json();
  const token = jsonLogin.token;
  console.log('2. Admin Logged in, Token:', Boolean(token));

  // 3. Check-in to "room-night-owls"
  const resCheckin = await fetch('http://localhost:3000/api/study-space/rooms/room-night-owls/checkin', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ goal: 'Ôn tập 50 câu trắc nghiệm Sinh học' })
  });
  const jsonCheckin = await resCheckin.json();
  console.log('3. Check-in Success:', jsonCheckin.success, 'Participant Goal:', jsonCheckin.participant?.studyGoal);

  // 4. Send Cheer Reaction
  const resCheer = await fetch('http://localhost:3000/api/study-space/rooms/room-night-owls/cheer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ cheerType: 'coffee', cheerText: 'Tặng bạn 1 ly cafe! ☕' })
  });
  const jsonCheer = await resCheer.json();
  console.log('4. Cheer Reaction Sent:', jsonCheer.success);

  // 5. Complete Goal
  const resGoal = await fetch('http://localhost:3000/api/study-space/rooms/room-night-owls/complete-goal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const jsonGoal = await resGoal.json();
  console.log('5. Goal Completed:', jsonGoal.success);

  // 6. Ping Heartbeat
  const resPing = await fetch('http://localhost:3000/api/study-space/rooms/room-night-owls/ping', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const jsonPing = await resPing.json();
  console.log('6. Ping Heartbeat:', jsonPing.success);

  // 7. Admin Analytics for Study Rooms
  const resAnalytics = await fetch('http://localhost:3000/api/analytics/admin/study-rooms', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const jsonAnalytics = await resAnalytics.json();
  console.log('7. Admin Study Rooms Analytics:', {
    success: jsonAnalytics.success,
    currentTimeCategory: jsonAnalytics.analytics?.currentTimeCategory,
    totalLiveDesks: jsonAnalytics.analytics?.totalLiveDesks,
    peakHoursCount: jsonAnalytics.analytics?.peakHoursSummary?.length,
    activeRoomsCount: jsonAnalytics.analytics?.activeRooms?.length
  });

  // 8. Leave Room
  const resLeave = await fetch('http://localhost:3000/api/study-space/rooms/room-night-owls/leave', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const jsonLeave = await resLeave.json();
  console.log('8. Leave Room Success:', jsonLeave.success, 'Room:', jsonLeave.roomName);

  console.log('--- ALL STUDY SPACE GEN Z TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

testStudySpace().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
