import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  onConfirm,
  onCancel,
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in" 
        onClick={onCancel}
      >
        <div 
          className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col" 
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 flex flex-col gap-2">
            <h3 className={`font-bold text-base ${isDanger ? 'text-rose-600' : 'text-slate-800'}`}>
              {title}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {message}
            </p>
          </div>
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
            <button 
              onClick={onCancel}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => { onConfirm(); onCancel(); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer ${
                isDanger 
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-600/20' 
                  : 'bg-sky-600 hover:bg-sky-700 shadow-sm shadow-sky-600/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
