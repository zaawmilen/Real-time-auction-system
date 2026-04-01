import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info' | 'bid';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  bid: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const ctx: ToastContextValue = {
    success: (t, m) => add('success', t, m),
    error: (t, m) => add('error', t, m),
    info: (t, m) => add('info', t, m),
    bid: (t, m) => add('bid', t, m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() =>
            setToasts(prev => prev.filter(t => t.id !== toast.id))
          } />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ',
    bid: '🔨',
  };

  const styles = {
    success: 'border-green-700 bg-green-900/40',
    error: 'border-red-700 bg-red-900/40',
    info: 'border-blue-700 bg-blue-900/40',
    bid: 'border-[#FF6B00]/60 bg-[#FF6B00]/10',
  };

  const iconStyles = {
    success: 'text-green-400 bg-green-900/60',
    error: 'text-red-400 bg-red-900/60',
    info: 'text-blue-400 bg-blue-900/60',
    bid: 'text-[#FF6B00] bg-[#FF6B00]/20',
  };

  return (
    <div
      onClick={onDismiss}
      className={clsx(
        'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm',
        'min-w-[280px] max-w-[360px] cursor-pointer shadow-2xl',
        'transition-all duration-300',
        styles[toast.type],
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <span className={clsx('w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5', iconStyles[toast.type])}>
        {icons[toast.type]}
      </span>
      <div className="min-w-0">
        <p className="text-white font-semibold text-sm">{toast.title}</p>
        {toast.message && <p className="text-[#aaa] text-xs mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
    </div>
  );
}
