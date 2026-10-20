import React, { ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends (React.Component as any) {
  public props: Props;
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };
  public setState: any;

  constructor(props: Props) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('💥 [ErrorBoundary Caught Render Crash]:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full min-h-[420px] flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Warning Shield Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {this.props.fallbackTitle || 'Đã xảy ra sự cố hiển thị'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Phân hệ này vừa gặp lỗi bất ngờ trong quá trình hiển thị. Dữ liệu của bạn trong cơ sở dữ liệu vẫn an toàn và không bị ảnh hưởng.
              </p>
            </div>

            {/* Error Message Details */}
            {this.state.error && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-xl text-left">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 break-words line-clamp-3">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            {/* Interactive Recovery Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử tải lại phân hệ</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Về trang chủ</span>
              </button>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Nếu lỗi vẫn tiếp tục lặp lại, hãy tải lại trình duyệt (F5) hoặc liên hệ Quản trị viên để được hỗ trợ.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
