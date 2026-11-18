import fs from 'fs';

let content = fs.readFileSync('src/components/StudyView.tsx', 'utf8');

// 1. Add Users to lucide-react import
if (!content.includes('Users,')) {
  content = content.replace(
    "BookOpen, GraduationCap, Target, Calculator, FileCheck, Activity, Award, X, Sparkles, RotateCcw",
    "BookOpen, GraduationCap, Target, Calculator, FileCheck, Activity, Award, X, Sparkles, RotateCcw, Users"
  );
}

// 2. Add StudySpaceView import
if (!content.includes("import('./study/StudySpaceView')")) {
  const insertAfter = `const VocabMasterView = lazyWithRetry(
  () => import('./vocab/VocabMasterView'),
  'VocabMasterView'
);`;
  const spaceImport = `\nconst StudySpaceView = lazyWithRetry(
  () => import('./study/StudySpaceView').then(m => ({ default: m.StudySpaceView })),
  'StudySpaceView'
);`;
  content = content.replace(insertAfter, insertAfter + spaceImport);
}

// 3. Update Tab type
content = content.replace(
  "type Tab = 'overview' | 'my-grades' | 'vocabulary' | 'subjects' | 'assignments' | 'exams' | 'forecast';",
  "type Tab = 'coworking' | 'overview' | 'my-grades' | 'vocabulary' | 'subjects' | 'assignments' | 'exams' | 'forecast';"
);

// 4. Update saved tab validation
content = content.replace(
  "['overview', 'my-grades', 'vocabulary', 'subjects', 'assignments', 'exams', 'forecast']",
  "['coworking', 'overview', 'my-grades', 'vocabulary', 'subjects', 'assignments', 'exams', 'forecast']"
);

// 5. Add TabButton for coworking
const targetTabButton = `<TabButton active={activeTab === 'vocabulary'}`;
const coworkingButton = `<TabButton active={activeTab === 'coworking'} onClick={() => { setActiveTab('coworking'); soundEngine.playPop(); }} icon={<Users className="w-4 h-4 text-violet-500" />} label={isVi ? 'Phòng Học & Co-working 👑' : 'Study Space & Meet 👑'} />\n          <TabButton active={activeTab === 'vocabulary'}`;
if (!content.includes("activeTab === 'coworking'")) {
  content = content.replace(targetTabButton, coworkingButton);
}

// 6. Add tab content for coworking
const targetOverview = `{activeTab === 'overview' && (`;
const coworkingContent = `{activeTab === 'coworking' && (
            <React.Suspense
              fallback={
                <div className="flex flex-col items-center justify-center p-16 min-h-[350px] text-slate-500 rounded-xl bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 shadow-2xs">
                  <div className="w-7 h-7 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    {isVi ? 'Đang tải Sảnh Học & Co-working...' : 'Loading Study Space & Co-working...'}
                  </span>
                </div>
              }
            >
              <StudySpaceView />
            </React.Suspense>
          )}

          {activeTab !== 'coworking' && (
            <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-purple-600/10 border border-violet-500/20 shadow-xs mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Không Gian Học Tập Trực Tuyến & Co-working</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-500 text-white animate-pulse">LIVE 👑</span>
                  </h4>
                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                    Cùng học qua Google Meet / Jitsi, tích lũy giờ học tự động và vinh danh Quán Quân tuần!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { soundEngine.playSuccess(); setActiveTab('coworking'); }}
                className="shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>Vào Phòng Học</span>
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {activeTab === 'overview' && (`;

if (!content.includes("<StudySpaceView />")) {
  content = content.replace(targetOverview, coworkingContent);
}

fs.writeFileSync('src/components/StudyView.tsx', content, 'utf8');
console.log('StudyView.tsx patched successfully.');
