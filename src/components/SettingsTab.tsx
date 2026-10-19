import React, { useEffect } from 'react';
import { useSettings } from '~/src/hooks/settings/useSettings';
import { useServices } from '~/src/services/ServicesContext';
import { GRADER_IGNORE_DEFAULTS } from '~/src/core/constants';
import { Tabs, Card, Select, Input, Button, Switch, Space, Typography, Tag, Badge, Popconfirm } from 'antd';
import {
  SparklesIcon,
  DocumentTextIcon,
  ArchiveBoxIcon
} from '~/src/components/Icons';
import { EyeOutlined, EyeInvisibleOutlined, SyncOutlined, CheckOutlined, DeleteOutlined, DownloadOutlined, GoogleOutlined, ThunderboltOutlined, RocketOutlined, GlobalOutlined, LaptopOutlined, SettingOutlined, ApiOutlined } from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const defaultGraderIgnoreOptions = [...GRADER_IGNORE_DEFAULTS];

export const SettingsTab: React.FC = () => {
  const {
    aiProvider,
    aiApiKey,
    setAiApiKey,
    aiUrl,
    setAiUrl,
    aiModelName,
    setAiModelName,
    githubToken,
    setGithubToken,
    systemPrompt,
    setSystemPrompt,
    graderIgnoreItems,
    providerModels,
    isLoadingModels,
    refreshModels,
    aiReady,
    isTesting,
    isTestingAi,
    handleTestAiConnection,
    handleProviderChange,
    toggleIgnoreItem,
    handleSelectAllIgnore,
    handleDeselectAllIgnore,
    handleResetPrompt,
    systemLogs,
    loadSystemLogs,
    handleClearLogs,
    handleDownloadLogsZip,
    cacheCount,
    handleClearCodeCache,
    loadCacheStats,
    supabaseSyncEnabled,
    setSupabaseSyncEnabled,
    supabaseUrl,
    setSupabaseUrl,
    supabaseAnonKey,
    setSupabaseAnonKey,
    gradingScale,
    setGradingScale,
    strictnessLevel,
    setStrictnessLevel,
    supabasePat,
    setSupabasePat,
    dbInitialized,
    isMigrating,
    handleMigrateDatabase
  } = useSettings();
  const { ai } = useServices();
  const apiKeyUrl = ai.describe(aiProvider)?.apiKeyUrl;

  // Nạp nhật ký + thống kê cache 1 lần khi mở tab. Hai hàm được tạo mới mỗi lần render, nên KHÔNG đưa vào
  // danh sách phụ thuộc — trước đây làm effect chạy lại sau mỗi render → vòng lặp render vô hạn, đọc toàn bộ storage liên tục.
  useEffect(() => {
    loadSystemLogs();
    loadCacheStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aiTabContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 700, margin: '0 auto', display: 'flex' }}>
      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 12 }}>NHÀ CUNG CẤP AI (PROVIDER)</Text>
          <Tag color={aiReady ? 'success' : 'warning'}>{aiReady ? '🟢 Đã sẵn sàng' : '🟡 Cần bổ sung cấu hình'}</Tag>
        </div>
        <Select
          value={aiProvider}
          onChange={handleProviderChange}
          style={{ width: '100%', marginBottom: 12 }}
          options={[
            { value: 'gemini', label: <span><GoogleOutlined style={{ color: '#1677ff', marginRight: 8 }} />Google Gemini (GenAI API Direct)</span> },
            { value: 'openai', label: <span><ThunderboltOutlined style={{ color: '#52c41a', marginRight: 8 }} />OpenAI (GPT-4o, o1 Direct)</span> },
            { value: 'deepseek', label: <span><RocketOutlined style={{ color: '#722ed1', marginRight: 8 }} />DeepSeek (DeepSeek-V3 Direct)</span> },
            { value: 'groq', label: <span><ThunderboltOutlined style={{ color: '#f5222d', marginRight: 8 }} />Groq (Fast Llama, Mixtral)</span> },
            { value: 'grok', label: <span><ApiOutlined style={{ color: '#000000', marginRight: 8 }} />xAI Grok (Grok-2 Direct)</span> },
            { value: 'openrouter', label: <span><GlobalOutlined style={{ color: '#13c2c2', marginRight: 8 }} />OpenRouter (Multi-model Gateway)</span> },
            { value: 'local', label: <span><LaptopOutlined style={{ color: '#595959', marginRight: 8 }} />Ollama Local (Mô hình chạy cục bộ)</span> },
            { value: 'custom', label: <span><SettingOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />Custom OpenAI-Compatible Provider</span> }
          ]}
        />

        {aiProvider !== 'local' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block' }}>API KEY</Text>
              {apiKeyUrl && (
                <a href={apiKeyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#1677ff' }}>
                  Lấy API Key tại đây
                </a>
              )}
            </div>
            <Input.Password
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder="Nhập API Key của bạn..."
              iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
            />
          </div>
        )}

        {(aiProvider === 'custom' || aiProvider === 'local') && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>
              {aiProvider === 'local' ? "OLLAMA ENDPOINT URL" : "BASE URL (OPENAI-COMPATIBLE)"}
            </Text>
            <Input
              value={aiUrl}
              onChange={(e) => setAiUrl(e.target.value)}
              placeholder={aiProvider === 'local' ? "http://localhost:11434" : "https://api.example.com/v1"}
            />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block' }}>MÔ HÌNH AI (MODEL)</Text>
            <Button type="link" size="small" onClick={refreshModels} loading={isLoadingModels} icon={<SyncOutlined />} style={{ fontSize: 11, padding: 0 }}>
              Làm mới model
            </Button>
          </div>
          {providerModels && providerModels.length > 0 ? (
            <Select
              value={providerModels.some(m => m.value === aiModelName) ? aiModelName : "custom"}
              onChange={(val) => setAiModelName(val !== "custom" ? val : "")}
              style={{ width: '100%' }}
              options={[
                ...providerModels,
                { value: 'custom', label: 'Khác (Nhập model thủ công)...' }
              ]}
            />
          ) : null}

          {(!providerModels || providerModels.length === 0 || !providerModels.some(m => m.value === aiModelName)) && (
            <Input
              value={aiModelName}
              onChange={(e) => setAiModelName(e.target.value)}
              placeholder="Tên model (vd: gemini-2.5-flash, gpt-4o...)"
              style={{ marginTop: providerModels && providerModels.length > 0 ? 8 : 0 }}
            />
          )}
        </div>
      </Card>

      <Card size="small" style={{ borderRadius: 8 }}>
        <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>GITHUB PERSONAL ACCESS TOKEN (PAT)</Text>
        <Input.Password
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxx (chấm repository private & tăng limit API)"
          iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
        />
      </Card>

      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block' }}>ĐỒNG BỘ CLOUD (SUPABASE)</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Lưu điểm, ghi chú & đề bài lên Supabase của bạn</Text>
          </div>
          <Switch checked={supabaseSyncEnabled} onChange={setSupabaseSyncEnabled} />
        </div>

        {supabaseSyncEnabled && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>SUPABASE PROJECT URL</Text>
                <Input value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} placeholder="https://xxxx.supabase.co" />
              </div>
              <div style={{ flex: 1 }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>ANON PUBLIC KEY</Text>
                <Input.Password value={supabaseAnonKey} onChange={(e) => setSupabaseAnonKey(e.target.value)} placeholder="eyJhbGciOi..." iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)} />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>PERSONAL ACCESS TOKEN (TÙY CHỌN CHO ZERO SETUP)</Text>
              <Input.Password value={supabasePat} onChange={(e) => setSupabasePat(e.target.value)} placeholder="sbp_xxxxxxxxxxxx" iconRender={visible => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)} style={{ marginBottom: 8 }} />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', padding: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text strong style={{ fontSize: 12 }}>Trạng thái Cơ sở dữ liệu:</Text>
                  <Text style={{ fontSize: 11, color: dbInitialized === null ? '#faad14' : dbInitialized ? '#52c41a' : '#faad14', fontWeight: 600 }}>
                    {dbInitialized === null ? '⏳ Đang kiểm tra...' : dbInitialized ? '🟢 Đã khởi tạo bảng thành công' : '🟡 Chưa tạo bảng (hoặc lỗi kết nối)'}
                  </Text>
                </div>
                {/* Khởi tạo / khởi tạo lại: xoá vĩnh viễn bảng của chức năng đã bỏ → luôn hỏi xác nhận */}
                <Popconfirm
                  title="Khởi tạo cơ sở dữ liệu Supabase?"
                  description={
                    <div style={{ maxWidth: 320 }}>
                      Tạo / cập nhật bảng <b>monitor_templates</b> (mẫu giám sát dùng chung).
                      <br />
                      <Text type="danger">Xoá vĩnh viễn bảng exercises, submissions và care_notes</Text> (kho đề, kết quả chấm cũ, ghi chú chăm sóc cũ — nay chăm sóc học viên lưu thẳng trên QLĐT), kèm toàn bộ dữ liệu trong đó. Không hoàn tác được.
                    </div>
                  }
                  okText="Khởi tạo & xoá bảng cũ"
                  okButtonProps={{ danger: true }}
                  cancelText="Huỷ"
                  onConfirm={handleMigrateDatabase}
                  disabled={isMigrating}
                >
                  <Button size="small" loading={isMigrating} disabled={isMigrating}>
                    {isMigrating ? "Đang khởi tạo..." : dbInitialized ? "Khởi tạo lại" : "Khởi tạo DB"}
                  </Button>
                </Popconfirm>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#000', fontWeight: 'bold' }}
          icon={<SyncOutlined spin={isTestingAi} />}
          onClick={handleTestAiConnection}
          loading={isTestingAi}
        >
          {isTestingAi ? 'Đang kiểm tra...' : 'Kiểm tra kết nối AI'}
        </Button>
      </div>
    </Space>
  );

  const rulesTabContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 700, margin: '0 auto', display: 'flex' }}>
      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>THANG ĐIỂM CHẤM</Text>
            <Select
              value={gradingScale}
              onChange={(val) => setGradingScale(val)}
              style={{ width: '100%' }}
              options={[
                { value: '10', label: 'Thang 10 điểm (Mặc định)' },
                { value: '100', label: 'Thang 100 điểm' }
              ]}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>MỨC ĐỘ NGHIÊM KHẮC</Text>
            <Select
              value={strictnessLevel}
              onChange={(val) => setStrictnessLevel(val)}
              style={{ width: '100%' }}
              options={[
                { value: 'Dễ dãi, bỏ qua lỗi nhỏ', label: '🟢 Dễ dãi (Bỏ qua lỗi nhỏ)' },
                { value: 'Bình thường', label: '🟡 Bình thường (Tiêu chuẩn)' },
                { value: 'Rất khắt khe, trừ điểm nặng mọi lỗi nhỏ', label: '🔴 Khắt khe (Trừ điểm nặng)' }
              ]}
            />
          </div>
        </div>
      </Card>

      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block' }}>DANH SÁCH BỎ QUA (.GRADERIGNORE)</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Bấm vào thẻ để bật/tắt tệp và thư mục gửi cho AI</Text>
          </div>
          <Space size="small">
            <Text type="secondary" style={{ fontSize: 11 }}>{graderIgnoreItems.length}/{defaultGraderIgnoreOptions.length} đã chọn</Text>
            <Button type="link" size="small" onClick={handleSelectAllIgnore} style={{ fontSize: 11, padding: 0 }}>Chọn tất cả</Button>
            <Button type="link" size="small" onClick={handleDeselectAllIgnore} style={{ fontSize: 11, padding: 0, color: '#8c8c8c' }}>Bỏ chọn</Button>
          </Space>
        </div>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 8, backgroundColor: '#fafafa', border: '1px solid #f0f0f0', borderRadius: 8, maxHeight: 150, overflowY: 'auto' }}>
          {defaultGraderIgnoreOptions.map((item) => {
            const isChecked = graderIgnoreItems.includes(item);
            return (
              <Tag.CheckableTag
                key={item}
                checked={isChecked}
                onChange={() => toggleIgnoreItem(item)}
                style={{
                  border: '1px solid',
                  borderColor: isChecked ? '#91caff' : '#d9d9d9',
                  backgroundColor: isChecked ? '#1677ff' : '#fff',
                  color: isChecked ? '#fff' : '#595959',
                  padding: '4px 8px',
                  borderRadius: 6,
                  margin: 0
                }}
              >
                {isChecked && <CheckOutlined style={{ marginRight: 4 }} />}
                {item}
              </Tag.CheckableTag>
            );
          })}
        </div>
      </Card>

      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block' }}>MẪU CÂU LỆNH (SYSTEM PROMPT)</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Tùy chỉnh hướng dẫn chấm bài cho AI</Text>
          </div>
          <Popconfirm title="Khôi phục System Prompt?" description="Bạn có chắc chắn muốn khôi phục về mặc định không?" onConfirm={handleResetPrompt} okText="Đồng ý" cancelText="Hủy">
            <Button type="link" size="small" style={{ fontSize: 11, padding: 0 }}>Khôi phục mặc định</Button>
          </Popconfirm>
        </div>
        <TextArea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="Nhập prompt tùy chỉnh cho AI..."
          autoSize={{ minRows: 6, maxRows: 12 }}
          style={{ fontSize: 12, fontFamily: 'monospace' }}
        />
      </Card>
    </Space>
  );

  const logsTabContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%', maxWidth: 700, margin: '0 auto', display: 'flex' }}>
      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block' }}>Bộ nhớ đệm mã nguồn (Cache)</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>Đã lưu trữ: <Text strong style={{ color: '#1677ff' }}>{cacheCount} repositories</Text> (Tự động xóa sau 24h)</Text>
          </div>
          <Popconfirm title="Xóa Cache?" description="Bạn có chắc chắn muốn xóa toàn bộ bộ nhớ đệm mã nguồn không?" onConfirm={handleClearCodeCache} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
            <Button danger icon={<DeleteOutlined />}>Xóa Cache</Button>
          </Popconfirm>
        </div>
      </Card>

      <Card size="small" style={{ borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Space>
            <Text strong style={{ fontSize: 12 }}>Nhật ký hoạt động</Text>
            <Badge count={`${systemLogs.length} dòng`} style={{ backgroundColor: '#f0f0f0', color: '#595959', fontSize: 10 }} />
          </Space>
          <Space size="small">
            <Button type="link" size="small" icon={<DownloadOutlined />} onClick={handleDownloadLogsZip} style={{ fontSize: 11, padding: 0 }}>Tải ZIP</Button>
            <Text type="secondary" style={{ fontSize: 11 }}>|</Text>
            <Popconfirm title="Xóa nhật ký?" description="Bạn có chắc chắn muốn xóa toàn bộ nhật ký hệ thống không?" onConfirm={handleClearLogs} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
              <Button type="link" danger size="small" style={{ fontSize: 11, padding: 0 }}>Xóa nhật ký</Button>
            </Popconfirm>
          </Space>
        </div>
        
        <div style={{ backgroundColor: '#141414', borderRadius: 8, padding: 12, maxHeight: 300, overflowY: 'auto' }}>
          {systemLogs.length === 0 ? (
            <Text type="secondary" style={{ display: 'block', textAlign: 'center', margin: '24px 0' }}>Chưa có nhật ký hoạt động nào.</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {systemLogs.map((log, idx) => (
                <div key={idx} style={{ fontSize: 11, fontFamily: 'monospace', borderBottom: '1px solid #303030', paddingBottom: 4 }}>
                  <span style={{ color: '#8c8c8c' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: log.level === 'success' ? '#52c41a' : 
                           log.level === 'error' ? '#ff4d4f' : 
                           log.level === 'warn' ? '#faad14' : '#13c2c2' 
                  }}>
                    [{log.module}]
                  </span>{' '}
                  <span style={{ color: '#d9d9d9' }}>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </Space>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#fafafa', overflow: 'hidden' }}>
      
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
        <Tabs
          defaultActiveKey="1"
          centered
          tabBarExtraContent={
            <Badge 
              status={isTesting ? "warning" : "success"} 
              text={isTesting ? "Đang lưu..." : "Tự động lưu"} 
              style={{ fontSize: 12, color: isTesting ? '#faad14' : '#52c41a', backgroundColor: isTesting ? '#fffbe6' : '#f6ffed', padding: '2px 8px', borderRadius: 4, border: `1px solid ${isTesting ? '#ffe58f' : '#b7eb8f'}` }}
            />
          }
          items={[
            {
              key: '1',
              label: <Space><SparklesIcon className="w-4 h-4" /> AI & Kết nối</Space>,
              children: aiTabContent,
            },
            {
              key: '2',
              label: <Space><DocumentTextIcon className="w-4 h-4" /> Barem & Quy tắc</Space>,
              children: rulesTabContent,
            },
            {
              key: '3',
              label: <Space><ArchiveBoxIcon className="w-4 h-4" /> Bộ nhớ & Log</Space>,
              children: logsTabContent,
            },
          ]}
        />
      </div>
    </div>
  );
};
