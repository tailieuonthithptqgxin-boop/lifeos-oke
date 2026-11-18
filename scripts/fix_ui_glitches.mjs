import fs from 'fs';

// 1. Fix CookieConsentBanner.tsx:
// - Move position to bottom-20 right-4 sm:right-6 (above chat button, away from sidebar and cards)
// - Add an explicit X button in the top right
let cookieBanner = fs.readFileSync('src/components/common/CookieConsentBanner.tsx', 'utf8');

// Replace the aside container positioning
cookieBanner = cookieBanner.replace(
  `className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] sm:bottom-6 left-3 right-3 sm:left-6 sm:right-auto sm:max-w-lg z-40 max-h-[85dvh] overflow-y-auto animate-in slide-in-from-bottom-5 fade-in duration-300"`,
  `className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] sm:bottom-20 right-3 sm:right-6 sm:max-w-sm z-50 max-h-[80dvh] overflow-y-auto animate-in slide-in-from-bottom-5 fade-in duration-300"`
);

// Add close button to header of banner
const targetHeader = `<div className="flex items-start gap-3.5">`;
const newHeader = `<div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">`;

cookieBanner = cookieBanner.replace(targetHeader, newHeader);

// Close the inner div and add X button
const targetAfterParagraph = `<p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Chúng tôi sử dụng <strong>Cookie thiết yếu</strong> để duy trì phiên đăng nhập và bảo vệ bảo mật. Toàn bộ kịch bản phân tích theo dõi mặc định bị chặn cho đến khi bạn đồng ý.
            </p>
          </div>
        </div>`;

const newAfterParagraph = `<p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Chúng tôi sử dụng <strong>Cookie thiết yếu</strong> để duy trì phiên đăng nhập và bảo vệ dữ liệu của bạn.
            </p>
          </div>
          </div>
          <button
            type="button"
            onClick={handleEssentialOnly}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-colors shrink-0 cursor-pointer"
            title="Đóng thông báo"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>`;

cookieBanner = cookieBanner.replace(targetAfterParagraph, newAfterParagraph);

fs.writeFileSync('src/components/common/CookieConsentBanner.tsx', cookieBanner, 'utf8');
console.log('CookieConsentBanner.tsx fixed: relocated to bottom-right and added close X button.');

// 2. Fix Sidebar.tsx:
// - Shorten label to 'Phòng Học Live' so it never truncates to 'Sảnh Học & ..'
let sidebar = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
sidebar = sidebar.replace(
  `{ id: 'study-space', label: 'Sảnh Học & Co-working', icon: Users },`,
  `{ id: 'study-space', label: 'Phòng Học Live', icon: Users },`
);

// Shorten badge to LIVE without trailing icons that blow up width
sidebar = sidebar.replace(
  `LIVE 👑`,
  `LIVE`
);

fs.writeFileSync('src/components/Sidebar.tsx', sidebar, 'utf8');
console.log('Sidebar.tsx fixed: changed label to Phòng Học Live without truncation.');

// 3. Fix App.tsx scroll on view change
let app = fs.readFileSync('src/App.tsx', 'utf8');
const oldScrollEffect = `  React.useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      if (mainRef.current) {
        mainRef.current.scrollLeft = 0;
        mainRef.current.scrollTop = 0;
      }
    }
  }, [currentView]);`;

const newScrollEffect = `  React.useEffect(() => {
    if (prevViewRef.current !== currentView) {
      prevViewRef.current = currentView;
      if (mainRef.current) {
        mainRef.current.scrollLeft = 0;
        mainRef.current.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
  }, [currentView]);`;

app = app.replace(oldScrollEffect, newScrollEffect);
fs.writeFileSync('src/App.tsx', app, 'utf8');
console.log('App.tsx fixed: ensured scrollTo(0,0) on view change.');
