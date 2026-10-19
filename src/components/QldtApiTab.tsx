import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Button, Card, Checkbox, Empty, Flex, Popconfirm, Progress, Space, Switch, Table, Tag, Typography
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  CloudDownloadOutlined, DeleteOutlined, DownloadOutlined, ExportOutlined, ReloadOutlined, StopOutlined
} from '@ant-design/icons';
import { STORAGE_KEYS } from '~/src/core/constants';
import { useToast } from '~/src/core/ToastContext';
import { logger } from '~/src/core/logger';
import {
  ApiSummary, buildExport, clearApiRecords, getAllApiRecords, getAllApiWrites, summarizeRecords
} from '~/src/services/qldt/apiStore';
import type { CrawlProgress } from '~/src/services/qldt/apiCrawler';
import { useServices } from '~/src/services/ServicesContext';
import { localStore } from '~/src/infra/storage';

const { Text } = Typography;
const LOG_MODULE = 'QLDT_API';
const POLL_MS = 5000;

const fmtTime = (iso: string) => (iso ? new Date(iso).toLocaleString('vi-VN') : '—');

/**
 * Thu thập API QLĐT: ghi lại khi duyệt web QLĐT + quét chủ động, lưu trong extension và xuất 1 file JSON nhóm theo API.
 */
export const QldtApiTab: React.FC = () => {
  const { showToast } = useToast();
  const { crawler } = useServices().qldt;
  const [recording, setRecording] = useState(false);
  const [summary, setSummary] = useState<ApiSummary[]>([]);
  const [sizeMb, setSizeMb] = useState(0);
  const [loadingList, setLoadingList] = useState(false);
  const [includeSubmissions, setIncludeSubmissions] = useState(true);
  const [crawl, setCrawl] = useState<CrawlProgress | null>(null);
  const [exporting, setExporting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = async () => {
    setLoadingList(true);
    try {
      const [records, writes] = await Promise.all([getAllApiRecords(), getAllApiWrites()]);
      setSummary(summarizeRecords(records, writes));
      setSizeMb(new Blob([JSON.stringify(records.map(r => r.response))]).size / 1024 / 1024);
    } catch (e: any) {
      logger.error(LOG_MODULE, 'Không đọc được kho API.', e.message);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    localStore.get(STORAGE_KEYS.qldtApiRecording).then(v => setRecording(!!v));
    refresh();
  }, []);

  // Đang ghi → cập nhật danh sách định kỳ để thấy API mới khi duyệt QLĐT
  useEffect(() => {
    if (!recording) return;
    const id = setInterval(refresh, POLL_MS);
    return () => { clearInterval(id); };
  }, [recording]);

  const toggleRecording = (on: boolean) => {
    setRecording(on);
    localStore.set({ [STORAGE_KEYS.qldtApiRecording]: on });
    showToast(on ? 'Đã bật ghi API — mở / tải lại trang QLĐT để bắt đầu ghi.' : 'Đã tắt ghi API.', 'info');
  };

  const handleCrawl = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setCrawl({ done: 0, total: 0, errors: 0, current: 'Đang bắt đầu…' });
    let lastRefresh = 0;
    try {
      const result = await crawler.crawl({
        includeSubmissions,
        signal: controller.signal,
        onProgress: (p) => {
          setCrawl(p);
          if (p.done - lastRefresh >= 100) { lastRefresh = p.done; refresh(); }
        }
      });
      if (result.authError) showToast(result.authError, 'error');
      else showToast(`${result.stopped ? 'Đã dừng. ' : 'Quét xong. '}${result.done} request${result.errors ? `, ${result.errors} lỗi` : ''}.`, result.errors ? 'warning' : 'success');
      logger.success(LOG_MODULE, `Quét QLĐT: ${result.done} request, ${result.errors} lỗi.`);
    } catch (e: any) {
      showToast('Không quét được: ' + e.message, 'error');
    } finally {
      abortRef.current = null;
      setCrawl(null);
      refresh();
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const [records, writes] = await Promise.all([getAllApiRecords(), getAllApiWrites()]);
      if (!records.length && !writes.length) { showToast('Chưa có dữ liệu API nào để xuất.', 'warning'); return; }
      const blob = new Blob([JSON.stringify(buildExport(records, writes), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      a.href = URL.createObjectURL(blob);
      a.download = `qldt-api-${stamp}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      showToast(`Đã xuất ${records.length} response GET + ${writes.length} request ghi (${summarizeRecords(records, writes).length} API).`, 'success');
    } catch (e: any) {
      showToast('Không xuất được: ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleClear = async () => {
    await clearApiRecords();
    await refresh();
    showToast('Đã xoá toàn bộ dữ liệu API đã lưu.', 'success');
  };

  const totalUrls = summary.reduce((n, s) => n + s.urls, 0);
  const columns: TableColumnsType<ApiSummary> = [
    {
      title: 'API', key: 'api', ellipsis: true,
      render: (_, s) => (
        <Flex vertical style={{ minWidth: 0 }}>
          <Text code ellipsis={{ tooltip: s.sampleUrl }} style={{ fontSize: 12 }}>{s.api}</Text>
          {s.queryKeys.length > 0 && <Text type="secondary" style={{ fontSize: 12 }} ellipsis>?{s.queryKeys.join('&')}</Text>}
        </Flex>
      )
    },
    { title: 'Số URL', dataIndex: 'urls', key: 'urls', width: 96, align: 'right', sorter: (a, b) => a.urls - b.urls },
    {
      title: 'Nguồn', key: 'sources', width: 120,
      render: (_, s) => (
        <Space size={4} wrap>
          {s.sources.includes('recorded') && <Tag color="blue" style={{ margin: 0 }}>Ghi lại</Tag>}
          {s.sources.includes('crawled') && <Tag color="purple" style={{ margin: 0 }}>Quét</Tag>}
          {s.sources.includes('write') && <Tag color="volcano" style={{ margin: 0 }}>Ghi dữ liệu</Tag>}
        </Space>
      )
    },
    { title: 'Lần cuối', key: 'lastAt', width: 150, render: (_, s) => <Text type="secondary" style={{ fontSize: 12 }}>{fmtTime(s.lastAt)}</Text> }
  ];

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'auto' }}>
      <Alert
        type="warning"
        showIcon
        title="Dữ liệu thu thập là dữ liệu gốc của QLĐT, gồm thông tin cá nhân sinh viên (SĐT, email, ngày sinh, CCCD, địa chỉ…)."
        description="Chỉ lưu trên máy này. Bảo quản file JSON cẩn thận, không chia sẻ, không đưa lên git. Extension không tự gửi request ghi / sửa / xoá nào lên QLĐT — chỉ ghi lại request do chính bạn thao tác trên trang QLĐT."
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 12 }}>
        {/* 1. Ghi lại khi duyệt */}
        <Card size="small" title="Ghi lại khi duyệt QLĐT" extra={<Switch checked={recording} onChange={toggleRecording} />}>
          <Flex vertical gap={8}>
            <Text type="secondary">
              Bật lên rồi dùng QLĐT bình thường: mọi request trang gọi tới API đều được lưu — GET kèm response, và các request ghi
              (POST / PUT / PATCH / DELETE, vd lưu ca chăm sóc) kèm body đã gửi + response. Extension chỉ quan sát, không tự gửi;
              bỏ qua đăng nhập / mật khẩu, không lưu token.
              Trang đang mở cần tải lại sau khi bật.
            </Text>
            <Flex gap={8} align="center">
              {recording ? <Tag color="red" style={{ margin: 0 }}>● Đang ghi</Tag> : <Tag style={{ margin: 0 }}>Đang tắt</Tag>}
              <Button size="small" icon={<ExportOutlined />} onClick={() => chrome.tabs.create({ url: 'https://qldt.rikkei.edu.vn/' })}>
                Mở QLĐT
              </Button>
            </Flex>
          </Flex>
        </Card>

        {/* 2. Quét chủ động */}
        <Card size="small" title="Quét chủ động tất cả lớp & môn">
          <Flex vertical gap={8}>
            <Text type="secondary">
              Tự gọi mọi API đã biết: tài khoản, lớp, chi tiết lớp, dashboard lớp × môn, buổi học, đề từng buổi, tiến độ BTVN theo buổi.
            </Text>
            <Checkbox checked={includeSubmissions} disabled={!!crawl} onChange={(e) => setIncludeSubmissions(e.target.checked)}>
              Gồm bài nộp từng sinh viên (nhiều request, lâu hơn)
            </Checkbox>
            {crawl ? (
              <>
                <Progress
                  percent={crawl.total ? Math.round((crawl.done / crawl.total) * 100) : 0}
                  status="active"
                  format={() => `${crawl.done}/${crawl.total}`}
                />
                <Text type="secondary" ellipsis={{ tooltip: crawl.current }}>
                  {crawl.current}{crawl.errors ? <Text type="danger"> · {crawl.errors} lỗi</Text> : null}
                </Text>
                <Button danger icon={<StopOutlined />} onClick={() => abortRef.current?.abort()}>Dừng</Button>
              </>
            ) : (
              <Button type="primary" icon={<CloudDownloadOutlined />} onClick={handleCrawl}>Quét tất cả lớp & môn</Button>
            )}
          </Flex>
        </Card>
      </div>

      {/* 3. Dữ liệu đã lưu + xuất JSON */}
      <Card
        size="small"
        title={`Dữ liệu đã lưu · ${summary.length} API · ${totalUrls} response · ~${sizeMb.toFixed(1)} MB`}
        extra={
          <Space size={8}>
            <Button size="small" icon={<ReloadOutlined />} loading={loadingList} onClick={refresh}>Tải lại</Button>
            <Popconfirm title="Xoá toàn bộ dữ liệu API đã lưu?" okText="Xoá" okButtonProps={{ danger: true }} cancelText="Huỷ" onConfirm={handleClear}>
              <Button size="small" danger icon={<DeleteOutlined />} disabled={!summary.length || !!crawl}>Xoá</Button>
            </Popconfirm>
            <Button size="small" type="primary" icon={<DownloadOutlined />} loading={exporting} disabled={!summary.length} onClick={handleExport}>
              Xuất JSON
            </Button>
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<ApiSummary>
          size="small"
          rowKey="api"
          pagination={false}
          dataSource={summary}
          columns={columns}
          loading={loadingList && !summary.length}
          locale={{ emptyText: <Empty description="Chưa có dữ liệu. Bật ghi lại rồi duyệt QLĐT, hoặc bấm Quét tất cả lớp & môn." /> }}
        />
      </Card>
    </Flex>
  );
};
