import fs from 'fs';

const dashboard = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');
const gridMatches = dashboard.match(/grid-cols-[^\s"'>]+/g) || [];
console.log('DashboardView grid setups:', Array.from(new Set(gridMatches)));

const focus = fs.readFileSync('src/components/FocusView.tsx', 'utf8');
const focusGrids = focus.match(/grid-cols-[^\s"'>]+/g) || [];
console.log('FocusView grid setups:', Array.from(new Set(focusGrids)));

const finance = fs.readFileSync('src/components/FinanceView.tsx', 'utf8');
const financeGrids = finance.match(/grid-cols-[^\s"'>]+/g) || [];
console.log('FinanceView grid setups:', Array.from(new Set(financeGrids)));
