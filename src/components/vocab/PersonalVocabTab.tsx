import React, { useState, useMemo } from 'react';
import { 
  Search, Plus, Upload, Download, Trash2, Edit3, 
  Volume2, Star, Filter, BookOpen, Layers, CheckCircle2, 
  Brain, Clock, AlertTriangle, Eye, ArrowUpDown, ChevronDown
} from 'lucide-react';
import { 
  VocabWord, 
  VocabCollection, 
  speakWord, 
  exportWordsToCsv, 
  exportWordsToJson 
} from '../../lib/vocabEngine';

interface PersonalVocabTabProps {
  words: VocabWord[];
  collections: VocabCollection[];
  selectedCollectionId: string;
  onSelectCollection: (colId: string) => void;
  onNewWord: () => void;
  onEditWord: (word: VocabWord) => void;
  onDeleteWord: (wordId: string) => void;
  onToggleFavorite: (wordId: string) => void;
  onOpenWordDetail: (word: VocabWord) => void;
  onOpenImport: () => void;
  onStartStudyPersonal: (words: VocabWord[]) => void;
  onNewCollection: () => void;
}

export function PersonalVocabTab({
  words,
  collections,
  selectedCollectionId,
  onSelectCollection,
  onNewWord,
  onEditWord,
  onDeleteWord,
  onToggleFavorite,
  onOpenWordDetail,
  onOpenImport,
  onStartStudyPersonal,
  onNewCollection
}: PersonalVocabTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'alphabet' | 'interval'>('newest');

  const today = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      // 1. Collection filter
      if (selectedCollectionId !== 'all') {
        if (w.collectionId !== selectedCollectionId) return false;
      }

      // 2. Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchesTerm = w.term.toLowerCase().includes(q);
        const matchesMeaning = w.meaning.toLowerCase().includes(q);
        if (!matchesTerm && !matchesMeaning) return false;
      }

      // 3. Favorites
      if (onlyFavorites && !w.isFavorite) return false;

      // 4. Status
      if (statusFilter !== 'all') {
        if (statusFilter === 'due') {
          if (w.state === 'new' || !w.nextReviewAt || w.nextReviewAt > today) return false;
        } else if (w.state !== statusFilter) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'alphabet') return a.term.localeCompare(b.term);
      if (sortBy === 'interval') return (b.intervalDays || 0) - (a.intervalDays || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [words, selectedCollectionId, search, onlyFavorites, statusFilter, sortBy, today]);

  // Export handlers
  const handleExportCsv = () => {
    const csv = exportWordsToCsv(filteredWords);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `personal_vocab_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJson = () => {
    const json = exportWordsToJson(filteredWords, 'Personal_Vocab');
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `personal_vocab_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. TOP HEADER & ACTIONS BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-white text-lg flex items-center gap-2">
            <span>Từ vựng cá nhân ({words.length})</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Không gian riêng để bạn lưu trữ, quản lý và củng cố các từ vựng tự nhập hoặc gặp trong thực tế.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onNewWord}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm từ mới
          </button>

          <button
            type="button"
            onClick={onOpenImport}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            title="Nhập danh sách từ từ tệp CSV"
          >
            <Upload className="w-4 h-4 text-blue-600" /> Nhập CSV
          </button>

          <div className="relative group">
            <button
              type="button"
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-600" /> Xuất dữ liệu
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:flex flex-col bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 min-w-[150px] z-20">
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Tải tệp CSV
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="px-4 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Tải tệp JSON
              </button>
            </div>
          </div>

          {filteredWords.length > 0 && (
            <button
              type="button"
              onClick={() => onStartStudyPersonal(filteredWords)}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Brain className="w-4 h-4" /> Học ngay ({filteredWords.length})
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROLS */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Tìm kiếm từ vựng hoặc nghĩa tiếng Việt..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Collection Filter */}
          <div>
            <select
              value={selectedCollectionId}
              onChange={e => onSelectCollection(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Tất cả bộ sưu tập ({words.length})</option>
              {collections.map(c => {
                const count = words.filter(w => w.collectionId === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.icon || '📚'} {c.title} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="new">🌱 Từ mới</option>
              <option value="learning">⚡ Đang học</option>
              <option value="mastered">✓ Đã thuộc</option>
              <option value="due">⏰ Cần ôn hôm nay</option>
              <option value="difficult">🔥 Hay quên</option>
            </select>
          </div>

        </div>

        {/* Quick Toggles: Favorites + Sort */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOnlyFavorites(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer ${
                onlyFavorites
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
              Chỉ từ yêu thích
            </button>

            <span className="text-slate-400">
              Hiển thị <strong>{filteredWords.length}</strong> từ
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
            >
              <option value="newest">Mới nhất</option>
              <option value="alphabet">A → Z</option>
              <option value="interval">Khoảng cách ôn cao nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. WORDS LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredWords.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
              Chưa có từ vựng cá nhân nào trong danh mục này
            </p>
            <p className="text-xs text-slate-400">
              Hãy bấm "Thêm từ mới" hoặc "Nhập CSV" để bắt đầu xây dựng kho từ riêng của bạn.
            </p>
            <button
              type="button"
              onClick={onNewWord}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
            >
              + Thêm từ vựng đầu tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredWords.map(word => {
              const col = collections.find(c => c.id === word.collectionId);
              return (
                <div
                  key={word.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition group"
                >
                  {/* Left: Term + Phonetic + Meaning + Example */}
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(word.id)}
                        className="text-slate-300 hover:text-amber-500 cursor-pointer"
                      >
                        <Star className={`w-4 h-4 ${word.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      <h4
                        onClick={() => onOpenWordDetail(word)}
                        className="font-bold text-slate-900 dark:text-white text-base hover:text-blue-600 cursor-pointer transition flex items-center gap-1.5"
                      >
                        {word.term}
                      </h4>

                      <button
                        type="button"
                        onClick={() => speakWord(word.term, 'en-US')}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition cursor-pointer"
                        title="Phát âm"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      {word.partOfSpeech && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                          {word.partOfSpeech}
                        </span>
                      )}

                      {col && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {col.icon || '📚'} {col.title}
                        </span>
                      )}
                    </div>

                    {word.phonetic && (
                      <p className="text-xs font-mono text-slate-400">
                        {word.phonetic}
                      </p>
                    )}

                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">
                      {word.meaning}
                    </p>

                    {(word.exampleSentence || word.mnemonic) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                        {word.exampleSentence ? `"${word.exampleSentence}"` : `💡 ${word.mnemonic}`}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => onOpenWordDetail(word)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onEditWord(word)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      title="Chỉnh sửa từ này"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Bạn có chắc muốn xóa từ "${word.term}" khỏi kho từ cá nhân?`)) {
                          onDeleteWord(word.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                      title="Xóa từ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
