import fs from 'fs';

// 1. Patch DashboardView.tsx
let dbContent = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// Add Users icon to lucide-react import
if (!dbContent.includes('Users,')) {
  dbContent = dbContent.replace(
    'Trophy, CheckCircle2, Circle, Coins, Star, Layers, Info, ExternalLink, RefreshCw, Smartphone, Search',
    'Trophy, CheckCircle2, Circle, Coins, Star, Layers, Info, ExternalLink, RefreshCw, Smartphone, Search, Users'
  );
}

// Add Banner before section 3
const section3Target = `{/* ========================================================================= */}\n      {/* 3. LƯỚI TIỆN ÍCH Ô VUÔNG ĐA SẮC MÀU (SUPER-APP ICON GRID)                 */}`;
const bannerCode = `{/* 🌟 BANNER ĐẶC BIỆT: KHÔNG GIAN HỌC TẬP & CO-WORKING TRỰC TUYẾN */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-900/90 via-indigo-900/90 to-purple-950/90 border border-violet-500/30 p-4 sm:p-5 shadow-xl text-white">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-500/30 text-violet-200 border border-violet-400/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Phòng Học Online & Co-working
              </span>
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                👑 Google Meet & Bảng Xếp Hạng Tuần
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              Không Gian Học Tập & Co-working Trực Tuyến
            </h3>
            <p className="text-xs text-violet-200/90 max-w-xl">
              Cùng học qua Google Meet / Jitsi, kết nối phòng học ảo, tích lũy giờ học tự động và vinh danh Quán Quân tuần mới!
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playSuccess();
              setCurrentView('study-space');
            }}
            className="shrink-0 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-black text-xs sm:text-sm shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Vào Sảnh Học Ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>\n\n      ` + section3Target;

if (!dbContent.includes('Không Gian Học Tập & Co-working Trực Tuyến')) {
  dbContent = dbContent.replace(section3Target, bannerCode);
}

// Update grid cols to accommodate 9 buttons nicely
dbContent = dbContent.replace(
  'className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3.5"',
  'className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-2.5 sm:gap-3.5"'
);

// Add 9th button in Grid
const targetButton8End = `            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {notes.length || 0} mục
            </span>
          </button>`;

const button9Code = `            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.5 rounded-full mt-1">
              {notes.length || 0} mục
            </span>
          </button>

          {/* 9. Sảnh Học Trực Tuyến & Co-working */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playPop();
              setCurrentView('study-space');
            }}
            className="group flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#141E30] border border-violet-200 dark:border-violet-500/30 shadow-xs hover:shadow-md hover:border-violet-400 dark:hover:border-violet-500/70 transition-all hover:scale-105 active:scale-95 cursor-pointer text-center relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-500/25 mb-2 group-hover:rotate-6 transition-transform relative">
              <Users className="w-6 h-6 stroke-[2.2]" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
              </span>
            </div>
            <span className="text-xs font-black text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              Phòng Học Online
            </span>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 px-1.5 py-0.5 rounded-full mt-1">
              Meet & BXH 👑
            </span>
          </button>`;

if (!dbContent.includes('Phòng Học Online')) {
  dbContent = dbContent.replace(targetButton8End, button9Code);
}

fs.writeFileSync('src/components/DashboardView.tsx', dbContent, 'utf8');
console.log('DashboardView.tsx patched successfully.');

// 2. Patch BottomNav.tsx
let bnContent = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

// Add Users icon
if (!bnContent.includes('Users,')) {
  bnContent = bnContent.replace(
    'DollarSign, FileText, Calendar, Target, Sparkles, GraduationCap',
    'DollarSign, FileText, Calendar, Target, Sparkles, GraduationCap, Users'
  );
}

// Add study-space action to sheet
const targetActionItem = `<button
                type="button"
                onClick={() => handleOpenAction('study')}`;

const studySpaceAction = `<button
                type="button"
                onClick={() => handleOpenAction('study-space')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-violet-50 dark:hover:bg-violet-950/40 text-left transition-colors min-h-[48px]"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>Sảnh Học Trực Tuyến & Co-working</span>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-violet-500 text-white">LIVE 👑</span>
                  </div>
                  <div className="text-xs text-slate-500">Google Meet, phòng học nhóm & BXH tuần</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOpenAction('study')}`;

if (!bnContent.includes("handleOpenAction('study-space')")) {
  bnContent = bnContent.replace(targetActionItem, studySpaceAction);
}

fs.writeFileSync('src/components/BottomNav.tsx', bnContent, 'utf8');
console.log('BottomNav.tsx patched successfully.');
