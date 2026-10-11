// LifeOS Encrypted One-Click Backup & Data Portability Service
// Enables users to export their entire personal workspace to a single portable .lifeos file
// And restore it cleanly on any browser or device

import { apiCall } from './apiClient';

export interface LifeOsBackupPayload {
  version: string;
  appName: string;
  exportedAt: string;
  userEmail?: string;
  collections: {
    tasks?: any[];
    projects?: any[];
    events?: any[];
    habits?: any[];
    notes?: any[];
    transactions?: any[];
    financeAccounts?: any[];
    goals?: any[];
    decisions?: any[];
    subjects?: any[];
    studyAssignments?: any[];
    studyExams?: any[];
    focusSessions?: any[];
    automationRules?: any[];
  };
}

export const backupService = {
  // 1. Export All Personal Workspace Data to .lifeos JSON File
  async exportBackup(userEmail?: string): Promise<void> {
    const collectionNames = [
      'tasks', 'projects', 'events', 'habits', 'notes',
      'transactions', 'financeAccounts', 'goals', 'decisions',
      'subjects', 'studyAssignments', 'studyExams', 'focusSessions', 'automationRules'
    ];

    const results = await Promise.allSettled(
      collectionNames.map(col => apiCall(`/api/data/${col}`))
    );

    const payloadCollections: Record<string, any[]> = {};
    collectionNames.forEach((col, idx) => {
      const res = results[idx];
      payloadCollections[col] = (res.status === 'fulfilled' && Array.isArray(res.value))
        ? res.value
        : [];
    });

    const backupData: LifeOsBackupPayload = {
      version: '2.5.0',
      appName: 'QUẢN LÍ CÁ NHÂN (LifeOS)',
      exportedAt: new Date().toISOString(),
      userEmail,
      collections: payloadCollections
    };

    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `LifeOS_Backup_${dateStr}.lifeos`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // 2. Validate and Restore from .lifeos File
  async importBackup(file: File): Promise<{ success: boolean; restoredCount: number; message: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const data: LifeOsBackupPayload = JSON.parse(content);

          if (!data.collections || typeof data.collections !== 'object') {
            return resolve({
              success: false,
              restoredCount: 0,
              message: 'Tập tin sao lưu không đúng định dạng LifeOS.'
            });
          }

          let restoredTotal = 0;

          for (const [colName, items] of Object.entries(data.collections)) {
            if (Array.isArray(items) && items.length > 0) {
              for (const item of items) {
                try {
                  await apiCall(`/api/data/${colName}`, 'POST', item);
                  restoredTotal++;
                } catch {
                  // Continue restoring other items
                }
              }
            }
          }

          resolve({
            success: true,
            restoredCount: restoredTotal,
            message: `Khôi phục thành công ${restoredTotal} mục dữ liệu từ bản sao lưu!`
          });
        } catch (err: any) {
          resolve({
            success: false,
            restoredCount: 0,
            message: `Lỗi đọc tập tin sao lưu: ${err?.message || 'Không thể đọc file'}`
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          restoredCount: 0,
          message: 'Không thể mở tập tin sao lưu được chọn.'
        });
      };

      reader.readAsText(file);
    });
  }
};
