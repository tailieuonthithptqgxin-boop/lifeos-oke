import fs from 'fs';
import path from 'path';

function search(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') search(full);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(file)) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/speechSynthesis|SpeechSynthesisUtterance|playAudio|speakWord|playPronunciation|speak\(|pronounce/i.test(line)) {
          console.log(`${full}:${idx + 1}: ${line.trim().slice(0, 120)}`);
        }
      });
    }
  });
}

search('src');
