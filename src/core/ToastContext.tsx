import React, { createContext, useContext, useState, useEffect } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info', 
    duration = 3000
  ) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  // Attach to window for backwards compatibility if needed
  useEffect(() => {
    (window as any).showToast = showToast;
    return () => {
      delete (window as any).showToast;
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-12 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[280px]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-2 p-3 rounded-lg shadow-md border text-xs font-semibold animate-fade-in bg-white ${
              toast.type === 'success' ? 'border-green-200 text-green-800 bg-green-50' :
              toast.type === 'error' ? 'border-red-200 text-red-800 bg-red-50' :
              toast.type === 'warning' ? 'border-yellow-200 text-yellow-800 bg-yellow-50' :
              'border-slate-200 text-slate-800 bg-slate-50'
            }`}
          >
            <span className="text-sm">
              {toast.type === 'success' ? '✅' :
               toast.type === 'error' ? '❌' :
               toast.type === 'warning' ? '⚠️' : 'ℹ️'}
            </span>
            <span className="flex-1 leading-normal">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-slate-400 hover:text-slate-600 font-bold px-1 text-sm"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
export default ToastContext;
