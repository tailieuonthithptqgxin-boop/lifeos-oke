import fs from 'fs';

// 1. Update types.ts
let typesContent = fs.readFileSync('src/components/admin/types.ts', 'utf8');
if (!typesContent.includes("'analytics'")) {
  typesContent = typesContent.replace(
    /export type AdminTab =/g,
    "export type AdminTab = \n  | 'analytics'\n  | 'user_activity'"
  );
  fs.writeFileSync('src/components/admin/types.ts', typesContent, 'utf8');
  console.log('✅ Updated src/components/admin/types.ts with analytics and user_activity tabs');
}

// 2. Update AdminView.tsx
let adminViewContent = fs.readFileSync('src/components/AdminView.tsx', 'utf8');

// Add imports
if (!adminViewContent.includes('AdminFeatureAnalyticsTab')) {
  adminViewContent = adminViewContent.replace(
    "import { AdminConfirmModal } from './admin/AdminConfirmModal';",
    `import { AdminConfirmModal } from './admin/AdminConfirmModal';
import { AdminFeatureAnalyticsTab } from './admin/AdminFeatureAnalyticsTab';
import { AdminUserActivityTab } from './admin/AdminUserActivityTab';
import { BarChart3 } from 'lucide-react';`
  );
}

// Add Tab Buttons in header
const tabButtonCode = `
          {/* Tab: Feature Analytics */}
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={\`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer \${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs ring-1 ring-indigo-500'
                : 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800'
            }\`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
            <span>📊 Phân Tích Chức Năng</span>
          </button>

          {/* Tab: User Activity & X-Ray */}
          <button
            type="button"
            onClick={() => setActiveTab('user_activity')}
            className={\`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer \${
              activeTab === 'user_activity'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs ring-1 ring-purple-500'
                : 'text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800'
            }\`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>👥 Quản Lý Người Dùng & X-Quang</span>
          </button>
`;

if (!adminViewContent.includes("onClick={() => setActiveTab('analytics')}")) {
  adminViewContent = adminViewContent.replace(
    `<button\n            type="button"\n            onClick={() => setActiveTab('requests')}`,
    `${tabButtonCode}\n          <button\n            type="button"\n            onClick={() => setActiveTab('requests')}`
  );
  if (!adminViewContent.includes("onClick={() => setActiveTab('analytics')}")) {
    adminViewContent = adminViewContent.replace(
      `<button\r\n            type="button"\r\n            onClick={() => setActiveTab('requests')}`,
      `${tabButtonCode}\r\n          <button\r\n            type="button"\r\n            onClick={() => setActiveTab('requests')}`
    );
  }
}

// Add Tab Panels
const tabPanelsCode = `
      {/* Tab: Feature Analytics */}
      {activeTab === 'analytics' && (
        <AdminFeatureAnalyticsTab />
      )}

      {/* Tab: User Activity & X-Ray */}
      {activeTab === 'user_activity' && (
        <AdminUserActivityTab />
      )}
`;

if (!adminViewContent.includes("{activeTab === 'analytics' && (")) {
  adminViewContent = adminViewContent.replace(
    `{/* Tab 1: Requests */}`,
    `${tabPanelsCode}\n      {/* Tab 1: Requests */}`
  );
}

fs.writeFileSync('src/components/AdminView.tsx', adminViewContent, 'utf8');
console.log('✅ Updated src/components/AdminView.tsx successfully');
