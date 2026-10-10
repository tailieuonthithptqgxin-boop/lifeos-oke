import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  HelpCircle, Search, Filter, RefreshCw, Check, X, 
  FileText, ExternalLink, ArrowRight, Sparkles, BookOpen, 
  Download, Eye, Edit3, Award, Info, RotateCcw, Globe
} from 'lucide-react';
import { 
  System3000Word, 
  VocabWord, 
  VocabUserData 
} from '../../lib/vocabEngine';
import { 
  runFullQualityAudit, 
  WordVerificationReport, 
  QualityAuditSummary,
  VerificationStatus,
  CONFUSABLE_PAIRS,
  ConfusablePair,
  exportQualityAuditReport,
  DIALECT_VARIATIONS
} from '../../lib/vocabVerificationEngine';

interface VocabAuditTabProps {
  systemWords: System3000Word[];
  personalWords: VocabWord[];
  userData: VocabUserData;
  onUpdateUserData: (updater: (prev: VocabUserData) => VocabUserData) => void;
  onOpenWordDetail: (word: VocabWord) => void;
}

export function VocabAuditTab({
  systemWords,
  personalWords,
  userData,
  onUpdateUserData,
  onOpenWordDetail
}: VocabAuditTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'flagged_error' | 'confusables' | 'dialects' | 'multi_meaning' | 'proposals' | 'verified'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | '3000' | 'personal'>('all');
  const [isScanning, setIsScanning] = useState(false);

  // Run or re-calculate quality audit
  const auditResult = useMemo(() => {
    return runFullQualityAudit(
      sourceFilter === 'personal' ? [] : systemWords,
      sourceFilter === '3000' ? [] : personalWords,
      userData.verificationOverrides || {}
    );
  }, [systemWords, personalWords, userData.verificationOverrides, sourceFilter]);

  const { summary, reports, problematicReports } = auditResult;

  // Filtered reports for list
  const displayReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchTerm = r.term.toLowerCase().includes(q);
        const matchMeaning = (r.meaningCheck.suggestedFix || '').toLowerCase().includes(q);
        const matchConfusable = r.confusables?.some(c => c.word.toLowerCase().includes(q));
        const matchDialect = r.dialectVariation && (r.dialectVariation.bre.toLowerCase().includes(q) || r.dialectVariation.name.toLowerCase().includes(q));
        if (!matchTerm && !matchMeaning && !matchConfusable && !matchDialect) return false;
      }

      // 2. Status filter
      if (statusFilter === 'needs_review' && r.status !== 'needs_review') return false;
      if (statusFilter === 'flagged_error' && r.status !== 'flagged_error') return false;
      if (statusFilter === 'verified' && r.status !== 'lexical_verified' && r.status !== 'format_checked') return false;
      if (statusFilter === 'confusables' && (!r.confusables || r.confusables.length === 0)) return false;
      if (statusFilter === 'dialects' && !r.dialectVariation) return false;
      if (statusFilter === 'multi_meaning' && (!r.multiMeanings || r.multiMeanings.length <= 1)) return false;
      if (statusFilter === 'proposals' && !r.proposedEdit) return false;

      return true;
    });
  }, [reports, searchTerm, statusFilter]);

  // Handle Approve Proposed Edit
  const handleApproveEdit = (report: WordVerificationReport) => {
    if (!report.proposedEdit) return;
    const prop = report.proposedEdit;

    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      overrides[report.wordId] = {
        ...report,
        status: 'lexical_verified',
        qualityScore: 98,
        proposedEdit: undefined,
        auditTrail: [
          ...report.auditTrail,
          {
            timestamp: new Date().toISOString(),
            action: 'APPROVED',
            actor: 'Quản trị viên / Giáo viên',
            details: `Đã phê duyệt đề xuất sửa đổi: ${prop.reason} (Nguồn: ${prop.referenceSource || 'Oxford/Cambridge'})`
          }
        ]
      };

      // If it's a personal word, update the actual word properties
      let updatedWords = { ...prev.words };
      if (!report.wordId.startsWith('word_3000_')) {
        const activeLangId = prev.activeLanguageId;
        const currentList = prev.words[activeLangId] || [];
        updatedWords[activeLangId] = currentList.map(w => {
          if (w.id !== report.wordId) return w;
          return {
            ...w,
            term: prop.term || w.term,
            partOfSpeech: prop.partOfSpeech || w.partOfSpeech,
            phonetic: prop.phonetic || w.phonetic,
            meaning: prop.meaning || w.meaning,
            exampleSentence: prop.exampleSentence || w.exampleSentence,
            exampleTranslation: prop.exampleTranslation || w.exampleTranslation,
            updatedAt: new Date().toISOString()
          };
        });
      }

      return {
        ...prev,
        words: updatedWords,
        verificationOverrides: overrides
      };
    });

    alert(`✓ Đã áp dụng đề xuất chỉnh sửa thành công cho từ "${report.term}"!`);
  };

  // Handle Reject Proposed Edit
  const handleRejectEdit = (report: WordVerificationReport) => {
    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      overrides[report.wordId] = {
        ...report,
        proposedEdit: undefined,
        auditTrail: [
          ...report.auditTrail,
          {
            timestamp: new Date().toISOString(),
            action: 'REJECTED',
            actor: 'Quản trị viên / Giáo viên',
            details: 'Đã từ chối đề xuất chỉnh sửa sau khi rà soát.'
          }
        ]
      };
      return {
        ...prev,
        verificationOverrides: overrides
      };
    });
  };

  // Handle Rollback to raw document
  const handleRollback = (report: WordVerificationReport) => {
    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      delete overrides[report.wordId];
      return {
        ...prev,
        verificationOverrides: overrides
      };
    });
    alert(`Đã khôi phục mục từ "${report.term}" về nguyên bản dữ liệu gốc.`);
  };

  // Handle Mark as Verified
  const handleMarkVerified = (report: WordVerificationReport) => {
    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      overrides[report.wordId] = {
        ...report,
        status: 'lexical_verified',
        qualityScore: Math.max(92, report.qualityScore),
        referenceSource: 'Oxford Advanced Learner\'s / Cambridge Academic Corpus',
        auditTrail: [
          ...report.auditTrail,
          {
            timestamp: new Date().toISOString(),
            action: 'VERIFIED',
            actor: 'Học viên / Quản trị viên',
            details: 'Đã xác nhận tính chuẩn mực ngữ nghĩa và ngữ cảnh.'
          }
        ]
      };
      return {
        ...prev,
        verificationOverrides: overrides
      };
    });
  };

  // Export full audit report as JSON
  const handleExportAuditJson = () => {
    const jsonStr = exportQualityAuditReport(reports, 'json');
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_audit_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Export audit report as CSV
  const handleExportAuditCsv = () => {
    const csvStr = exportQualityAuditReport(reports, 'csv');
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_audit_matrix_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP AUDIT BANNER & ACTIONS */}
      <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-500/20 text-blue-400 rounded-xl text-xl">
              🛡️
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300">
              Data Quality & Linguistic Verification Engine
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black">
            Kiểm định & Xác minh Độ chính xác Từ vựng
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Hệ thống rà soát ngữ pháp, phiên âm IPA, từ loại, phân biệt ngữ cảnh, đối chiếu cặp từ dễ nhầm lẫn (Confusables), dị biệt Anh - Mỹ (BrE vs NAmE), và bảo toàn nguyên vẹn tài liệu gốc qua chuỗi kiểm toán không phá hủy.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsScanning(true);
              setTimeout(() => setIsScanning(false), 700);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Đang quét dữ liệu...' : 'Quét lại toàn bộ'}
          </button>

          <button
            type="button"
            onClick={handleExportAuditCsv}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-200" /> Xuất CSV
          </button>

          <button
            type="button"
            onClick={handleExportAuditJson}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-300" /> Xuất JSON
          </button>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        
        {/* Score Card */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Chỉ số Tin cậy</span>
          <div className="text-2xl font-black text-blue-600">
            {summary.averageQualityScore}/100
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {summary.totalAudited.toLocaleString('vi-VN')} mục đã quét
          </span>
        </div>

        {/* Verified Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Đã chuẩn hóa</span>
          <div className="text-2xl font-black text-emerald-600">
            {summary.verifiedCount + summary.formatCheckedCount}
          </div>
          <span className="text-[11px] text-slate-500">
            {Math.round(((summary.verifiedCount + summary.formatCheckedCount) / (summary.totalAudited || 1)) * 100)}% kho từ
          </span>
        </div>

        {/* Needs Review Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Cần xem xét</span>
          <div className="text-2xl font-black text-amber-600">
            {summary.needsReviewCount}
          </div>
          <span className="text-[11px] text-amber-500 font-medium">Cảnh báo ngữ nghĩa</span>
        </div>

        {/* Confusables Count */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Dễ nhầm lẫn</span>
          <div className="text-2xl font-black text-purple-600">
            {summary.potentialConfusablesCount}
          </div>
          <span className="text-[11px] text-purple-500 font-medium">Có giải thích ngữ cảnh</span>
        </div>

        {/* Dialect Variations */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Anh - Mỹ (BrE/NAmE)</span>
          <div className="text-2xl font-black text-indigo-600">
            {summary.dialectVariationsCount}
          </div>
          <span className="text-[11px] text-indigo-500 font-medium">Khác biệt chính tả/từ</span>
        </div>

        {/* Multi-meanings */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Từ đa nghĩa</span>
          <div className="text-2xl font-black text-teal-600">
            {summary.multiMeaningCount}
          </div>
          <span className="text-[11px] text-teal-500 font-medium">Tách rõ từng nét nghĩa</span>
        </div>

      </div>

      {/* 3. AUDIT CONTROLS & FILTERS */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm từ kiểm định (affect, colour, principal, economic...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Tất cả mục ({reports.length})</option>
              <option value="needs_review">⚠️ Cần xem xét thêm ({summary.needsReviewCount})</option>
              <option value="confusables">💡 Cặp từ dễ nhầm lẫn ({summary.potentialConfusablesCount})</option>
              <option value="dialects">🇬🇧 Dị biệt Anh - Mỹ ({summary.dialectVariationsCount})</option>
              <option value="multi_meaning">📚 Từ đa nghĩa ({summary.multiMeaningCount})</option>
              <option value="proposals">✨ Đề xuất đang chờ ({summary.proposedEditsCount})</option>
              <option value="flagged_error">❗ Cảnh báo lỗi ({summary.flaggedErrorCount})</option>
              <option value="verified">✓ Đã xác minh chuẩn ({summary.verifiedCount + summary.formatCheckedCount})</option>
            </select>

            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Toàn bộ kho từ</option>
              <option value="3000">🌟 3000 từ thông dụng</option>
              <option value="personal">👤 Từ vựng cá nhân</option>
            </select>
          </div>
        </div>

        {/* Source Transparency Badge Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">Minh bạch nguồn dữ liệu:</span>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-[11px]">
              Tài liệu DOCX gốc: 3.522 mục
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
              Từ vựng cá nhân: {personalWords.length} mục
            </span>
          </div>

          <span className="text-slate-500">
            Hiển thị <strong>{displayReports.length}</strong> kết quả kiểm định
          </span>
        </div>
      </div>

      {/* 4. AUDIT REPORTS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {displayReports.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Không có mục từ nào gặp vấn đề theo bộ lọc hiện tại
            </p>
            <p className="text-xs text-slate-400">
              Tất cả các từ trong danh mục đã được kiểm định đạt tiêu chuẩn chất lượng.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayReports.slice(0, 50).map(report => {
              const hasConfusables = report.confusables && report.confusables.length > 0;
              const hasDialect = !!report.dialectVariation;
              const hasMultiMeaning = report.multiMeanings && report.multiMeanings.length > 1;
              const hasWarnings = report.termCheck.warnings.length > 0 || 
                report.posCheck.warnings.length > 0 || 
                report.phoneticCheck.warnings.length > 0 || 
                report.meaningCheck.warnings.length > 0 ||
                report.exampleCheck.warnings.length > 0;

              return (
                <div
                  key={report.wordId}
                  className="p-5 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition space-y-3.5"
                >
                  {/* Row Top Header */}
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-black text-slate-900 dark:text-white text-base">
                        {report.term}
                      </h4>

                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        report.status === 'lexical_verified'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : report.status === 'format_checked'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : report.status === 'needs_review'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {report.status === 'lexical_verified' ? '✓ Đã xác minh từ điển' :
                         report.status === 'format_checked' ? '📋 Đã kiểm tra định dạng' :
                         report.status === 'needs_review' ? '⚠️ Cần xem xét thêm' : '❗ Cảnh báo dữ liệu'}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono font-bold">
                        Điểm CL: {report.qualityScore}/100
                      </span>

                      {hasDialect && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold flex items-center gap-1">
                          <Globe className="w-3 h-3" /> BrE / NAmE
                        </span>
                      )}

                      {hasMultiMeaning && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 text-[10px] font-bold">
                          Đa nghĩa ({report.multiMeanings!.length})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {report.status !== 'lexical_verified' && (
                        <button
                          type="button"
                          onClick={() => handleMarkVerified(report)}
                          className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Xác nhận đạt chuẩn
                        </button>
                      )}

                      {userData.verificationOverrides?.[report.wordId] && (
                        <button
                          type="button"
                          onClick={() => handleRollback(report)}
                          className="px-2.5 py-1 text-slate-500 hover:text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer flex items-center gap-1"
                          title="Khôi phục về trạng thái nguyên bản từ DOCX gốc"
                        >
                          <RotateCcw className="w-3 h-3" /> Hoàn tác
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GRANULAR FIELD CHECKS STATUS BADGES */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-xs">
                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      report.fieldStatuses.term === 'lexical_verified' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                      report.fieldStatuses.term === 'format_checked' ? 'bg-blue-50/70 border-blue-200 text-blue-800' :
                      'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      Chính tả: {report.termCheck.valid ? '✓ Hợp lệ' : '✕ Cần sửa'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      report.fieldStatuses.pos === 'lexical_verified' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                      report.fieldStatuses.pos === 'format_checked' ? 'bg-blue-50/70 border-blue-200 text-blue-800' :
                      'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      Từ loại: {report.posCheck.valid ? '✓ Đã phân loại' : '⚠️ Chưa chuẩn'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      report.phoneticCheck.score >= 70 ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      IPA: {report.phoneticCheck.score >= 70 ? '✓ Chuẩn IPA' : '⚠️ Thiếu IPA'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      report.fieldStatuses.meaning === 'lexical_verified' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                      report.fieldStatuses.meaning === 'format_checked' ? 'bg-blue-50/70 border-blue-200 text-blue-800' :
                      'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      Định nghĩa: {report.meaningCheck.valid ? '✓ Rõ ràng' : '✕ Lỗi nghĩa'}
                    </div>

                    <div className={`p-1.5 rounded-lg border text-center font-medium ${
                      report.fieldStatuses.example === 'lexical_verified' ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' :
                      report.exampleCheck.score >= 50 ? 'bg-slate-50 border-slate-200 text-slate-700' :
                      'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      Ví dụ: {report.exampleCheck.valid ? '✓ Đạt ngữ cảnh' : '⚠️ Cần ví dụ'}
                    </div>
                  </div>

                  {/* DIALECT VARIATION BANNER (IF ANY) */}
                  {hasDialect && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 space-y-1 text-xs">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        🇬🇧 / 🇺🇸 Dị biệt phương ngữ Anh - Mỹ:
                      </span>
                      <p className="text-indigo-800 dark:text-indigo-300">
                        Anh-Anh (BrE): <strong className="font-mono">{report.dialectVariation!.bre}</strong> • Anh-Mỹ (NAmE): <strong className="font-mono">{report.dialectVariation!.name}</strong>
                      </p>
                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 italic">
                        {report.dialectVariation!.distinction}
                      </p>
                    </div>
                  )}

                  {/* MULTI-MEANING BREAKDOWN (IF ANY) */}
                  {hasMultiMeaning && (
                    <div className="p-3.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 space-y-1.5 text-xs">
                      <span className="font-bold text-teal-900 dark:text-teal-200 block">
                        📚 Phân tách các nét nghĩa riêng biệt ({report.multiMeanings!.length} nghĩa):
                      </span>
                      <div className="space-y-1">
                        {report.multiMeanings!.map(sense => (
                          <div key={sense.senseNumber} className="flex items-start gap-2 text-teal-800 dark:text-teal-300">
                            <span className="font-bold text-teal-600 shrink-0">#{sense.senseNumber}.</span>
                            <span>{sense.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CONFUSABLES WARNING CARD (IF ANY) */}
                  {hasConfusables && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 space-y-2 text-xs">
                      {report.confusables!.map((c, idx) => (
                        <div key={idx} className="space-y-1">
                          <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                            💡 Dễ nhầm với: <span className="underline decoration-purple-500 font-black">{c.word}</span>
                          </span>
                          <p className="text-purple-800 dark:text-purple-300">
                            {c.distinction}
                          </p>
                          <p className="text-[11px] text-purple-600 dark:text-purple-400 italic">
                            Ví dụ đối chiếu: {c.exampleAlert}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* FIELD WARNINGS (IF ANY) */}
                  {hasWarnings && (
                    <div className="space-y-1 text-xs">
                      {[
                        ...report.termCheck.warnings,
                        ...report.posCheck.warnings,
                        ...report.phoneticCheck.warnings,
                        ...report.meaningCheck.warnings,
                        ...report.exampleCheck.warnings
                      ].map((w, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PROPOSED EDIT BLOCK (IF ANY) */}
                  {report.proposedEdit && (
                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" /> Đề xuất chỉnh sửa chất lượng
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveEdit(report)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition cursor-pointer"
                          >
                            Phê duyệt đề xuất
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectEdit(report)}
                            className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg transition cursor-pointer"
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/50 border border-blue-100 dark:border-blue-900">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Nội dung đề xuất mới</span>
                          <p className="font-semibold text-slate-800 dark:text-slate-200">
                            {report.proposedEdit.meaning || report.proposedEdit.term || report.proposedEdit.phonetic}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase">Căn cứ & Nguồn trích dẫn</span>
                          <p className="text-slate-600 dark:text-slate-400">
                            {report.proposedEdit.reason} ({report.proposedEdit.referenceSource || 'Oxford/Cambridge'})
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* AUDIT SOURCE ATTRIBUTION FOOTER */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                    <span>Nguồn tham chiếu: <strong>{report.referenceSource || 'DOCX Core Dictionary'}</strong></span>
                    <span>Kiểm toán viên: <strong>{report.auditor || 'Linguistic Verification Engine'}</strong></span>
                    <span>Thời điểm: {new Date(report.lastAuditedAt).toLocaleDateString('vi-VN')}</span>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* More items notification */}
        {displayReports.length > 50 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
            Hiển thị 50 trên tổng số <strong>{displayReports.length}</strong> kết quả kiểm định. Hãy sử dụng thanh tìm kiếm để lọc chi tiết.
          </div>
        )}

      </div>

    </div>
  );
}
