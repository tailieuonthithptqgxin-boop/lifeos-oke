import React, { useState } from 'react';
import { X, Bookmark, Plus, Check, Layers } from 'lucide-react';
import { VocabCollection } from '../../lib/vocabEngine';

interface AddToCollectionModalProps {
  wordIds: string[];
  wordsCount: number;
  collections: VocabCollection[];
  onClose: () => void;
  onSaveBookmark: (collectionId: string) => void;
  onOpenNewCollection: () => void;
}

export function AddToCollectionModal({
  wordIds,
  wordsCount,
  collections,
  onClose,
  onSaveBookmark,
  onOpenNewCollection
}: AddToCollectionModalProps) {
  const [selectedColId, setSelectedColId] = useState<string>(collections[0]?.id || '');

  const handleConfirm = () => {
    if (!selectedColId) return;
    onSaveBookmark(selectedColId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-blue-600" />
            Lưu vào Bộ sưu tập cá nhân
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Bạn đang thêm <strong>{wordsCount} từ</strong> vào bộ sưu tập cá nhân theo dạng liên kết tham chiếu (không tạo bản ghi trùng lặp dữ liệu):
          </p>

          {collections.length === 0 ? (
            <div className="text-center py-6 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">Bạn chưa có bộ sưu tập nào.</p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewCollection();
                }}
                className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                + Tạo bộ sưu tập đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {collections.map(col => (
                <div
                  key={col.id}
                  onClick={() => setSelectedColId(col.id)}
                  className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                    selectedColId === col.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl p-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs">
                      {col.icon || '📚'}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                        {col.title}
                      </h4>
                      {col.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          {col.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedColId === col.id && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenNewCollection();
              }}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Tạo bộ sưu tập mới
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedColId || collections.length === 0}
            className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            Xác nhận thêm
          </button>
        </div>
      </div>
    </div>
  );
}
