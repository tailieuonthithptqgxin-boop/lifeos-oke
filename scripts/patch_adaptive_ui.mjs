import fs from 'fs';

// ==============================================================================
// 1. UPDATE SIDEBAR (3-Tier Adaptive Shell: Mobile Drawer, Tablet 76px, PC 250px)
// ==============================================================================
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

sidebar = sidebar.replace(
  'md:w-[240px] h-screen',
  'md:w-[76px] lg:w-[250px] h-screen'
);

// Update renderNavButton to support compact tablet and full desktop
const navBtnTarget = `        <Icon className={\`w-4 h-4 shrink-0 transition-transform \${isActive ? 'text-emerald-600 dark:text-emerald-400 scale-105 ml-1' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}\`} />
        <span className="truncate flex-1">
          {item.id === 'referral' && (currentUser?.isAffiliate || isAdmin)
            ? '⭐ Cổng Quản Lý CTV'
            : t(item.label)}
        </span>`;

const navBtnReplacement = `        <Icon className={\`w-4 h-4 shrink-0 transition-transform \${isActive ? 'text-emerald-600 dark:text-emerald-400 scale-105' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}\`} />
        <span className="truncate flex-1 md:hidden lg:inline">
          {item.id === 'referral' && (currentUser?.isAffiliate || isAdmin)
            ? '⭐ Cổng Quản Lý CTV'
            : t(item.label)}
        </span>`;

sidebar = sidebar.replace(navBtnTarget, navBtnReplacement);

// Make badge counters adapt: full badge on desktop/mobile, subtle indicator dot on tablet
sidebar = sidebar.replace(
  `{item.id === 'tasks' && pendingTasksCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
            {pendingTasksCount}
          </span>
        )}`,
  `{item.id === 'tasks' && pendingTasksCount > 0 && (
          <>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 md:hidden lg:inline">
              {pendingTasksCount}
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 hidden md:block lg:hidden absolute top-2 right-2 ring-2 ring-white dark:ring-[#07070C]" />
          </>
        )}`
);

sidebar = sidebar.replace(
  `{item.id === 'habits' && incompleteHabitsCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
            {incompleteHabitsCount}
          </span>
        )}`,
  `{item.id === 'habits' && incompleteHabitsCount > 0 && (
          <>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 md:hidden lg:inline">
              {incompleteHabitsCount}
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 hidden md:block lg:hidden absolute top-2 right-2 ring-2 ring-white dark:ring-[#07070C]" />
          </>
        )}`
);

sidebar = sidebar.replace(
  `{item.id === 'connect' && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            NEW & LIVE
          </span>
        )}`,
  `{item.id === 'connect' && (
          <>
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0 md:hidden lg:inline-flex">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              NEW & LIVE
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 hidden md:block lg:hidden absolute top-2 right-2 animate-pulse ring-2 ring-white dark:ring-[#07070C]" />
          </>
        )}`
);

// Brand header text and footer on tablet
sidebar = sidebar.replace(
  '<div className="flex items-center gap-1.5">',
  '<div className="flex items-center gap-1.5 md:hidden lg:flex">'
);

sidebar = sidebar.replace(
  '<div className="min-w-0">',
  '<div className="min-w-0 md:hidden lg:block">'
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');
console.log('1. Sidebar.tsx updated successfully.');

// ==============================================================================
// 2. UPDATE TODAY STUDY TAB (Tháp Trí Nhớ 6 Tầng & Session Customizer Layout)
// ==============================================================================
let todayStudy = fs.readFileSync('src/components/vocab/TodayStudyTab.tsx', 'utf8');

// Tháp Trí Nhớ Tiers: full width on mobile/tablet, tapered on desktop
todayStudy = todayStudy.replace(
  'max-w-sm bg-blue-50/80',
  'w-full lg:max-w-md bg-blue-50/80'
);
todayStudy = todayStudy.replace(
  'max-w-md bg-emerald-50/80',
  'w-full lg:max-w-lg bg-emerald-50/80'
);
todayStudy = todayStudy.replace(
  'max-w-lg bg-amber-50/80',
  'w-full lg:max-w-xl bg-amber-50/80'
);
todayStudy = todayStudy.replace(
  'max-w-xl bg-orange-50/80',
  'w-full lg:max-w-2xl bg-orange-50/80'
);
todayStudy = todayStudy.replace(
  'max-w-2xl bg-rose-50/80',
  'w-full lg:max-w-3xl bg-rose-50/80'
);
todayStudy = todayStudy.replace(
  'max-w-3xl bg-slate-50',
  'w-full lg:max-w-4xl bg-slate-50'
);

// Add proportion color progress bars below each pyramid tier card
const tier5Old = `<span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {pyramid.total > 0 ? Math.round((pyramid.level5_mastered / pyramid.total) * 100) : 0}%
              </span>
            </div>
          </div>`;

const tier5New = `<span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                {pyramid.total > 0 ? Math.round((pyramid.level5_mastered / pyramid.total) * 100) : 0}%
              </span>
            </div>
            {/* Visual ratio bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 dark:bg-blue-950 rounded-b-2xl overflow-hidden">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: \`\${pyramid.total > 0 ? (pyramid.level5_mastered / pyramid.total) * 100 : 0}%\` }} />
            </div>
          </div>`;

todayStudy = todayStudy.replace(tier5Old, tier5New);

// Make the cards relative for absolute bottom ratio bar
todayStudy = todayStudy.replace(
  'rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-md bg-blue-50/80',
  'relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-md bg-blue-50/80'
);
todayStudy = todayStudy.replace(
  'rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-lg bg-emerald-50/80',
  'relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-lg bg-emerald-50/80'
);
todayStudy = todayStudy.replace(
  'rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-xl bg-amber-50/80',
  'relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-xl bg-amber-50/80'
);
todayStudy = todayStudy.replace(
  'rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-2xl bg-orange-50/80',
  'relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-2xl bg-orange-50/80'
);
todayStudy = todayStudy.replace(
  'rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-3xl bg-rose-50/80',
  'relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-3xl bg-rose-50/80'
);
todayStudy = todayStudy.replace(
  'rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-4xl bg-slate-50',
  'relative rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 mx-auto w-full lg:max-w-4xl bg-slate-50'
);

// Batches slices grid: change from lg:grid-cols-3 to lg:grid-cols-4 or responsive 2x2/4x1
todayStudy = todayStudy.replace(
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3'
);

fs.writeFileSync('src/components/vocab/TodayStudyTab.tsx', todayStudy, 'utf8');
console.log('2. TodayStudyTab.tsx updated successfully.');

// ==============================================================================
// 3. UPDATE VOCAB STUDY TAB (Active Recall: 4 cols on PC, 2x2 on Tablet, 1 on Mobile)
// ==============================================================================
let vocabStudy = fs.readFileSync('src/components/vocab/VocabStudyTab.tsx', 'utf8');

vocabStudy = vocabStudy.replace(
  '<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">',
  '<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">'
);

fs.writeFileSync('src/components/vocab/VocabStudyTab.tsx', vocabStudy, 'utf8');
console.log('3. VocabStudyTab.tsx updated successfully.');
