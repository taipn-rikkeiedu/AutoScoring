import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '~/src/core/constants';
import { safeNavigate } from '~/src/core/utils';
import { PinIcon } from '~/src/components/Icons';

interface Shortcut {
  id: string;
  name: string;
  url: string;
  isPinned?: boolean;
}

export const QuickAccessBar: React.FC = () => {
  const [pinnedShortcuts, setPinnedShortcuts] = useState<Shortcut[]>([]);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEYS.customShortcuts, (res) => {
      const list = (res[STORAGE_KEYS.customShortcuts] as Shortcut[]) || [];
      setPinnedShortcuts(list.filter((s) => s.isPinned));
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[STORAGE_KEYS.customShortcuts]) {
        const list = (changes[STORAGE_KEYS.customShortcuts].newValue as Shortcut[]) || [];
        setPinnedShortcuts(list.filter((s) => s.isPinned));
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleNavigate = (targetUrl: string) => {
    safeNavigate(targetUrl);
  };

  if (pinnedShortcuts.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 pt-2 mt-1.5 border-t border-slate-100 overflow-x-auto scrollbar-none select-none">
      <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
        <PinIcon className="w-3 h-3 text-slate-400" />
        <span>Ghim:</span>
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
        {pinnedShortcuts.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.url)}
            title={`Mở: ${item.url}`}
            className="px-2 py-0.5 bg-sky-50 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 text-[10px] font-medium text-sky-800 rounded border border-sky-200 transition-colors whitespace-nowrap max-w-[130px] truncate cursor-pointer"
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
};
