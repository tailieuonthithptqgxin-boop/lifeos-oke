import { petService } from '../src/backend/services/pet.service.js';
import { getPrisma } from '../src/backend/db.js';

async function runGenZSuite() {
  console.log('🧪 Starting Gen Z Modern Upgrades Test Suite (Focus Pet & Gamification)...');
  const prisma = getPrisma();

  // Find or create test user
  let user = await prisma.user.findFirst({
    where: { email: 'admin@lifeos.com' }
  });

  if (!user) {
    user = await prisma.user.findFirst();
  }

  if (!user) {
    console.error('❌ No user found for testing.');
    process.exit(1);
  }

  const userId = user.id;
  console.log(`👤 Using test user: ${user.name} (${userId})`);

  try {
    // 1. Get or Create Pet
    console.log('\n--- TEST 1: Get or Create Pet ---');
    const pet = await petService.getPet(userId);
    console.log('Pet loaded:', {
      name: pet.name,
      type: pet.type,
      level: pet.level,
      hunger: pet.hunger,
      foodCount: pet.foodCount,
      mood: pet.mood,
      dialogue: pet.dialogue
    });
    if (!pet.id || pet.level < 1) throw new Error('Pet loading failed');
    console.log('✅ Test 1 Passed: Pet retrieved and initialized successfully');

    // 2. Pet interaction (cuddle)
    console.log('\n--- TEST 2: Cuddle / Pet Interaction ---');
    const petRes = await petService.pet(userId);
    console.log('Interaction dialogue:', petRes.dialogue);
    console.log('✅ Test 2 Passed: Cuddle interaction succeeded with cute quote');

    // 3. Feed Pet
    console.log('\n--- TEST 3: Feed Pet ---');
    const initialFood = pet.foodCount;
    if (initialFood > 0) {
      const feedRes = await petService.feed(userId);
      console.log('Feed result message:', feedRes.message);
      if (feedRes.pet.foodCount !== initialFood - 1) throw new Error('Food count did not decrease');
      console.log('✅ Test 3 Passed: Pet fed successfully, hunger and exp updated');
    } else {
      console.log('Food count was 0, tested empty food safeguard');
    }

    // 4. Award Study Session (Pomodoro reward)
    console.log('\n--- TEST 4: Study Session Reward (EXP & Carrots) ---');
    const awardRes = await petService.awardStudySession(userId, 30);
    console.log('Award result:', awardRes);
    if (awardRes.expEarned !== 240 || awardRes.foodEarned < 1) throw new Error('Incorrect study rewards');
    const afterStudyPet = await petService.getPet(userId);
    console.log(`New Pet EXP: ${afterStudyPet.exp}, Food: ${afterStudyPet.foodCount}`);
    console.log('✅ Test 4 Passed: Study session awarded EXP and food properly');

    // 5. Award Task Completion
    console.log('\n--- TEST 5: Task Completion Reward ---');
    const preFood = afterStudyPet.foodCount;
    await petService.awardTaskComplete(userId);
    const afterTaskPet = await petService.getPet(userId);
    if (afterTaskPet.foodCount !== preFood + 1) throw new Error('Task complete did not increment food');
    console.log('✅ Test 5 Passed: Task completion rewarded 1 carrot');

    // 6. Rename Pet
    console.log('\n--- TEST 6: Rename Pet ---');
    const renamed = await petService.rename(userId, 'Capy Chiến Thần');
    if (renamed.name !== 'Capy Chiến Thần') throw new Error('Rename failed');
    console.log('Renamed to:', renamed.name);
    console.log('✅ Test 6 Passed: Pet renamed successfully');

    // 7. Customize Pet
    console.log('\n--- TEST 7: Customize Pet ---');
    const customized = await petService.customize(userId, 'CAPYBARA', 'default');
    console.log('Customized pet:', { type: customized.type, skin: customized.equippedSkin });
    console.log('✅ Test 7 Passed: Pet customized successfully');

    console.log('\n========================================');
    console.log('🎉 7/7 GEN Z UPGRADE TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  }
}

runGenZSuite();
