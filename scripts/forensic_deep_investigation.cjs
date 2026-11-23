const fs = require('fs');
const path = require('path');

const suspiciousItems = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') && !trimmed.includes('TODO') && !trimmed.includes('FIXME') && !trimmed.includes('mock')) return;

    // 1. Check hardcoded fallbacks for stats: || 14, || 850, || 10, || 100, || '14', || 84
    if (/(?:streakDays|currentStreak|totalStudyMinutes|kudos|coins|userXP|streak)\s*\|\|\s*(?:[1-9]\d*)/.test(line)) {
      suspiciousItems.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        severity: '🔴 HARDCODED_STAT_FALLBACK',
        code: trimmed,
        desc: 'Có giá trị mặc định dạng fallback số cứng thay vì số 0 thật của tài khoản mới'
      });
    }

    // 2. Check localStorage reading for stats without DB sync
    if (/localStorage\.getItem\s*\(\s*['"`](lifeos_user_coins|lifeos_streak_freezes|lifeos_study_user_xp|lifeos_pet_name)/.test(line)) {
      suspiciousItems.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        severity: '🟡 LOCALSTORAGE_UNSYNCED_STATE',
        code: trimmed,
        desc: 'Đọc/ghi chỉ số tài khoản (coins, streak_freeze, xp, pet) chỉ ở localStorage mà không đồng bộ DB'
      });
    }

    // 3. Check for loops generating fake items
    if (/for\s*\(\s*(?:let|var)\s+\w+\s*=\s*\d+;\s*\w+\s*<=\s*(?:1[0-9]|20|50|100|120)/.test(line) && (content.includes('peer') || content.includes('fake') || content.includes('mock') || content.includes('bot'))) {
      suspiciousItems.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        severity: '🔴 FAKE_LOOP_GENERATOR',
        code: trimmed,
        desc: 'Vòng lặp tạo dữ liệu ảo'
      });
    }

    // 4. Check empty button clicks
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/.test(line)) {
      suspiciousItems.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        severity: '🔴 DEAD_BUTTON_EMPTY_ONCLICK',
        code: trimmed,
        desc: 'Nút bấm rỗng không có xử lý'
      });
    }

    // 5. Check alert() in onClick
    if (/onClick\s*=\s*\{\s*\(\s*\)\s*=>\s*alert\s*\(/.test(line)) {
      suspiciousItems.push({
        file: filePath.replace(/\\/g, '/'),
        line: idx + 1,
        severity: '🔴 ALERT_ONCLICK',
        code: trimmed,
        desc: 'Nút bấm gọi alert() thay vì luồng nghiệp vụ thật'
      });
    }
  });
}

function scan(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (item.name !== 'node_modules' && item.name !== '.git' && item.name !== 'dist' && item.name !== 'build') {
        scan(full);
      }
    } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
      checkFile(full);
    }
  }
}

scan('src');

console.log('Total forensic items found:', suspiciousItems.length);
suspiciousItems.forEach(item => {
  console.log(`[${item.severity}] ${item.file}:${item.line}`);
  console.log(`   ${item.code}`);
  console.log(`   -> ${item.desc}`);
});

fs.writeFileSync('scripts/forensic_suspicious_items.json', JSON.stringify(suspiciousItems, null, 2));
