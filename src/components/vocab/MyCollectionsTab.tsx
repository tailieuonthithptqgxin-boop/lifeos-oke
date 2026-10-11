import React from 'react';
import { 
  Layers, Plus, Brain, Bookmark, BookOpen, ChevronRight, 
  Trash2, Edit3, Tag
} from 'lucide-react';
import { 
  VocabCollection, 
  VocabWord, 
  UserWordProgress,
  System3000Word,
  systemWordToVocabWord 
} from '../../lib/vocabEngine';

interface MyCollectionsTabProps {
  collections: VocabCollection[];
  personalWords: VocabWord[];
  systemWords: System3000Word[];
  progressMap: Record<string, UserWordProgress>;
  onNewCollection: () => void;
  onOpenCollection: (colId: string) => void;
  onStartStudyCollection: (words: VocabWord[]) => void;
  onDeleteCollection: (colId: string) => void;
}

export function MyCollectionsTab({
  collections = [],
  personalWords = [],
  systemWords = [],
  progressMap = {},
  onNewCollection,
  onOpenCollection,
  onStartStudyCollection,
  onDeleteCollection
}: MyCollectionsTabProps) {

  const getCollectionWords = (colId: string): VocabWord[] => {
    // 1. Personal words belonging to this collection
    const personal = (personalWords || []).filter(w => w.collectionId === colId);

    // 2. 3000 system words bookmarked into this collection
    const bookmarkedSys = (systemWords || []).filter(sys => {
      const prog = progressMap?.[sys.id];
      return prog?.bookmarkedCollectionIds?.includes(colId);
    });

    const sysAsVocab = bookmarkedSys.map(s => systemWordToVocabWord(s, progressMap?.[s.id], colId));

    return [...personal, ...sysAsVocab];
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
            Bộ sưu tập của tôi ({(collections || []).length})
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tổ chức từ vựng theo giáo trình, môn học, kỳ thi hoặc chủ đề bạn quan tâm.
          </p>
        </div>

        <button
          type="button"
          onClick={onNewCollection}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Tạo bộ sưu tập mới
        </button>
      </div>

      {/* 2. COLLECTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(collections || []).map(col => {
          const colWords = getCollectionWords(col.id);
          const personalCount = (personalWords || []).filter(w => w.collectionId === col.id).length;
          const bookmarkedCount = colWords.length - personalCount;
          const today = new Date().toISOString().split('T')[0];
          const dueCount = colWords.filter(w => w.state !== 'new' && w.nextReviewAt <= today).length;

          return (
            <div
              key={col.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-blue-500/60 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-3xl p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-xs">
                    {col.icon || '📚'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {dueCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {dueCount} đến hạn ôn
                      </span>
                    )}

                    {collections.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Bạn có chắc muốn xóa bộ sưu tập "${col.title}"?`)) {
                            onDeleteCollection(col.id);
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition"
                        title="Xóa bộ sưu tập"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 transition">
                    {col.title}
                  </h4>
                  {col.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                </div>

                {/* Badges: personal words vs bookmarked 3000 words */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {personalCount} từ cá nhân
                  </span>
                  {bookmarkedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      +{bookmarkedCount} từ 3000
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenCollection(col.id)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Xem danh sách
                </button>

                {colWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onStartStudyCollection(colWords)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1 cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" /> Học ngay ({colWords.length})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
