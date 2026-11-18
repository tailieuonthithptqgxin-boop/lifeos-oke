const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        walk(filePath, fileList);
      }
    } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = walk('./src');

// 1. Check for <img> tags without width/height/aspect-ratio or min-height
const imgLayoutShift = [];

// 2. Check for loading states without finally
const loadingHangs = [];

// 3. Check for window/document addEventListener inside useEffect that don't return cleanup
const uncleanedListeners = [];

// 4. Check for setTimeout inside useEffect without clearTimeout in cleanup
const uncleanedTimeouts = [];

// 5. Check for buttons inside forms or buttons in general without type
const buttonsWithoutType = [];

// 6. Check for scroll event listeners without passive: true or throttle/debounce
const unoptimizedScroll = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');

  // Check <img>
  const imgMatches = content.match(/<img\b[^>]*>/g) || [];
  for (const img of imgMatches) {
    if (!img.includes('aspect-') && !img.includes('h-') && !img.includes('height') && !img.includes('w-') && !img.includes('width')) {
      imgLayoutShift.push({ file, img: img.slice(0, 80) });
    }
  }

  // Check buttons
  const btnMatches = content.match(/<button\b(?![^>]*\btype=)[^>]*>/g) || [];
  if (btnMatches.length > 0) {
    buttonsWithoutType.push({ file, count: btnMatches.length });
  }

  // Check scroll listeners
  if (content.includes("addEventListener('scroll'") || content.includes('addEventListener("scroll"')) {
    if (!content.includes('passive: true') && !content.includes('passive:true')) {
      unoptimizedScroll.push(file);
    }
  }

  // Check useEffect with addEventListener
  const effectMatches = content.match(/useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\},/g) || [];
  for (const effect of effectMatches) {
    if (effect.includes('addEventListener') && !effect.includes('removeEventListener') && !effect.includes('return () =>')) {
      uncleanedListeners.push({ file, effect: effect.slice(0, 100) });
    }
    if (effect.includes('setInterval') && !effect.includes('clearInterval')) {
      uncleanedTimeouts.push({ file, type: 'setInterval', effect: effect.slice(0, 100) });
    }
  }

  // Check async loading
  const asyncFuncs = content.match(/(?:const|async function)\s+([a-zA-Z0-9_]+)\s*=\s*async[\s\S]*?\{[\s\S]*?\n  \};/g) || [];
  for (const fn of asyncFuncs) {
    if (fn.includes('setLoading(true)') || fn.includes('setIsLoading(true)') || fn.includes('setSubmitting(true)') || fn.includes('setSaving(true)')) {
      if (!fn.includes('finally')) {
        loadingHangs.push({ file, fnName: fn.slice(0, 50) });
      }
    }
  }
}

console.log('=== 1. UNSIZED IMAGES (LAYOUT SHIFT) ===', imgLayoutShift.length);
if (imgLayoutShift.length) console.log(imgLayoutShift.slice(0, 10));

console.log('=== 2. LOADING WITHOUT FINALLY ===', loadingHangs.length);
if (loadingHangs.length) console.log(loadingHangs.slice(0, 10));

console.log('=== 3. UNCLEANED LISTENERS IN EFFECT ===', uncleanedListeners.length);
if (uncleanedListeners.length) console.log(uncleanedListeners);

console.log('=== 4. UNCLEANED TIMEOUTS/INTERVALS ===', uncleanedTimeouts.length);
if (uncleanedTimeouts.length) console.log(uncleanedTimeouts);

console.log('=== 5. UNOPTIMIZED SCROLL LISTENERS ===', unoptimizedScroll);

console.log('=== 6. BUTTONS WITHOUT TYPE ===', buttonsWithoutType.length, 'Total:', buttonsWithoutType.reduce((a,b)=>a+b.count,0));
