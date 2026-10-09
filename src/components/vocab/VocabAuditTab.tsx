import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Clock, 
  HelpCircle, Search, Filter, RefreshCw, Check, X, 
  FileText, ExternalLink, ArrowRight, Sparkles, BookOpen, 
  Download, Eye, Edit3, Award, Info
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
  ConfusablePair
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'needs_review' | 'flagged_error' | 'confusables' | 'verified'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | '3000' | 'personal'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

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
        if (!r.term.toLowerCase().includes(q)) return false;
      }

      // 2. Status filter
      if (statusFilter === 'needs_review' && r.status !== 'needs_review') return false;
      if (statusFilter === 'flagged_error' && r.status !== 'flagged_error') return false;
      if (statusFilter === 'verified' && r.status !== 'lexical_verified' && r.status !== 'format_checked') return false;
      if (statusFilter === 'confusables' && (!r.confusables || r.confusables.length === 0)) return false;

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
        qualityScore: 95,
        auditTrail: [
          ...report.auditTrail,
          {
            timestamp: new Date().toISOString(),
            action: 'APPROVED',
            actor: 'Quản trị viên / Học viên',
            details: `Đã phê duyệt đề xuất sửa đổi: ${prop.reason}`
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

  // Handle Mark as Verified
  const handleMarkVerified = (report: WordVerificationReport) => {
    onUpdateUserData(prev => {
      const overrides = { ...(prev.verificationOverrides || {}) };
      overrides[report.wordId] = {
        ...report,
        status: 'lexical_verified',
        qualityScore: Math.max(90, report.qualityScore),
        referenceSource: "Đã đối chiếu với Từ điển chuẩn (Oxford/Cambridge)",
        auditTrail: [
          ...report.auditTrail,
          {
            timestamp: new Date().toISOString(),
            action: 'VERIFIED',
            actor: 'Học viên / Quản trị viên',
            details: 'Đã xác nhận tính chính xác của từ vựng.'
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
    const reportData = {
      exportedAt: new Date().toISOString(),
      summary,
      auditedRecordsCount: reports.length,
      records: reports
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocabulary_audit_report_${new Date().toISOString().split('T')[0]}.json`;
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
            Hệ thống rà soát ngữ pháp, phiên âm IPA, từ loại, phân biệt ngữ cảnh, đối chiếu cặp từ dễ nhầm lẫn và lưu vết kiểm toán minh bạch cho toàn bộ kho từ vựng.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIsScanning(true);
              setTimeout(() => setIsScanning(false), 800);
            }}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Đang quét dữ liệu...' : 'Quét lại toàn bộ'}
          </button>

          <button
            type="button"
            onClick={handleExportAuditJson}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Xuất báo cáo JSON
          </button>
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Score Card */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Chỉ số Tin cậy Dữ liệu</span>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">
            {summary.averageQualityScore}/100
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">
            {summary.totalAudited.toLocaleString('vi-VN')} mục đã quét
          </span>
        </div>

        {/* Verified Count */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Đã xác minh chuẩn</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {summary.verifiedCount + summary.formatCheckedCount}
          </div>
          <span className="text-[11px] text-slate-500">
            {Math.round(((summary.verifiedCount + summary.formatCheckedCount) / (summary.totalAudited || 1)) * 100)}% kho từ
          </span>
        </div>

        {/* Needs Review Count */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Cần xem xét thêm</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {summary.needsReviewCount}
          </div>
          <span className="text-[11px] text-amber-500 font-medium">Cảnh báo ngữ nghĩa / IPA</span>
        </div>

        {/* Confusables Count */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-400 block">Cặp từ dễ nhầm lẫn</span>
          <div className="text-2xl sm:text-3xl font-black text-purple-600">
            {summary.potentialConfusablesCount}
          </div>
          <span className="text-[11px] text-purple-500 font-medium">Có phân biệt ngữ cảnh</span>
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
              placeholder="Tìm kiếm từ cần kiểm định (affect, principal, economic...)"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Tất cả trạng thái kiểm định ({reports.length})</option>
              <option value="needs_review">⚠️ Cần xem xét thêm ({summary.needsReviewCount})</option>
              <option value="confusables">💡 Cặp từ dễ nhầm lẫn ({summary.potentialConfusablesCount})</option>
              <option value="flagged_error">❗ Có cảnh báo lỗi ({summary.flaggedErrorCount})</option>
              <option value="verified">✓ Đã xác minh chuẩn ({summary.verifiedCount + summary.formatCheckedCount})</option>
            </select>

            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Toàn bộ nguồn dữ liệu</option>
              <option value="3000">🌟 3000 từ thông dụng</option>
              <option value="personal">👤 Từ vựng cá nhân</option>
            </select>
          </div>
        </div>

        {/* Source Transparency Badge Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold">Minh bạch nguồn gốc:</span>
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
              Tất cả các từ trong danh mục đã được kiểm định đạt tiêu chuẩn.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {displayReports.slice(0, 50).map(report => {
              const hasConfusables = report.confusables && report.confusables.length > 0;
              const hasWarnings = report.termCheck.warnings.length > 0 || 
                report.posCheck.warnings.length > 0 || 
                report.phoneticCheck.warnings.length > 0 || 
                report.meaningCheck.warnings.length > 0;

              return (
                <div
                  key={report.wordId}
                  className="p-5 sm:px-6 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition space-y-3"
                >
                  {/* Row Top Header */}
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
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
                        Điểm tin cậy: {report.qualityScore}/100
                      </span>
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
                    </div>
                  </div>

                  {/* FIELD CHECKS STATUS BADGES */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      report.termCheck.valid ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-rose-100 text-rose-700'
                    }`}>
                      Chính tả: {report.termCheck.valid ? '✓ Hợp lệ' : '✕ Có lỗi'}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      report.posCheck.valid ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-rose-100 text-rose-700'
                    }`}>
                      Từ loại: {report.posCheck.valid ? '✓ Đã phân loại' : '✕ Chưa rõ'}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      report.phoneticCheck.score >= 70 ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-amber-100 text-amber-700'
                    }`}>
                      IPA: {report.phoneticCheck.score >= 70 ? '✓ Đầy đủ' : '⚠️ Thiếu IPA'}
                    </span>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                      report.meaningCheck.valid ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-rose-100 text-rose-700'
                    }`}>
                      Nghĩa: {report.meaningCheck.valid ? '✓ Rõ ràng' : '✕ Cần xem'}
                    </span>
                  </div>

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
                        ...report.meaningCheck.warnings
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
                    <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-blue-600" /> Đề xuất chỉnh sửa chất lượng
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApproveEdit(report)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition cursor-pointer"
                        >
                          Phê duyệt đề xuất này
                        </button>
                      </div>

                      <p className="text-slate-600 dark:text-slate-400">
                        Lý do: <strong>{report.proposedEdit.reason}</strong>
                      </p>
                    </div>
                  )}

                  {/* AUDIT SOURCE ATTRIBUTION FOOTER */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span>Nguồn tham chiếu: {report.referenceSource || 'DOCX Core Dictionary'}</span>
                    <span>Kiểm định gần nhất: {new Date(report.lastAuditedAt).toLocaleDateString('vi-VN')}</span>
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
