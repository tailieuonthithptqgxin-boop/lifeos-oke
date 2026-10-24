import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { LearningLanguage, VocabCollection, VocabWord, parseWordsFromCsv } from '../../lib/vocabEngine';

interface ImportExportModalProps {
  activeLang: LearningLanguage;
  collections: VocabCollection[];
  onClose: () => void;
  onImport: (words: VocabWord[]) => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  activeLang,
  collections,
  onClose,
  onImport
}) => {
  const [csvText, setCsvText] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState(collections[0]?.id || '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target?.result as string;
      if (text) setCsvText(text);
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    if (!csvText.trim()) return alert('Vui lòng dán nội dung CSV hoặc tải tệp lên!');
    const words = parseWordsFromCsv(csvText, activeLang.id, targetCollectionId);
    if (words.length === 0) {
      return alert('Không thể tìm thấy dòng từ vựng hợp lệ. Hãy kiểm tra định dạng CSV!');
    }
    onImport(words);
  };

  return (
    <div 
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Nhập danh sách từ vựng cá nhân từ CSV
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Chọn bộ sưu tập đích
            </label>
            <select
              value={targetCollectionId}
              onChange={e => setTargetCollectionId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
            >
              {collections.map(col => (
                <option key={col.id} value={col.id}>{col.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Tải lên tệp .csv (hoặc dán bên dưới)
            </label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nội dung CSV (Định dạng: Term, Phonetic, POS, Meaning...)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              placeholder={`"Term","Phonetic","PartOfSpeech","Meaning"\n"Resilient","/rɪˈzɪl.jənt/","adjective","Kiên cường, bền bỉ"\n"Serendipity","/ˌser.ənˈdɪp.ə.ti/","noun","Sự tình cờ may mắn"`}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
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
              type="button"
              onClick={handleProcessImport}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
            >
              Tiến hành Nhập dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
