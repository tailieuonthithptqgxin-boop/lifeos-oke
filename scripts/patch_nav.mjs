import fs from 'fs';

// 1. Patch SidebarCustomizerModal.tsx
let modalContent = fs.readFileSync('src/components/SidebarCustomizerModal.tsx', 'utf8');

const targetStudy = `{ id: 'study' as ViewState, labelVi: 'Học tập & Từ vựng', labelEn: 'Study & Vocab', iconEmoji: '📚', descVi: 'Flashcards Spaced Repetition (JLPT, IELTS, HSK)', descEn: 'Spaced Repetition flashcards (JLPT, IELTS, HSK)', group: 'space' },`;

const addModules = `  { id: 'study-space' as ViewState, labelVi: 'Sảnh Học & Co-working 👑', labelEn: 'Study Space & Co-working 👑', iconEmoji: '👑', descVi: 'Không gian học trực tuyến Google Meet, Pomodoro & BXH tuần', descEn: 'Online study rooms with Google Meet, Pomodoro & Leaderboard', group: 'space' },
  { id: 'feed' as ViewState, labelVi: 'Bảng Tin Cộng Đồng', labelEn: 'Community Feed', iconEmoji: '🌐', descVi: 'Chia sẻ tiến độ, hình ảnh & tương tác cộng đồng', descEn: 'Share progress, photos & community feed', group: 'space' },`;

if (!modalContent.includes("'study-space'")) {
  modalContent = modalContent.replace(targetStudy, targetStudy + '\n' + addModules);
}

const studentAllowed = `allowed: ['dashboard', 'focus', 'tasks', 'study', 'habits', 'finance', 'notes']`;
const studentAllowedNew = `allowed: ['dashboard', 'focus', 'tasks', 'study', 'study-space', 'feed', 'habits', 'finance', 'notes']`;
modalContent = modalContent.replace(studentAllowed, studentAllowedNew);

fs.writeFileSync('src/components/SidebarCustomizerModal.tsx', modalContent, 'utf8');
console.log('SidebarCustomizerModal.tsx patched.');

// 2. Patch Sidebar.tsx
let sidebarContent = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Ensure isVisible always includes 'study-space' and 'feed'
const isVisibleOld = `const isVisible = (id: string) => id === 'dashboard' || visibleModules.includes(id);`;
const isVisibleNew = `const isVisible = (id: string) => id === 'dashboard' || id === 'study-space' || id === 'feed' || visibleModules.includes(id);`;

sidebarContent = sidebarContent.replace(isVisibleOld, isVisibleNew);

// Add LIVE badge for study-space in renderNavButton
const taskBadgeOld = `{item.id === 'tasks' && pendingTasksCount > 0 && (`;
const studySpaceBadge = `{item.id === 'study-space' && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 flex items-center gap-1 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            LIVE 👑
          </span>
        )}
        {item.id === 'tasks' && pendingTasksCount > 0 && (`;

if (!sidebarContent.includes("item.id === 'study-space' && (")) {
  sidebarContent = sidebarContent.replace(taskBadgeOld, studySpaceBadge);
}

fs.writeFileSync('src/components/Sidebar.tsx', sidebarContent, 'utf8');
console.log('Sidebar.tsx patched.');
