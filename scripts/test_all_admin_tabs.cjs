async function test() {
  const tabs = [
    '/src/components/admin/AdminRequestsTab.tsx',
    '/src/components/admin/AdminSubscriptionsTab.tsx',
    '/src/components/admin/AdminPlansTab.tsx',
    '/src/components/admin/AdminLanguagesTab.tsx',
    '/src/components/admin/AdminUsersTab.tsx',
    '/src/components/admin/AdminPasswordResetsTab.tsx',
    '/src/components/admin/AdminBankConfigTab.tsx',
    '/src/components/admin/AdminGmailConfigTab.tsx',
    '/src/components/admin/AdminReferralsTab.tsx',
    '/src/components/admin/AdminFeedbackTab.tsx',
    '/src/components/admin/AdminAnnouncementsTab.tsx',
    '/src/components/admin/AdminLiveTestLabTab.tsx',
    '/src/components/admin/AdminConfirmModal.tsx',
    '/src/components/admin/AdminFeatureAnalyticsTab.tsx',
    '/src/components/admin/AdminUserActivityTab.tsx',
    '/src/components/AdminStorageAuditTab.tsx',
    '/src/components/AdminCustomModulesTab.tsx',
    '/src/components/CloudflareR2View.tsx',
    '/src/components/admin/UserDetailModal.tsx',
    '/src/components/admin/UserXRayModal.tsx',
  ];
  for (const tab of tabs) {
    const r = await fetch('http://localhost:3000' + tab);
    const text = await r.text();
    if (r.status !== 200 || text.includes('Internal Server Error')) {
      console.log('FAIL:', tab, r.status, text.substring(0, 200));
    } else {
      console.log('OK:', tab, text.length);
    }
  }
}
test().catch(console.error);
