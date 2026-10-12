import React, { useState } from 'react';
import { 
  X, Volume2, Bookmark, CheckCircle2, AlertTriangle, 
  Clock, Calendar, Award, BookOpen, Brain, Edit3, Save, 
  ExternalLink, Sparkles, Tag, Plus, Check
} from 'lucide-react';
import { 
  VocabWord, 
  VocabCollection, 
  MasteryState, 
  speakWord 
} from '../../lib/vocabEngine';
import { verifyWord } from '../../lib/vocabVerificationEngine';

interface WordDetailModalProps {
  word: VocabWord;
  isSystemWord: boolean;
  collections: VocabCollection[];
  bookmarkedCollectionIds?: string[];
  onClose: () => void;
  onSaveNotes?: (notes: string) => void;
  onToggleBookmark?: (collectionId: string) => void;
  onMarkState?: (state: MasteryState) => void;
  onStartStudy?: (word: VocabWord) => void;
}

export function WordDetailModal({
  word,
  isSystemWord,
  collections,
  bookmarkedCollectionIds = [],
  onClose,
  onSaveNotes,
  onToggleBookmark,
  onMarkState,
  onStartStudy
}: WordDetailModalProps) {
  const [personalNotes, setPersonalNotes] = useState(word.notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      setIsSavingNotes(true);
      onSaveNotes(personalNotes.trim());
      setIsSavingNotes(false);
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
    }
  };

  const getStateBadge = (state: MasteryState) => {
    switch (state) {
      case 'mastered':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Đã thuộc vững
          </span>
        );
      case 'difficult':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Hay quên / Cần củng cố
          </span>
        );
      case 'reviewing':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Đang theo dõi ôn tập
          </span>
        );
      case 'learning':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Đang nạp / Ghi nhớ
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1.5">
            🌱 Mới / Chưa học
          </span>
        );
    }
  };

  const isJapanese = word.languageId === 'ja' || word.id.startsWith('ja_');
  const isChinese = word.languageId === 'zh' || word.id.startsWith('zh_');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/30 dark:from-slate-800/40 dark:to-slate-800/20">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                isSystemWord 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-emerald-600 text-white'
              }`}>
                {isSystemWord 
                  ? (isJapanese ? 'Kho chuẩn JLPT N5 - N1' : isChinese ? 'Kho chuẩn HSK 1 - 9' : '3000 Từ thông dụng') 
                  : 'Từ vựng cá nhân'}
              </span>
              {word.partOfSpeech && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono">
                  {word.partOfSpeech}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {word.term}
              </h2>
              <div className="flex items-center gap-1.5">
                {isJapanese ? (
                  <button
                    type="button"
                    onClick={() => speakWord(word.furigana || word.phonetic || word.term, 'ja-JP')}
                    className="px-2.5 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    title="Phát âm tiếng Nhật chuẩn (ja-JP)"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> 🇯🇵 ja-JP
                  </button>
                ) : isChinese ? (
                  <button
                    type="button"
                    onClick={() => speakWord(word.term, 'zh-CN')}
                    className="px-2.5 py-1 rounded-xl bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                    title="Phát âm tiếng Trung chuẩn (zh-CN)"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> 🇨🇳 zh-CN
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => speakWord(word.term, 'en-US')}
                      className="px-2.5 py-1 rounded-xl bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                      title="Nghe giọng chuẩn Anh-Mỹ (US)"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> 🇺🇸 US
                    </button>
                    <button
                      type="button"
                      onClick={() => speakWord(word.term, 'en-GB')}
                      className="px-2.5 py-1 rounded-xl bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition cursor-pointer flex items-center gap-1"
                      title="Nghe giọng chuẩn Anh-Anh (UK)"
                    >
                      <Volume2 className="w-3.5 h-3.5" /> 🇬🇧 UK
                    </button>
                  </>
                )}
              </div>
            </div>

            {word.phonetic && (
              <p className="text-sm font-mono text-slate-500 dark:text-slate-400 mt-1">
                {word.phonetic} {word.romaji ? `(${word.romaji})` : ''}
              </p>
            )}
            {word.hanViet && (
              <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                Âm Hán Việt: {word.hanViet}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto text-sm">
          
          {/* NGHĨA TIẾNG VIỆT */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Định nghĩa & Nghĩa tiếng Việt
            </span>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              {word.meaning}
            </p>
            {word.secondaryMeanings && word.secondaryMeanings.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                Nghĩa bổ sung: {word.secondaryMeanings.join(' • ')}
              </p>
            )}
          </div>

          {/* CÂU VÍ DỤ NẾU CÓ */}
          {(word.exampleSentence || word.exampleTranslation) && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Ví dụ sử dụng trong ngữ cảnh
              </span>
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 space-y-1">
                {word.exampleSentence && (
                  <p className="font-semibold text-slate-900 dark:text-slate-100 italic">
                    "{word.exampleSentence}"
                  </p>
                )}
                {word.exampleTranslation && (
                  <p className="text-xs text-indigo-700 dark:text-indigo-300">
                    → {word.exampleTranslation}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* KIỂM ĐỊNH CHẤT LƯỢNG & NGUỒN DỮ LIỆU */}
          {(() => {
            const report = word.verification || verifyWord({
              id: word.id,
              term: word.term,
              pos: word.partOfSpeech,
              phonetic: word.phonetic,
              meaning: word.meaning,
              exampleSentence: word.exampleSentence,
              exampleTranslation: word.exampleTranslation
            });

            const getStatusColor = (status: string) => {
              switch (status) {
                case 'lexical_verified': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
                case 'format_checked': return 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800';
                case 'needs_review': return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800';
                case 'flagged_error': return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800';
                default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
              }
            };

            const getStatusLabel = (status: string) => {
              switch (status) {
                case 'lexical_verified': return '✓ Đã xác minh độ chính xác';
                case 'format_checked': return '✓ Đã chuẩn hóa định dạng';
                case 'needs_review': return '⚠️ Cần xem xét thêm';
                case 'flagged_error': return '⛔ Có lỗi cần sửa';
                default: return 'Chưa kiểm định';
              }
            };

            const getSourceLabel = (src: string) => {
              switch (src) {
                case 'raw_document': return '📄 Trích xuất từ DOCX gốc';
                case 'format_normalized': return '🔍 Chuẩn hóa định dạng kỹ thuật';
                case 'dictionary_reference': return '📚 Đối chiếu từ điển học thuật';
                case 'ai_generated': return '🤖 Đề xuất từ AI (Cần rà soát)';
                case 'user_contributed': return '👤 Từ cá nhân người học';
                default: return src;
              }
            };

            return (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Kiểm định chất lượng & Minh bạch nguồn
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${getStatusColor(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      Điểm CL: {report.qualityScore}/100
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-medium text-slate-400">Nguồn dữ liệu:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                    {getSourceLabel(report.primarySource)}
                  </span>
                  {report.referenceSource && (
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      ({report.referenceSource})
                    </span>
                  )}
                </div>

                {/* Field-level check pills */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-[11px]">
                  <div className={`p-1.5 rounded-lg border text-center font-medium ${
                    report.termCheck.valid 
                      ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800'
                  }`}>
                    Từ vựng: {report.termCheck.valid ? '✓ Chuẩn' : '⚠️ Cần sửa'}
                  </div>
                  <div className={`p-1.5 rounded-lg border text-center font-medium ${
                    report.posCheck.valid 
                      ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800'
                  }`}>
                    Từ loại: {report.posCheck.valid ? '✓ Chuẩn' : '⚠️ Xem lại'}
                  </div>
                  <div className={`p-1.5 rounded-lg border text-center font-medium ${
                    report.phoneticCheck.valid 
                      ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800'
                  }`}>
                    Phiên âm: {report.phoneticCheck.valid ? '✓ Chuẩn' : '⚠️ Xem lại'}
                  </div>
                  <div className={`p-1.5 rounded-lg border text-center font-medium ${
                    report.meaningCheck.valid 
                      ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800'
                  }`}>
                    Nghĩa dịch: {report.meaningCheck.valid ? '✓ Rõ ràng' : '⚠️ Xem lại'}
                  </div>
                  <div className={`p-1.5 rounded-lg border text-center font-medium ${
                    report.exampleCheck.valid 
                      ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-800/40 dark:text-emerald-300' 
                      : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800'
                  }`}>
                    Ví dụ: {report.exampleCheck.valid ? '✓ Đạt' : '⚠️ Cần ví dụ'}
                  </div>
                </div>

                {/* Dialect Variation Banner if any */}
                {report.dialectVariation && (
                  <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-xs space-y-1">
                    <span className="font-bold text-indigo-900 dark:text-indigo-200 block">
                      🇬🇧 / 🇺🇸 Phương ngữ Anh - Mỹ:
                    </span>
                    <p className="text-indigo-800 dark:text-indigo-300">
                      BrE: <strong className="font-mono">{report.dialectVariation.bre}</strong> • NAmE: <strong className="font-mono">{report.dialectVariation.name}</strong>
                    </p>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 italic">
                      {report.dialectVariation.distinction}
                    </p>
                  </div>
                )}

                {/* Multi-meanings list if any */}
                {report.multiMeanings && report.multiMeanings.length > 1 && (
                  <div className="p-3 rounded-xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/40 text-xs space-y-1">
                    <span className="font-bold text-teal-900 dark:text-teal-200 block">
                      📚 Phân tách các nét nghĩa ({report.multiMeanings.length} nghĩa):
                    </span>
                    <div className="space-y-0.5">
                      {report.multiMeanings.map(s => (
                        <p key={s.senseNumber} className="text-teal-800 dark:text-teal-300">
                          <strong>#{s.senseNumber}:</strong> {s.definition}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confusables alert if any */}
                {report.confusables && report.confusables.length > 0 && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Lưu ý từ dễ gây nhầm lẫn (False Friends / Confusables):
                    </div>
                    {report.confusables.map((c, i) => (
                      <div key={i} className="pl-5 border-l-2 border-amber-400 space-y-0.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-100">
                          Dễ nhầm với <span className="underline font-black text-amber-600 dark:text-amber-400">"{c.word}"</span>: {c.distinction}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                          💡 {c.exampleAlert}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Audit trail summary */}
                {report.auditTrail && report.auditTrail.length > 0 && (
                  <div className="pt-1 text-[11px] text-slate-500 space-y-1">
                    <span className="font-bold uppercase tracking-wider block text-slate-400">Lịch sử kiểm toán gần nhất:</span>
                    {report.auditTrail.slice(-2).map((entry, idx) => (
                      <p key={idx} className="text-slate-600 dark:text-slate-400 font-mono">
                        [{new Date(entry.timestamp).toLocaleDateString('vi-VN')}] {entry.action} - {entry.details}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TIẾN ĐỘ GHI NHỚ (SM-2 SPACED REPETITION) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Tiến độ học & Lịch Spaced Repetition (SM-2)
              </span>
              {getStateBadge(word.state)}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Số lượt ôn tập</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                  {word.repetitionCount || 0} lần
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Khoảng cách ôn</span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {word.intervalDays || 0} ngày
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Hệ số dễ nhớ (EF)</span>
                <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                  {Number(word.easeFactor || 2.5).toFixed(2)}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 block font-medium">Ôn tiếp theo</span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {word.nextReviewAt || 'Chưa lên lịch'}
                </span>
              </div>
            </div>

            {/* Quick state change triggers */}
            {onMarkState && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium">Đánh dấu nhanh:</span>
                <button
                  type="button"
                  onClick={() => onMarkState('mastered')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 transition cursor-pointer"
                >
                  ✓ Đã thuộc
                </button>
                <button
                  type="button"
                  onClick={() => onMarkState('difficult')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 transition cursor-pointer"
                >
                  🔥 Hay quên
                </button>
                <button
                  type="button"
                  onClick={() => onMarkState('learning')}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 transition cursor-pointer"
                >
                  ⚡ Đang học
                </button>
              </div>
            )}
          </div>

          {/* GHI CHÚ CÁ NHÂN & MẸO NHỚ */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" /> Ghi chú cá nhân, ngữ cảnh đã gặp & Mẹo ghi nhớ
              </label>
              {notesSavedSuccess && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã lưu ghi chú!
                </span>
              )}
            </div>
            
            <textarea
              rows={3}
              value={personalNotes}
              onChange={e => setPersonalNotes(e.target.value)}
              placeholder="Ví dụ: Gặp trong bài đọc đề thi thử; Mẹo nhớ bằng hình ảnh..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            {onSaveNotes && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveNotes}
                  disabled={isSavingNotes}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Lưu ghi chú
                </button>
              </div>
            )}
          </div>

          {/* BỘ SƯU TẬP CÁ NHÂN LIÊN KẾT (DÀNH CHO TỪ 3000 HOẶC TỪ CÁ NHÂN) */}
          {collections.length > 0 && onToggleBookmark && (
            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-blue-600" /> Thêm vào Bộ sưu tập cá nhân
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu liên kết từ vựng này vào các bộ chủ đề của bạn (không nhân bản dữ liệu gốc):
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {collections.map(col => {
                  const isBookmarked = bookmarkedCollectionIds.includes(col.id) || word.collectionId === col.id;
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => onToggleBookmark(col.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                        isBookmarked
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span>{col.icon || '📚'}</span>
                      <span>{col.title}</span>
                      {isBookmarked && <Check className="w-3.5 h-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            Đóng
          </button>

          {onStartStudy && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartStudy(word);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-500/20"
            >
              <Brain className="w-4 h-4" /> Luyện tập từ này ngay
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
