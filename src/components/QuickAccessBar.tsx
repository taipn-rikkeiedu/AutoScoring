import React, { useState, useEffect } from 'react';

interface Shortcut {
  id: string;
  name: string;
  url: string;
  isPinned?: boolean;
}

export const QuickAccessBar: React.FC = () => {
  const [pinnedShortcuts, setPinnedShortcuts] = useState<Shortcut[]>([]);

  useEffect(() => {
    // Load shortcuts
    chrome.storage.local.get('customShortcuts', (res) => {
      const list = (res.customShortcuts as Shortcut[]) || [];
      setPinnedShortcuts(list.filter(s => s.isPinned));
    });

    // Listen for storage changes
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes.customShortcuts) {
        const list = (changes.customShortcuts.newValue as Shortcut[]) || [];
        setPinnedShortcuts(list.filter(s => s.isPinned));
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleNavigate = (targetUrl: string) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].id) {
        chrome.tabs.update(tabs[0].id, { url: targetUrl });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
  };

  if (pinnedShortcuts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 border-b border-slate-200 overflow-x-auto scrollbar-none select-none">
      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap flex items-center gap-0.5">
        📌 Lối tắt ghim:
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
        {pinnedShortcuts.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.url)}
            title={`Chuyển hướng đến: ${item.url}`}
            className="px-2 py-0.5 bg-white hover:bg-blue-600 hover:text-white text-[10px] font-bold text-slate-600 rounded border border-slate-200 hover:border-blue-600 transition-all duration-150 whitespace-nowrap max-w-[120px] truncate shadow-sm cursor-pointer"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
};
