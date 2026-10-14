import React, { useState, useMemo } from 'react';
import { 
  Layers, Plus, Brain, Bookmark, BookOpen, ChevronRight, 
  Trash2, Edit3, Tag, Copy, Search, Play, Sparkles
} from 'lucide-react';
import { 
  VocabCollection, 
  VocabWord, 
  UserWordProgress,
  System3000Word,
  systemWordToVocabWord 
} from '../../lib/vocabEngine';
import { useAppStore } from '../../lib/store';

interface MyCollectionsTabProps {
  collections: VocabCollection[];
  personalWords: VocabWord[];
  systemWords: System3000Word[];
  progressMap: Record<string, UserWordProgress>;
  onNewCollection: () => void;
  onOpenCollection: (colId: string) => void;
  onStartStudyCollection: (words: VocabWord[]) => void;
  onDeleteCollection: (colId: string) => void;
  onDuplicateCollection?: (colId: string) => void;
}

export function MyCollectionsTab({
  collections = [],
  personalWords = [],
  systemWords = [],
  progressMap = {},
  onNewCollection,
  onOpenCollection,
  onStartStudyCollection,
  onDeleteCollection,
  onDuplicateCollection
}: MyCollectionsTabProps) {
  const { language } = useAppStore();
  const isVi = language === 'vi';

  const [searchFilter, setSearchFilter] = useState('');

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

  const filteredCollections = useMemo(() => {
    if (!searchFilter.trim()) return collections;
    const q = searchFilter.trim().toLowerCase();
    return collections.filter(c => 
      c.title.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [collections, searchFilter]);

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg">
            {isVi ? `Bộ sưu tập của tôi (${(collections || []).length})` : `My Vocabulary Sets (${(collections || []).length})`}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {isVi 
              ? 'Tổ chức từ vựng theo giáo trình, môn học, kỳ thi hoặc chủ đề bạn quan tâm.' 
              : 'Organize vocabulary by topic, exam prep, or custom interests.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {collections.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder={isVi ? 'Tìm bộ từ...' : 'Filter sets...'}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onNewCollection}
            className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isVi ? 'Tạo bộ sưu tập mới' : 'Create New Set'}</span>
          </button>
        </div>
      </div>

      {/* 2. COLLECTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCollections.map(col => {
          const colWords = getCollectionWords(col.id);
          const personalCount = (personalWords || []).filter(w => w.collectionId === col.id).length;
          const bookmarkedCount = colWords.length - personalCount;
          const today = new Date().toISOString().split('T')[0];
          const dueCount = colWords.filter(w => w.state !== 'new' && w.nextReviewAt <= today).length;

          return (
            <div
              key={col.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-purple-500/60 transition flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-3xl p-2.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 shadow-xs">
                    {col.icon || '📚'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {dueCount > 0 && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                        {dueCount} {isVi ? 'đến hạn ôn' : 'due'}
                      </span>
                    )}

                    {onDuplicateCollection && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateCollection(col.id);
                        }}
                        className="p-1 text-slate-300 hover:text-purple-600 rounded-lg transition"
                        title={isVi ? 'Nhân bản bộ sưu tập' : 'Duplicate set'}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {collections.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const msg = isVi 
                            ? `Bạn có chắc muốn xóa bộ sưu tập "${col.title}"?` 
                            : `Delete collection "${col.title}"?`;
                          if (confirm(msg)) {
                            onDeleteCollection(col.id);
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition"
                        title={isVi ? 'Xóa bộ sưu tập' : 'Delete set'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-purple-600 transition">
                    {col.title}
                  </h4>
                  {col.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {col.description}
                    </p>
                  )}
                </div>

                {/* Badges: personal words vs bookmarked system words */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {personalCount} {isVi ? 'từ cá nhân' : 'personal words'}
                  </span>
                  {bookmarkedCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      +{bookmarkedCount} {isVi ? 'từ tra cứu' : 'system words'}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenCollection(col.id)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-purple-600 flex items-center gap-1 transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Xem danh sách' : 'View Words'}</span>
                </button>

                {colWords.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onStartStudyCollection(colWords)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isVi ? `Học ngay (${colWords.length})` : `Learn (${colWords.length})`}</span>
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
