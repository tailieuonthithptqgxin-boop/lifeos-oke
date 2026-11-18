import fs from 'fs';

// 1. Sidebar.tsx
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Remove from SYSTEM_ITEMS
sidebar = sidebar.replace(
  `  { id: 'decision', label: 'Decision Engine', icon: GitBranch },\n`,
  ''
);
sidebar = sidebar.replace(
  `  { id: 'decision', label: 'Decision Engine', icon: GitBranch },\r\n`,
  ''
);
sidebar = sidebar.replace(
  `  { id: 'referral', label: 'Referral 20%', icon: Gift },\n`,
  ''
);
sidebar = sidebar.replace(
  `  { id: 'referral', label: 'Referral 20%', icon: Gift },\r\n`,
  ''
);

// Clean up unused imports if needed
sidebar = sidebar.replace('GitBranch,\n', '');
sidebar = sidebar.replace('GitBranch,\r\n', '');
sidebar = sidebar.replace('Gift,\n', '');
sidebar = sidebar.replace('Gift,\r\n', '');

fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');
console.log('Sidebar.tsx updated: removed decision & referral.');

// 2. SidebarCustomizerModal.tsx
let modal = fs.readFileSync('src/components/SidebarCustomizerModal.tsx', 'utf8');

// Remove decision item
const decisionRegex = /^\s*\{\s*id:\s*'decision'\s*as\s*ViewState,[\s\S]*?\},\r?\n/m;
modal = modal.replace(decisionRegex, '');

// Remove referral item
const referralRegex = /^\s*\{\s*id:\s*'referral'\s*as\s*ViewState,[\s\S]*?\},\r?\n/m;
modal = modal.replace(referralRegex, '');

fs.writeFileSync('src/components/SidebarCustomizerModal.tsx', modal, 'utf8');
console.log('SidebarCustomizerModal.tsx updated: removed decision & referral.');

// 3. App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');

// Add redirect guard in useEffect
app = app.replace(
  `if ((currentView as string) === 'notifications' || (currentView as string) === 'notification_settings') {\n      setCurrentView('dashboard');\n    }`,
  `if (
      (currentView as string) === 'notifications' ||
      (currentView as string) === 'notification_settings' ||
      (currentView as string) === 'decision' ||
      (currentView as string) === 'decision_engine' ||
      (currentView as string) === 'referral'
    ) {
      setCurrentView('dashboard');
    }`
);
app = app.replace(
  `if ((currentView as string) === 'notifications' || (currentView as string) === 'notification_settings') {\r\n      setCurrentView('dashboard');\r\n    }`,
  `if (
      (currentView as string) === 'notifications' ||
      (currentView as string) === 'notification_settings' ||
      (currentView as string) === 'decision' ||
      (currentView as string) === 'decision_engine' ||
      (currentView as string) === 'referral'
    ) {
      setCurrentView('dashboard');
    }`
);

// Remove referral view block
const referralBlockRegex = /if\s*\(currentView\s*===\s*'referral'\)\s*\{\r?\n\s*return\s*<ReferralView\s*\/>;\r?\n\s*\}\r?\n/g;
app = app.replace(referralBlockRegex, '');

// Change decision case to redirect to dashboard
app = app.replace(
  `      case 'decision':\n      case 'decision_engine': return <DecisionEngineView />;`,
  `      case 'decision':\n      case 'decision_engine': return <DashboardView />;`
);
app = app.replace(
  `      case 'decision':\r\n      case 'decision_engine': return <DecisionEngineView />;`,
  `      case 'decision':\r\n      case 'decision_engine': return <DashboardView />;`
);

fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('App.tsx updated: redirect decision & referral.');

// 4. CommandCenter.tsx
let cmd = fs.readFileSync('src/components/CommandCenter.tsx', 'utf8');
cmd = cmd.replace(
  `    { title: 'Động cơ Ra quyết định (Decision Engine)', view: 'decision' as ViewState, icon: Scale },\n`,
  ''
);
cmd = cmd.replace(
  `    { title: 'Động cơ Ra quyết định (Decision Engine)', view: 'decision' as ViewState, icon: Scale },\r\n`,
  ''
);
fs.writeFileSync('src/components/CommandCenter.tsx', cmd, 'utf8');
console.log('CommandCenter.tsx updated: removed decision command.');

// 5. SpatialBentoShowcase.tsx
let bento = fs.readFileSync('src/components/spatial/universe/SpatialBentoShowcase.tsx', 'utf8');
const oldDecisionBlock = `    {
      id: 'decision',
      title: 'Decision Engine 10/10/10',
      tag: 'MENTAL MODELS',
      desc: 'Cân nhắc tương lai 10 phút, 10 tháng, 10 năm với chi phí cơ hội.',
      stat: 'Độ tin cậy 96%',
      pos: [-1.8, -1.8, 0.8] as [number, number, number],
      color: '#38BDF8',
      action: () => onOpenApp('decision')
    },`;

const newStudyBlock = `    {
      id: 'study-space',
      title: 'Sảnh Học & Co-working 👑',
      tag: 'ONLINE STUDY ROOMS',
      desc: 'Google Meet, tính giờ học tích lũy và đua Bảng xếp hạng tuần.',
      stat: 'Phòng học trực tuyến',
      pos: [-1.8, -1.8, 0.8] as [number, number, number],
      color: '#8B5CF6',
      action: () => onOpenApp('study-space')
    },`;

bento = bento.replace(oldDecisionBlock.replace(/\r?\n/g, '\n'), newStudyBlock);
bento = bento.replace(oldDecisionBlock.replace(/\n/g, '\r\n'), newStudyBlock.replace(/\n/g, '\r\n'));
fs.writeFileSync('src/components/spatial/universe/SpatialBentoShowcase.tsx', bento, 'utf8');
console.log('SpatialBentoShowcase.tsx updated.');

// 6. PublicLandingView.tsx
let landing = fs.readFileSync('src/components/PublicLandingView.tsx', 'utf8');
landing = landing.replace(
  'bộ máy ra quyết định Decision Matrix và quy tắc tự động hóa Automation Rules.',
  'Không gian Học tập Co-working trực tuyến và quy tắc tự động hóa Automation Rules.'
);
landing = landing.replace(
  '<span>Decision Engine & Mô phỏng kịch bản</span>',
  '<span>Phòng Học & Co-working (Google Meet & BXH)</span>'
);
fs.writeFileSync('src/components/PublicLandingView.tsx', landing, 'utf8');
console.log('PublicLandingView.tsx updated.');
