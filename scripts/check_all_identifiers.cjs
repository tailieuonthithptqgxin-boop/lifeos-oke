const fs = require('fs');
const path = require('path');

// Scan all tsx files in src/components/admin
const dir = path.resolve('src/components/admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

console.log('Checking files in src/components/admin:', files.length);

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check all Lucide icon usages: <[A-Z][a-zA-Z0-9]+
  const jsxTagMatches = content.match(/<([A-Z][a-zA-Z0-9]+)\b/g) || [];
  const tags = new Set(jsxTagMatches.map(m => m.slice(1)));

  // Filter out known native or custom components in that directory or React
  const nativeOrCustom = new Set([
    'Fragment', 'React', 'Link', 'AdminConfirmModal', 'AdminRequestsTab',
    'AdminSubscriptionsTab', 'AdminPlansTab', 'AdminLanguagesTab', 'AdminUsersTab',
    'AdminPasswordResetsTab', 'AdminBankConfigTab', 'AdminGmailConfigTab',
    'AdminReferralsTab', 'AdminFeedbackTab', 'AdminAnnouncementsTab',
    'AdminLiveTestLabTab', 'AdminFeatureAnalyticsTab', 'AdminUserActivityTab',
    'UserDetailModal', 'UserXRayModal'
  ]);

  for (const tag of tags) {
    if (nativeOrCustom.has(tag)) continue;
    // Check if tag is declared or imported
    const imported = new RegExp(`\\b${tag}\\b`).test(content.slice(0, content.indexOf('export')));
    const declared = new RegExp(`\\b(const|let|var|function|type|interface|class)\\s+${tag}\\b`).test(content);
    if (!imported && !declared) {
      console.log(`[POTENTIAL UNDEFINED] In ${file}: <${tag} /> is used without clear import!`);
    }
  }
}
console.log('AST/Regex scan completed.');
