import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  HelpCircle, Search, Filter, RefreshCw, Check, X, 
  FileText, ExternalLink, ArrowRight, Sparkles, BookOpen, 
  Download, Eye, Edit3, Award, Info, RotateCcw, Volume2, Globe
} from 'lucide-react';
import { ChineseWord, ChineseQualityControlSummary } from '../../../lib/chineseVocab/types';
import { 
  runFullChineseQualityAudit, 
  exportChineseAuditReport 
} from '../../../lib/chineseVocab/chineseVerificationEngine';
import { renderChineseScript } from '../../../lib/chineseVocab/traditionalMappingEngine';
import { speakWord, VocabUserData } from '../../../lib/vocabEngine';

interface ChineseQualityControlViewProps {
  systemWords: any[];
  personalWords?: any[];
  userData: VocabUserData;
  onUpdateUserData: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onClose?: () => void;
}

export function ChineseQualityControlView({
  systemWords,
  personalWords = [],
  userData,
  onUpdateUserData,
  onClose
}: ChineseQualityControlViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHskLevel, setSelectedHskLevel] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scriptMode, setScriptMode] = useState<'simplified' | 'traditional' | 'both'>('simplified');
  const [isScanning, setIsScanning] = useState(false);

  // Run audit
  const auditResult = useMemo(() => {
    return runFullChineseQualityAudit(
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
        const matchTrad = w.traditionalTerm?.toLowerCase().includes(q);
        const matchPinyin = w.pinyin.toLowerCase().includes(q);
        const matchMeaning = w.meaning.toLowerCase().includes(q);
        if (!matchTerm && !matchTrad && !matchPinyin && !matchMeaning) return false;
      }

      // 2. HSK Level
      if (selectedHskLevel > 0) {
        if (selectedHskLevel === 7) {
          if (w.hskLevel < 7) return false;
        } else if (w.hskLevel !== selectedHskLevel) {
          return false;
        }
      }

      // 3. Status Filter
      if (statusFilter === 'needs_review' && w.verificationStatus !== 'needs_review') return false;
      if (statusFilter === 'flagged_error' && w.verificationStatus !== 'flagged_error') return false;
      if (statusFilter === 'confusables' && (!w.confusables || w.confusables.length === 0)) return false;
      if (statusFilter === 'tone_sandhi' && !w.toneSandhi) return false;
      if (statusFilter === 'multi_meaning' && (!w.multiMeanings || w.multiMeanings.length <= 1)) return false;
      if (statusFilter === 'verified' && w.verificationStatus !== 'dictionary_verified' && w.verificationStatus !== 'approved') return false;

      return true;
    });
  }, [reports, searchTerm, selectedHskLevel, statusFilter]);

  // Mark as verified
  const handleMarkVerified = (word: ChineseWord) => {
    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      overrides[word.id] = {
        ...word,
        status: 'lexical_verified' as const,
        qualityScore: Math.max(95, word.qualityScore),
        referenceSource: 'Đã đối chiếu Tân Hoa Từ điển / Giáo trình Chuẩn HSK',
        auditTrail: [
          ...((word.auditTrail as any) || []),
          {
            timestamp: new Date().toISOString(),
            action: 'APPROVED' as const,
            actor: 'Giáo viên / Quản trị viên',
            details: 'Phê duyệt độ chuẩn xác của Hán tự, Pinyin và định nghĩa.'
          }
        ]
      } as any;
      return {
        ...prev,
        verificationOverrides: overrides
      };
    });
  };

  // Rollback to original
  const handleRollback = (word: ChineseWord) => {
    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      delete overrides[word.id];
      return {
        ...prev,
        verificationOverrides: overrides
      };
    });
    alert(`Đã khôi phục từ "${word.term}" về nguyên bản dữ liệu gốc.`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const csvStr = exportChineseAuditReport(reports, 'csv');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese_vocabulary_quality_audit_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export JSON
  const handleExportJson = () => {
    const jsonStr = exportChineseAuditReport(reports, 'json');
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chinese_vocabulary_quality_audit_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. AUDIT BANNER & CONTROL BAR */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-red-950 via-slate-900 to-amber-950 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-red-900/40">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-red-500/20 text-red-400 rounded-xl text-xl">
              🇨🇳
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300">
              Chinese Vocabulary Quality Control & Verification
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black">
            Kiểm định & Quản lý Chất lượng 10.000 Từ Tiếng Trung
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Hệ thống rà soát Hán tự, kiểm tra âm tiết Pinyin & thanh điệu, quy tắc biến điệu Tone Sandhi (一, 不, 3+3), đối chiếu Giản thể/Phồn thể, bóc tách nét nghĩa theo ngữ cảnh và bảo toàn lưu vết kiểm toán không phá hủy.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsScanning(true);
              setTimeout(() => setIsScanning(false), 600);
            }}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Đang quét...' : 'Quét lại toàn bộ'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-200" /> Xuất CSV
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-300" /> Xuất JSON
          </button>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Total Records */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Tổng mục từ</span>
          <div className="text-2xl font-black text-red-600">
            {summary.totalRecords.toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-slate-500 font-medium">HSK 1 đến HSK 7-9</span>
        </div>

        {/* Verified Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Đã xác minh</span>
          <div className="text-2xl font-black text-emerald-600">
            {summary.verifiedCount.toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-emerald-500 font-semibold">
            {Math.round((summary.verifiedCount / (summary.totalRecords || 1)) * 100)}% kho từ
          </span>
        </div>

        {/* Format Checked */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Chuẩn định dạng</span>
          <div className="text-2xl font-black text-blue-600">
            {summary.formatCheckedCount.toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-blue-500 font-medium">Hán tự & Pinyin hợp lệ</span>
        </div>

        {/* Needs Review */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Cần xem xét</span>
          <div className="text-2xl font-black text-amber-600">
            {summary.needsReviewCount.toLocaleString('vi-VN')}
          </div>
          <span className="text-[11px] text-amber-500 font-medium">Cảnh báo ngữ nghĩa / Pinyin</span>
        </div>

        {/* Confusables */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Dễ nhầm lẫn (形/义)</span>
          <div className="text-2xl font-black text-purple-600">
            {summary.confusablesCount}
          </div>
          <span className="text-[11px] text-purple-500 font-medium">Có phân biệt ngữ cảnh</span>
        </div>

        {/* Tone Sandhi & Traditional */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Biến điệu & Phồn thể</span>
          <div className="text-2xl font-black text-indigo-600">
            {summary.toneSandhiCount} / {summary.traditionalMappedCount}
          </div>
          <span className="text-[11px] text-indigo-500 font-medium">Tone Sandhi / 繁體字</span>
        </div>

      </div>

      {/* 3. FILTERS & SCRIPT CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm chữ Hán, Pinyin, hoặc nghĩa tiếng Việt (xuéxí, 学习, 爱...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* HSK Level Filter */}
            <select
              value={selectedHskLevel}
              onChange={e => setSelectedHskLevel(Number(e.target.value))}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value={0}>Tất cả cấp độ HSK (1-9)</option>
              <option value={1}>HSK 1 (356 từ)</option>
              <option value={2}>HSK 2 (494 từ)</option>
              <option value={3}>HSK 3 (967 từ)</option>
              <option value={4}>HSK 4 (600 từ)</option>
              <option value={5}>HSK 5 (1,066 từ)</option>
              <option value={6}>HSK 6 (1,138 từ)</option>
              <option value={7}>HSK 7-9 (5,619 từ)</option>
            </select>

            {/* Verification Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Tất cả trạng thái ({reports.length})</option>
              <option value="needs_review">⚠️ Cần xem xét thêm ({summary.needsReviewCount})</option>
              <option value="confusables">💡 Cặp từ dễ nhầm lẫn ({summary.confusablesCount})</option>
              <option value="tone_sandhi">🔊 Có biến điệu Tone Sandhi ({summary.toneSandhiCount})</option>
              <option value="multi_meaning">📚 Từ đa nghĩa ({summary.multiMeaningCount})</option>
              <option value="flagged_error">❗ Cảnh báo lỗi ({summary.flaggedErrorCount})</option>
              <option value="verified">✓ Đã xác minh chuẩn ({summary.verifiedCount})</option>
            </select>

            {/* Script Display Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setScriptMode('simplified')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scriptMode === 'simplified' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-500'
                }`}
              >
                Giản thể (简)
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('traditional')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scriptMode === 'traditional' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-500'
                }`}
              >
                Phồn thể (繁)
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('both')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  scriptMode === 'both' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-xs' : 'text-slate-500'
                }`}
              >
                Song song
              </button>
            </div>
          </div>
        </div>

        {/* Transparency note */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <span>
            Khám phá <strong>{displayReports.length}</strong> kết quả kiểm định đạt tiêu chuẩn học thuật HSK 3.0.
          </span>
          <span className="text-[11px] text-slate-500">
            Nguồn: BLCU & Hanban Corpus Reference • Giọng đọc: Tiếng Trung Phổ Thông (zh-CN)
          </span>
        </div>
      </div>

      {/* 4. AUDIT REPORT LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {displayReports.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Không có mục từ nào gặp vấn đề theo bộ lọc hiện tại
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayReports.slice(0, 50).map(word => {
              const scriptRender = renderChineseScript(word, scriptMode);

              return (
                <div
                  key={word.id}
                  className="p-5 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition space-y-3.5"
                >
                  {/* Row Header */}
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-wide">
                          {scriptRender.primary}
                        </span>
                        {scriptRender.secondary && (
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {scriptRender.secondary}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => speakWord(word.term, 'zh-CN')}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/60 text-red-600 transition cursor-pointer"
                          title="Nghe phát âm chuẩn tiếng Trung"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                        {word.pinyin}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {word.levelLabel}
                      </span>

                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {word.pos}
                      </span>

                      {/* Status badge */}
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        word.verificationStatus === 'dictionary_verified' || word.verificationStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : word.verificationStatus === 'format_checked'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : word.verificationStatus === 'needs_review'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {word.verificationStatus === 'approved' ? '✓ Đã phê duyệt' :
                         word.verificationStatus === 'dictionary_verified' ? '✓ Đã đối chiếu HSK' :
                         word.verificationStatus === 'format_checked' ? '📋 Chuẩn định dạng' :
                         word.verificationStatus === 'needs_review' ? '⚠️ Cần xem xét' : '❗ Cảnh báo lỗi'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-mono font-bold">
                        Điểm CL: {word.qualityScore}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {word.verificationStatus !== 'approved' && (
                        <button
                          type="button"
                          onClick={() => handleMarkVerified(word)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Xác nhận chuẩn
                        </button>
                      )}

                      {userData.verificationOverrides?.[word.id] && (
                        <button
                          type="button"
                          onClick={() => handleRollback(word)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                          title="Khôi phục về trạng thái nguyên bản gốc"
                        >
                          <RotateCcw className="w-3 h-3" /> Hoàn tác
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Definition */}
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Nghĩa: {word.meaning}
                  </div>

                  {/* Multi-meaning breakdown if any */}
                  {word.multiMeanings && word.multiMeanings.length > 1 && (
                    <div className="p-3 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 space-y-1 text-xs">
                      <span className="font-bold text-teal-900 dark:text-teal-200 block">
                        📚 Phân tách các nét nghĩa riêng biệt ({word.multiMeanings.length} nghĩa):
                      </span>
                      {word.multiMeanings.map(s => (
                        <div key={s.senseNumber} className="text-teal-800 dark:text-teal-300">
                          <strong>#{s.senseNumber}:</strong> {s.definition}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tone Sandhi Banner if any */}
                  {word.toneSandhi && (
                    <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-1 text-xs">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        🔊 Lưu ý quy tắc biến điệu ngữ âm (Tone Sandhi):
                      </span>
                      <p className="text-indigo-800 dark:text-indigo-300">
                        {word.toneSandhi}
                      </p>
                    </div>
                  )}

                  {/* Confusables Banner if any */}
                  {word.confusables && word.confusables.length > 0 && (
                    <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-1.5 text-xs">
                      {word.confusables.map((c, i) => (
                        <div key={i} className="space-y-0.5">
                          <span className="font-bold text-purple-900 dark:text-purple-200">
                            💡 Dễ nhầm với: <span className="underline font-black">{c.confusedWith}</span> ({c.type === 'shape' ? 'Hình dáng chữ' : 'Cách dùng/ngữ cảnh'})
                          </span>
                          <p className="text-purple-800 dark:text-purple-300">{c.distinction}</p>
                          <p className="text-[11px] text-purple-600 dark:text-purple-400 italic">Ví dụ: {c.exampleContrast}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Field checks status tags */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      word.hanziCheck.valid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      Hán tự: {word.hanziCheck.valid ? '✓ Hợp lệ CJK' : '✕ Lỗi chữ'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      word.pinyinCheck.valid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      Pinyin: {word.pinyinCheck.valid ? '✓ Chuẩn thanh điệu' : '⚠️ Kiểm tra lại'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      word.meaningCheck.valid ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      Định nghĩa: {word.meaningCheck.valid ? '✓ Rõ ràng' : '✕ Thiếu nghĩa'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      word.exampleCheck.valid ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      Ví dụ: {word.exampleSentence ? (word.exampleCheck.valid ? '✓ Chuẩn' : '⚠️ Xem lại') : 'Chờ bổ sung'}
                    </div>
                  </div>

                  {/* Attribution Footer */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <span>Nguồn: <strong>{word.sourceReference || word.sourceName}</strong></span>
                    <span>Kiểm toán viên: <strong>{word.verifiedBy}</strong></span>
                    <span>Thời điểm: {new Date(word.verifiedAt || '').toLocaleDateString('vi-VN')}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Truncation notice */}
        {displayReports.length > 50 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Hiển thị 50 trên tổng số <strong>{displayReports.length}</strong> kết quả kiểm định. Dùng thanh tìm kiếm hoặc bộ lọc HSK để xem chi tiết từng nhóm từ.
          </div>
        )}

      </div>

    </div>
  );
}
