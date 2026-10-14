import React, { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DebtModalProps {
  debt: any;
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete?: (id: string) => void;
}

export function DebtModal({ debt, onClose, onSave, onDelete }: DebtModalProps) {
  const [formData, setFormData] = useState<any>({
    title: debt?.title || debt?.name || '',
    person: debt?.person || debt?.counterpart || '',
    amount: debt?.amount !== undefined ? debt.amount : 0,
    type: debt?.type || 'Cho vay',
    dueDate: debt?.dueDate || '',
    status: debt?.status || 'Chưa trả'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-backdrop-fade">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-modal-enter">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center shrink-0">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {debt ? 'Edit Debt / Loan' : 'New Debt / Loan'}
          </h3>
          <div className="flex items-center gap-1">
            {debt && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(debt.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg btn-squishy cursor-pointer"
                title="Delete this record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg btn-squishy cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
              <select 
                value={formData.type} 
                onChange={e=>setFormData({...formData, type: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Cho vay">Lent (Others owe me)</option>
                <option value="Đi vay">Borrowed (I owe others)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select 
                value={formData.status} 
                onChange={e=>setFormData({...formData, status: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
              >
                <option value="Chưa trả">Pending</option>
                <option value="Đã trả">Settled</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description / Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e=>setFormData({...formData, title: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
              placeholder="e.g. Tuition loan, Dinner bill split..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Counterpart</label>
              <input 
                type="text" 
                value={formData.person} 
                onChange={e=>setFormData({...formData, person: e.target.value})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
                placeholder="e.g. John Doe..."
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Amount (VND)</label>
              <input 
                type="number" 
                value={formData.amount} 
                onChange={e=>setFormData({...formData, amount: Math.max(0, Number(e.target.value))})} 
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Due Date</label>
            <input 
              type="date" 
              value={formData.dueDate} 
              onChange={e=>setFormData({...formData, dueDate: e.target.value})} 
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white" 
            />
          </div>
        </div>
        <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl btn-squishy cursor-pointer">Cancel</button>
          <button 
            type="button" 
            onClick={() => {
              if (!formData.title.trim()) return;
              onSave(formData);
            }} 
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl btn-squishy cursor-pointer shadow-md shadow-emerald-500/20"
          >
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
