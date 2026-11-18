import fs from 'fs';
let code = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// 1. Import
code = code.replace(
  "import { AdminAnnouncementsTab } from './admin/AdminAnnouncementsTab';",
  "import { AdminAnnouncementsTab } from './admin/AdminAnnouncementsTab';\nimport { AdminConnectModerationTab } from './admin/AdminConnectModerationTab';"
);

// 2. Add Tab button
const tabBtnTarget = `{/* Tab 11: Announcements & Notifications */}`;
const newTabBtn = `{/* Tab: Connect Communities & Meets Moderation */}
          <button
            type="button"
            onClick={() => setActiveTab('communities')}
            className={\`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 cursor-pointer \${
              activeTab === 'communities'
                ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }\`}
          >
            <span>🏛️</span>
            <span>Cộng Đồng & Meet</span>
          </button>

          ${tabBtnTarget}`;

code = code.replace(tabBtnTarget, newTabBtn);

// 3. Add Tab render
const tabRenderEnd = `{activeTab === 'announcements' && (
          <AdminAnnouncementsTab onShowMessage={setMessage} />
      )}`;

const newTabRender = `${tabRenderEnd}

      {/* Tab: Communities & Meet Moderation */}
      {activeTab === 'communities' && (
        <AdminConnectModerationTab />
      )}`;

code = code.replace(tabRenderEnd, newTabRender);

fs.writeFileSync('src/components/AdminView.tsx', code, 'utf8');
console.log('Successfully updated AdminView.tsx with AdminConnectModerationTab');
