import React, { useState, useEffect } from 'react';
import { useToast } from '~/src/core/ToastContext';
import { STORAGE_KEYS } from '~/src/core/constants';
import { safeNavigate } from '~/src/core/utils';

export interface Shortcut {
  id: string;
  name: string;
  url: string;
  isPinned?: boolean;
}

export function useShortcuts() {
  const toast = useToast();
  
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTabInfo, setActiveTabInfo] = useState<{ title: string; url: string } | null>(null);

  const loadShortcuts = () => {
    chrome.storage.local.get(STORAGE_KEYS.customShortcuts, (res) => {
      if (res[STORAGE_KEYS.customShortcuts]) {
        setShortcuts(res[STORAGE_KEYS.customShortcuts] as Shortcut[]);
      } else {
        const defaults: Shortcut[] = [
          { id: '1', name: 'Lớp học mẫu (Trang chủ QLDT)', url: 'https://qldt.rikkei.edu.vn/', isPinned: true }
        ];
        chrome.storage.local.set({ [STORAGE_KEYS.customShortcuts]: defaults });
        setShortcuts(defaults);
      }
    });
  };

  const fetchActiveTabInfo = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        const tabUrl = tabs[0].url || '';
        const tabTitle = tabs[0].title || '';
        if (tabUrl.includes('rikkei.edu.vn') || tabUrl.startsWith('http')) {
          setActiveTabInfo({ title: tabTitle, url: tabUrl });
        }
      }
    });
  };

  useEffect(() => {
    loadShortcuts();
    fetchActiveTabInfo();
  }, []);

  const saveShortcutsToStorage = (updatedList: Shortcut[]) => {
    chrome.storage.local.set({ [STORAGE_KEYS.customShortcuts]: updatedList }, () => {
      setShortcuts(updatedList);
    });
  };

  const handleQuickAddActiveTab = () => {
    if (!activeTabInfo) {
      toast.showToast('Không lấy được thông tin tab hiện tại.', 'warning');
      return;
    }

    let cleanTitle = activeTabInfo.title;
    if (cleanTitle.includes('-')) cleanTitle = cleanTitle.split('-')[0].trim();
    if (cleanTitle.length > 30) cleanTitle = cleanTitle.substring(0, 27) + '...';

    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name: cleanTitle || 'Trang hiện tại',
      url: activeTabInfo.url,
      isPinned: false
    };

    const updated = [...shortcuts, newShortcut];
    saveShortcutsToStorage(updated);
    toast.showToast('Đã thêm nhanh trang hiện tại làm lối tắt!', 'success');
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.showToast('Vui lòng nhập tên lối tắt.', 'warning');
      return;
    }
    if (!url.trim() || !url.startsWith('http')) {
      toast.showToast('Vui lòng nhập URL hợp lệ.', 'warning');
      return;
    }

    if (editingId) {
      const updated = shortcuts.map(s => 
        s.id === editingId ? { ...s, name: name.trim(), url: url.trim() } : s
      );
      saveShortcutsToStorage(updated);
      setEditingId(null);
      toast.showToast('Đã cập nhật lối tắt!', 'success');
    } else {
      const newShortcut: Shortcut = {
        id: Date.now().toString(),
        name: name.trim(),
        url: url.trim(),
        isPinned: false
      };
      const updated = [...shortcuts, newShortcut];
      saveShortcutsToStorage(updated);
      toast.showToast('Đã thêm lối tắt mới!', 'success');
    }
    setName('');
    setUrl('');
  };

  const handleEdit = (item: Shortcut) => {
    setEditingId(item.id);
    setName(item.name);
    setUrl(item.url);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lối tắt này không?')) {
      const updated = shortcuts.filter(s => s.id !== id);
      saveShortcutsToStorage(updated);
      toast.showToast('Đã xóa lối tắt.', 'info');
      if (editingId === id) {
        setEditingId(null);
        setName('');
        setUrl('');
      }
    }
  };

  const handleTogglePin = (id: string) => {
    const updated = shortcuts.map(s => 
      s.id === id ? { ...s, isPinned: !s.isPinned } : s
    );
    saveShortcutsToStorage(updated);
  };

  const handleNavigate = (targetUrl: string) => {
    safeNavigate(targetUrl);
  };

  return {
    shortcuts,
    name,
    setName,
    url,
    setUrl,
    editingId,
    setEditingId,
    activeTabInfo,
    handleQuickAddActiveTab,
    handleAddOrUpdate,
    handleEdit,
    handleDelete,
    handleTogglePin,
    handleNavigate
  };
}
