import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Upload, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  FileText, 
  ExternalLink, 
  Folder, 
  Key, 
  Server, 
  Check, 
  Image as ImageIcon,
  HardDrive
} from 'lucide-react';
import { apiCall } from '../lib/apiClient';

interface R2FileItem {
  key: string;
  size: number;
  lastModified?: string;
  url: string;
}

interface R2Status {
  configured: boolean;
  accountId: string;
  bucketName: string;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  publicUrl: string;
}

export function CloudflareR2View() {
  const [status, setStatus] = useState<R2Status | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  
  // File List & Upload State
  const [files, setFiles] = useState<R2FileItem[]>([]);
  const [isLoadingFiles, setIsLoadingLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string; url?: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await apiCall('/api/r2/status');
      if (res && res.success) {
        setStatus(res.status);
        setTestResult(res.testResult);
      }
    } catch (err: any) {
      console.error('Failed to fetch R2 status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchFiles = async () => {
    setIsLoadingLoadingFiles(true);
    try {
      const res = await apiCall('/api/r2/files');
      if (res && res.success && Array.isArray(res.files)) {
        setFiles(res.files);
      }
    } catch (err) {
      console.error('Failed to fetch R2 files:', err);
    } finally {
      setIsLoadingLoadingFiles(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchFiles();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!status?.configured) {
      setUploadMessage({
        type: 'error',
        text: 'Cloudflare R2 chưa được cấu hình. Vui lòng thêm các biến R2 vào file .env hoặc Vercel Settings.'
      });
      return;
    }

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await apiCall('/api/r2/upload-base64', 'POST', {
            base64Data,
            fileName: file.name,
            mimeType: file.type,
            folder: 'uploads'
          });

          if (res && res.success) {
            setUploadMessage({
              type: 'success',
              text: `Tải lên tập tin "${file.name}" thành công!`,
              url: res.file?.url
            });
            await fetchFiles();
          } else {
            throw new Error(res?.message || 'Không thể tải file lên R2');
          }
        } catch (err: any) {
          setUploadMessage({
            type: 'error',
            text: err.message || 'Lỗi khi tải tập tin lên R2.'
          });
        } finally {
          setIsUploading(false);
        }
      };
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: err.message || 'Lỗi đọc tập tin.' });
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (key: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tập tin "${key}" khỏi R2 Bucket?`)) return;
    setDeletingKey(key);
    try {
      const res = await apiCall('/api/r2/file', 'DELETE', { key });
      if (res && res.success) {
        setFiles(prev => prev.filter(f => f.key !== key));
      }
    } catch (err: any) {
      alert(err.message || 'Không thể xóa tập tin');
    } finally {
      setDeletingKey(null);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans w-full min-w-0 max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-blue-500/10 border border-amber-200/60 dark:border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 w-full min-w-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500 text-white font-bold shrink-0 shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Lưu Trữ Tập Tin Cloudflare R2 (S3 Compatible)
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            Kết nối dịch vụ lưu trữ đám mây Cloudflare R2 để lưu ảnh đại diện, hóa đơn, chứng từ và file đính kèm với chi phí 0đ truyền tải (Zero Egress Fees).
          </p>
        </div>

        <button
          type="button"
          onClick={() => { fetchStatus(); fetchFiles(); }}
          disabled={isLoadingStatus}
          className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isLoadingStatus ? 'animate-spin' : ''}`} />
          <span>Kiểm tra kết nối</span>
        </button>
      </div>

      {/* Connection Overview & Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Server className="w-4 h-4 text-orange-500" />
              <span>Trạng thái kết nối R2 Storage</span>
            </h3>
            {status?.configured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã cấu hình
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5" /> Chưa kết nối
              </span>
            )}
          </div>

          {/* Test connection output alert */}
          {testResult && (
            <div className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-100'
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold block mb-0.5">
                  {testResult.success ? 'Kết nối thành công!' : 'Kết nối thất bại:'}
                </span>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Status Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">Account ID</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                {status?.accountId || 'Chưa cấu hình'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">R2 Bucket Name</span>
              <span className="font-mono font-bold text-orange-600 dark:text-orange-400 text-sm">
                {status?.bucketName || 'Chưa cấu hình'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">Access Keys (API)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {status?.hasAccessKey && status?.hasSecretKey ? '✅ Access Key & Secret Key hợp lệ' : '❌ Thiếu Access Key / Secret Key'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 font-medium block">Public URL / Custom Domain</span>
              <span className="font-mono text-slate-600 dark:text-slate-400 text-[11px] truncate block">
                {status?.publicUrl || 'Chưa có miền riêng'}
              </span>
            </div>
          </div>

          {/* Upload Test Box */}
          <div className="p-5 rounded-2xl bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-orange-500" />
                  <span>Tải tập tin thử nghiệm lên R2</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn ảnh hoặc tài liệu bất kỳ để tải trực tiếp lên Cloudflare R2 Bucket
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <label className={`w-full sm:w-auto px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isUploading ? 'opacity-50 cursor-wait' : ''
              }`}>
                <Upload className="w-4 h-4" />
                <span>{isUploading ? 'Đang tải lên...' : 'Chọn Tập Tin Tải Lên R2'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {uploadMessage && (
                <div className={`p-3 rounded-xl text-xs flex-1 border ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  <span>{uploadMessage.text}</span>
                  {uploadMessage.url && (
                    <div className="mt-1 flex items-center gap-2">
                      <a
                        href={uploadMessage.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-[11px] text-blue-600 underline truncate max-w-xs"
                      >
                        {uploadMessage.url}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(uploadMessage.url!, 'new_upload')}
                        className="p-1 rounded bg-white hover:bg-slate-100 text-slate-600 cursor-pointer shadow-2xs"
                      >
                        {copiedKey === 'new_upload' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Setup Guide Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs w-full min-w-0">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-blue-500" />
            <span>Hướng dẫn lấy thông tin R2</span>
          </h3>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <strong className="text-slate-900 dark:text-slate-200 block">1. Tạo R2 Bucket:</strong>
              <p>Truy cập Cloudflare Dashboard -&gt; R2 -&gt; Bấm <b>Create Bucket</b> (nhập tên ví dụ: <code>lifeos-uploads</code>).</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
              <strong className="text-slate-900 dark:text-slate-200 block">2. Tạo API Token:</strong>
              <p>Vào R2 -&gt; <b>Manage R2 API Tokens</b> -&gt; Bấm <b>Create API Token</b> với quyền <b>Object Read & Write</b>.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <strong className="text-slate-900 dark:text-slate-200 block">3. Khai báo biến môi trường:</strong>
              <p>Điền vào file <code>.env</code> hoặc Vercel Settings:</p>
              <pre className="p-2.5 bg-slate-900 text-slate-200 rounded-lg text-[10px] font-mono overflow-x-auto leading-tight">
{`R2_ACCOUNT_ID="account_id_cua_ban"
R2_ACCESS_KEY_ID="access_key_id"
R2_SECRET_ACCESS_KEY="secret_key"
R2_BUCKET_NAME="lifeos-uploads"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Bucket Files Manager Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 shadow-xs w-full min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span>Danh sách tập tin đã lưu trên R2 ({files.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Các tập tin phương tiện và chứng từ lưu trữ trực tiếp trên Cloudflare R2 Bucket
            </p>
          </div>

          <button
            type="button"
            onClick={fetchFiles}
            disabled={isLoadingFiles}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            title="Làm mới danh sách file"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {isLoadingFiles ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs font-medium">Đang tải danh sách tập tin từ R2 Bucket...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <Folder className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-xs font-medium">Chưa có tập tin nào trong R2 Bucket</p>
            <p className="text-[11px] text-slate-500">Hãy chọn nút tải lên ở trên để lưu tập tin đầu tiên.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Khóa Tập Tin (Key / Name)</th>
                  <th className="py-3 px-4">Kích Thước</th>
                  <th className="py-3 px-4">Liên Kết Trực Tiếp</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {files.map(file => (
                  <tr key={file.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate">{file.key}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {formatBytes(file.size)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-700 font-mono text-[11px] underline truncate max-w-xs flex items-center gap-1"
                        >
                          <span className="truncate">{file.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(file.url, file.key)}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Sao chép link"
                        >
                          {copiedKey === file.key ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteFile(file.key)}
                        disabled={deletingKey === file.key}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {deletingKey === file.key ? 'Đang xóa...' : 'Xóa'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
