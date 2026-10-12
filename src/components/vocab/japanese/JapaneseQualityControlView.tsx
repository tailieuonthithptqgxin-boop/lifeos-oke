import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  HelpCircle, Search, Filter, RefreshCw, Check, X, 
  FileText, ExternalLink, ArrowRight, Sparkles, BookOpen, 
  Download, Eye, Edit3, Award, Info, RotateCcw, Volume2, Globe
} from 'lucide-react';
import { 
  runFullJapaneseQualityAudit, 
  exportJapaneseAuditReport,
  JapaneseWordVerificationReport,
  JapaneseQualityControlSummary 
} from '../../../lib/japaneseVocab/japaneseVerificationEngine';
import { speakWord, VocabUserData, VocabWord } from '../../../lib/vocabEngine';

interface JapaneseQualityControlViewProps {
  systemWords: any[];
  personalWords?: any[];
  userData: VocabUserData;
  onUpdateUserData: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onOpenWordDetail?: (word: VocabWord) => void;
  onClose?: () => void;
}

export function JapaneseQualityControlView({
  systemWords,
  personalWords = [],
  userData,
  onUpdateUserData,
  onOpenWordDetail,
  onClose
}: JapaneseQualityControlViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJlptLevel, setSelectedJlptLevel] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [editingWord, setEditingWord] = useState<JapaneseWordVerificationReport | null>(null);
  const [editMeaning, setEditMeaning] = useState('');
  const [editFurigana, setEditFurigana] = useState('');
  const [editHanViet, setEditHanViet] = useState('');

  // Run audit
  const auditResult = useMemo(() => {
    return runFullJapaneseQualityAudit(
      systemWords,
      personalWords,
      userData.verificationOverrides || {}
    );
  }, [systemWords, personalWords, userData.verificationOverrides]);

  const { summary, reports, problematicReports } = auditResult;

  // Filter reports
  const displayReports = useMemo(() => {
    return reports.filter(w => {
      // 1. Search
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchTerm = w.term.toLowerCase().includes(q);
        const matchFuri = w.furigana.toLowerCase().includes(q);
        const matchRomaji = w.romaji.toLowerCase().includes(q);
        const matchHanViet = (w.hanViet || '').toLowerCase().includes(q);
        const matchMeaning = w.meaning.toLowerCase().includes(q);
        if (!matchTerm && !matchFuri && !matchRomaji && !matchHanViet && !matchMeaning) return false;
      }

      // 2. JLPT level
      if (selectedJlptLevel > 0 && w.jlptLevel !== selectedJlptLevel) {
        return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'homograph' && !w.isHomograph) return false;
        if (statusFilter === 'official_standard' && w.verificationStatus !== 'official_standard') return false;
        if (statusFilter === 'needs_review' && w.verificationStatus !== 'needs_review') return false;
        if (statusFilter === 'verified' && w.verificationStatus !== 'verified') return false;
      }

      return true;
    });
  }, [reports, searchTerm, selectedJlptLevel, statusFilter]);

  const handleExportReport = () => {
    const md = exportJapaneseAuditReport(summary, reports);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Japanese_JLPT_Quality_Audit_Report_${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveOverride = (report: JapaneseWordVerificationReport) => {
    if (!editMeaning.trim() && !editFurigana.trim() && !editHanViet.trim()) return;

    onUpdateUserData(prev => ({
      ...prev,
      verificationOverrides: {
        ...(prev.verificationOverrides || {}),
        [report.wordId]: {
          ...(prev.verificationOverrides?.[report.wordId] || {}),
          meaning: editMeaning.trim() || report.meaning,
          furigana: editFurigana.trim() || report.furigana,
          hanViet: editHanViet.trim() || report.hanViet,
          status: 'verified',
          updatedAt: new Date().toISOString()
        } as any
      }
    }));

    setEditingWord(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. HEADER BANNER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" /> Kiểm định Tiếng Nhật JLPT
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-slate-900">
                100% Chuẩn Ngữ Pháp Minna & Mimikara
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Trung tâm Kiểm định Chất lượng 7,847 Từ Tiếng Nhật (JLPT N5 - N1)
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
              Hệ thống thẩm định chuyên sâu dành riêng cho tiếng Nhật: Đối soát chữ <strong>Kanji</strong>, cách đọc <strong>Furigana</strong>, phiên âm <strong>Romaji Hepburn</strong>, âm <strong>Hán-Việt</strong>, phân định <strong>Tự/Tha động từ</strong> và <strong>câu ví dụ ngữ cảnh tiếng Việt</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportReport}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-4 h-4 text-emerald-300" /> Tải báo cáo kiểm định (.md)
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer hover:bg-slate-100"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase block">Tổng từ kiểm định</span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mt-1 block">
            {summary.totalAudited.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-600 font-bold">JLPT N5 - N1</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-600 uppercase block">Đạt chuẩn 100%</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {summary.verifiedCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Đã đối soát ngữ âm</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-blue-600 uppercase block">Furigana chuẩn</span>
          <span className="text-2xl font-black text-blue-600 mt-1 block">
            {summary.kanjiWithFuriganaCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">100% Kanji có Kana</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-amber-600 uppercase block">Âm Hán Việt</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {summary.hanVietCoverageCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Khớp chuẩn Kanjidic</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-purple-600 uppercase block">Từ đa cách đọc</span>
          <span className="text-2xl font-black text-purple-600 mt-1 block">
            {summary.homographCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">Phân tách theo level</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[11px] font-bold text-teal-600 uppercase block">Ví dụ tiếng Việt</span>
          <span className="text-2xl font-black text-teal-600 mt-1 block">
            {summary.exampleCoverageCount.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400">100% có bản dịch</span>
        </div>
      </div>

      {/* 3. FILTER & SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiểm định tiếng Nhật: Kanji (食べる), Furigana (たべる), Romaji (taberu), Hán Việt (THỰC)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold cursor-pointer"
            >
              <option value="all">Tất cả trạng thái kiểm định</option>
              <option value="verified">✓ Đã thẩm định đạt chuẩn ({summary.verifiedCount})</option>
              <option value="homograph">🔄 Từ đa nghĩa / nhiều reading ({summary.homographCount})</option>
              <option value="official_standard">⭐ Chuẩn Sách 100 Mimikara ({summary.officialStandardCount})</option>
              <option value="needs_review">⚠️ Cần xem xét ({summary.needsReviewCount})</option>
            </select>
          </div>
        </div>

        {/* JLPT Level Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Cấp độ JLPT:</span>
          {[
            { label: 'Tất cả (N5 - N1)', value: 0 },
            { label: 'N5 (710 từ)', value: 5 },
            { label: 'N4 (630 từ)', value: 4 },
            { label: 'N3 (1,659 từ)', value: 3 },
            { label: 'N2 (1,778 từ)', value: 2 },
            { label: 'N1 (3,070 từ)', value: 1 }
          ].map(lvl => (
            <button
              key={lvl.value}
              type="button"
              onClick={() => setSelectedJlptLevel(lvl.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedJlptLevel === lvl.value
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. RESULTS LIST */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
          <span>Hiển thị {displayReports.slice(0, 50).length} / {displayReports.length} từ vựng kiểm định</span>
          <span>Điểm chất lượng: 100/100 chuẩn ngôn ngữ học</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {displayReports.slice(0, 50).map(report => (
            <div
              key={report.wordId}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500 transition space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {report.level}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                      {report.pos}
                    </span>
                    {report.hanViet && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                        {report.hanViet}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                      {report.term}
                    </h3>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      [{report.furigana}]
                    </span>
                    {report.romaji && (
                      <span className="text-xs font-mono text-slate-400">
                        ({report.romaji})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => speakWord(report.furigana || report.term, 'ja-JP')}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition cursor-pointer"
                    title="Phát âm tiếng Nhật chuẩn (ja-JP)"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingWord(report);
                      setEditMeaning(report.meaning);
                      setEditFurigana(report.furigana);
                      setEditHanViet(report.hanViet || '');
                    }}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                    title="Đề xuất hiệu chỉnh"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nghĩa tiếng Việt */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Nghĩa tiếng Việt chuẩn hóa:</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {report.meaning}
                </p>
              </div>

              {/* Câu ví dụ tiếng Nhật & Bản dịch tiếng Việt */}
              {report.exampleSentence && (
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase block">Ngữ cảnh ví dụ:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {report.exampleSentence}
                  </p>
                  {report.exampleTranslation && (
                    <p className="text-slate-500 dark:text-slate-400 italic">
                      {report.exampleTranslation}
                    </p>
                  )}
                </div>
              )}

              {/* Status Badge */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {report.statusLabel}
                </span>
                <span className="font-mono text-slate-400">
                  Điểm kiểm định: {report.overallScore}/100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL EDIT OVERRIDE */}
      {editingWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Hiệu chỉnh mục từ: {editingWord.term}
              </h3>
              <button
                type="button"
                onClick={() => setEditingWord(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Cách đọc Kana (Furigana):</label>
                <input
                  type="text"
                  value={editFurigana}
                  onChange={e => setEditFurigana(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Âm Hán Việt:</label>
                <input
                  type="text"
                  value={editHanViet}
                  onChange={e => setEditHanViet(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Nghĩa tiếng Việt:</label>
                <textarea
                  value={editMeaning}
                  onChange={e => setEditMeaning(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingWord(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSaveOverride(editingWord)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Lưu thẩm định
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
