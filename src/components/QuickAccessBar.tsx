import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS } from '~/src/core/constants';
import { safeNavigate } from '~/src/core/utils';
import { Button, Space, Typography } from 'antd';
import { PushpinOutlined } from '@ant-design/icons';

const { Text } = Typography;

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px', marginTop: '6px', borderTop: '1px solid #f0f0f0', overflowX: 'auto' }}>
      <Space size="small" style={{ whiteSpace: 'nowrap' }}>
        <PushpinOutlined style={{ color: '#bfbfbf' }} />
        <Text type="secondary" style={{ fontSize: '12px', fontWeight: 600 }}>Ghim:</Text>
      </Space>
      <Space size="small" style={{ flex: 1, overflowX: 'auto' }}>
        {pinnedShortcuts.map((item) => (
          <Button
            key={item.id}
            size="small"
            type="default"
            onClick={() => handleNavigate(item.url)}
            title={`Mở: ${item.url}`}
            style={{ fontSize: '12px', color: '#0958d9', borderColor: '#91caff', backgroundColor: '#e6f4ff', maxWidth: '130px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {item.name}
          </Button>
        ))}
      </Space>
    </div>
  );
};
