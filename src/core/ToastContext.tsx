import React, { createContext, useContext, useEffect } from 'react';
import { App } from 'antd';

interface ToastContextType {
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { message } = App.useApp();

  const showToast = (
    msg: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info', 
    duration = 3000
  ) => {
    // duration in Antd message is in seconds
    message[type]({ content: msg, duration: duration / 1000 });
  };

  // Attach to window for backwards compatibility if needed
  useEffect(() => {
    (window as any).showToast = showToast;
    return () => {
      delete (window as any).showToast;
    };
  }, [message]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
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
