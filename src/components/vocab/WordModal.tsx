import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';
import { LearningLanguage, VocabCollection, VocabWord } from '../../lib/vocabEngine';

interface WordModalProps {
  activeLang: LearningLanguage;
  collections: VocabCollection[];
  editingWord: VocabWord | null;
  onClose: () => void;
  onSave: (wordData: Partial<VocabWord>) => void;
}

export const WordModal: React.FC<WordModalProps> = ({
  activeLang,
  collections,
  editingWord,
  onClose,
  onSave
}) => {
  const [term, setTerm] = useState(editingWord?.term || '');
  const [phonetic, setPhonetic] = useState(editingWord?.phonetic || '');
  const [partOfSpeech, setPartOfSpeech] = useState(editingWord?.partOfSpeech || 'noun');
  const [meaning, setMeaning] = useState(editingWord?.meaning || '');
  const [exampleSentence, setExampleSentence] = useState(editingWord?.exampleSentence || '');
  const [exampleTranslation, setExampleTranslation] = useState(editingWord?.exampleTranslation || '');
  const [collocations, setCollocations] = useState(editingWord?.collocations?.join(', ') || '');
  const [mnemonic, setMnemonic] = useState(editingWord?.mnemonic || '');
  const [notes, setNotes] = useState(editingWord?.notes || '');
  const [collectionId, setCollectionId] = useState(editingWord?.collectionId || collections[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !meaning.trim()) {
      return alert('Vui lòng nhập Từ vựng và Định nghĩa nghĩa chính!');
    }

    onSave({
      term: term.trim(),
      phonetic: phonetic.trim(),
      partOfSpeech,
      meaning: meaning.trim(),
      exampleSentence: exampleSentence.trim(),
      exampleTranslation: exampleTranslation.trim(),
      collocations: collocations.split(',').map(s => s.trim()).filter(Boolean),
      mnemonic: mnemonic.trim(),
      notes: notes.trim(),
      collectionId
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {editingWord ? 'Chỉnh sửa từ vựng cá nhân' : `Thêm từ vựng mới (${activeLang.name})`}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Từ hoặc Cụm từ *
              </label>
              <input
                type="text"
                value={term}
                onChange={e => setTerm(e.target.value)}
                placeholder="Ví dụ: Resilient, take action..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-sm"
                autoFocus
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phiên âm (IPA)
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={e => setPhonetic(e.target.value)}
                placeholder="/rɪˈzɪl.jənt/"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Từ loại (Part of Speech)
              </label>
              <select
                value={partOfSpeech}
                onChange={e => setPartOfSpeech(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="noun">Danh từ (n.)</option>
                <option value="verb">Động từ (v.)</option>
                <option value="adjective">Tính từ (adj.)</option>
                <option value="adverb">Trạng từ (adv.)</option>
                <option value="prep.">Giới từ (prep.)</option>
                <option value="conj.">Liên từ (conj.)</option>
                <option value="phrase">Cụm từ / Thành ngữ</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Bộ sưu tập cá nhân
              </label>
              <select
                value={collectionId}
                onChange={e => setCollectionId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                {collections.map(col => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nghĩa tiếng Việt *
            </label>
            <textarea
              rows={2}
              value={meaning}
              onChange={e => setMeaning(e.target.value)}
              placeholder="Giải thích nghĩa rõ ràng, tự nhiên..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Câu ví dụ ngữ cảnh
            </label>
            <input
              type="text"
              value={exampleSentence}
              onChange={e => setExampleSentence(e.target.value)}
              placeholder="She remained resilient in difficult times..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dịch nghĩa câu ví dụ
            </label>
            <input
              type="text"
              value={exampleTranslation}
              onChange={e => setExampleTranslation(e.target.value)}
              placeholder="Bản dịch tiếng Việt của câu ví dụ..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Cụm từ hay gặp (Collocations)
              </label>
              <input
                type="text"
                value={collocations}
                onChange={e => setCollocations(e.target.value)}
                placeholder="phân cách bởi dấu phẩy"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mẹo nhớ (Mnemonic)
              </label>
              <input
                type="text"
                value={mnemonic}
                onChange={e => setMnemonic(e.target.value)}
                placeholder="Mẹo nhớ gợi ý..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú cá nhân & Ngữ cảnh đã gặp
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Gặp trong đề thi thử hoặc sách..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
            >
              {editingWord ? 'Cập nhật từ vựng' : 'Lưu vào kho từ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
