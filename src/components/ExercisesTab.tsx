import React from 'react';
import { useExerciseManager } from '~/src/hooks/exercise-manager/useExerciseManager';
import { MarkdownExportModal } from '~/src/components/MarkdownExportModal';
import { Button, Card, Select, Input, Space, Typography, Modal, AutoComplete, Empty, Tooltip, Row, Col } from 'antd';
import {
  PlusOutlined,
  SyncOutlined,
  ExportOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CopyOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { TextArea } = Input;

export const ExercisesTab: React.FC = () => {
  const {
    selectedChapter,
    selectedSession,
    selectedAssignment,
    promptText,
    setPromptText,
    criteriaText,
    setCriteriaText,
    showDetail,
    isExportModalOpen,
    setIsExportModalOpen,
    isScrapeModalOpen,
    setIsScrapeModalOpen,
    scrapeChapter,
    setScrapeChapter,
    scrapeSession,
    setScrapeSession,
    scrapeAssignmentName,
    setScrapeAssignmentName,
    scrapeAssignmentText,
    setScrapeAssignmentText,
    scrapeCriteriaText,
    setScrapeCriteriaText,
    isScraping,
    chapters,
    sessions,
    assignments,
    exerciseTemplates,
    handleChapterChange,
    handleSessionChange,
    handleAssignmentChange,
    handleOpenAddExerciseModal,
    handleScrapeFromLms,
    handleDeleteExercise,
    handleSaveDetail,
    handleConfirmScrapeSave,
    isLocalDeletable,
    handleExportCurrentMd,
    handleCopyCurrentMd,
    showToast,
    scrapeSessionSuggestions
  } = useExerciseManager();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: '16px', overflowY: 'auto' }}>
      {/* Action Row */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button
          type="primary"
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a', flex: 1, fontWeight: 'bold' }}
          icon={<PlusOutlined />}
          onClick={handleOpenAddExerciseModal}
        >
          Thêm đề bài mới
        </Button>

        <Button
          type="primary"
          style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#000', flex: 1, fontWeight: 'bold' }}
          icon={<SyncOutlined />}
          onClick={handleScrapeFromLms}
          loading={isScraping}
        >
          {isScraping ? "Đang lấy..." : "Lấy đề từ LMS"}
        </Button>

        <Button
          icon={<ExportOutlined />}
          onClick={() => setIsExportModalOpen(true)}
          style={{ fontWeight: 'bold', color: '#096dd9', borderColor: '#91d5ff', backgroundColor: '#e6f7ff' }}
        >
          Xuất MD
        </Button>

        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={handleDeleteExercise}
          disabled={!isLocalDeletable()}
        >
          Xóa đề
        </Button>
      </div>

      {/* Compact Selectors */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #f0f0f0', padding: '12px', borderRadius: 8 }}>
        <Row gutter={12}>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>CHƯƠNG TRÌNH / KHÓA HỌC:</Text>
            <Select
              showSearch
              placeholder="-- Chọn chương trình --"
              value={selectedChapter || undefined}
              onChange={(val) => handleChapterChange({ target: { value: val } } as any)}
              style={{ width: '100%' }}
              options={chapters.map(c => ({ value: c, label: c }))}
            />
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>SESSION:</Text>
            <Select
              showSearch
              placeholder="-- Chọn session --"
              value={selectedSession || undefined}
              onChange={(val) => handleSessionChange({ target: { value: val } } as any)}
              style={{ width: '100%' }}
              disabled={!selectedChapter}
              options={sessions.map(s => ({ value: s, label: s }))}
            />
          </Col>
          <Col span={8}>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>BÀI TẬP:</Text>
            <Select
              showSearch
              placeholder="-- Chọn bài tập --"
              value={selectedAssignment || undefined}
              onChange={(val) => handleAssignmentChange({ target: { value: val } } as any)}
              style={{ width: '100%' }}
              disabled={!selectedSession}
              options={assignments.map(a => ({ value: a, label: a }))}
            />
          </Col>
        </Row>
      </div>

      {/* Editor Content Area */}
      {showDetail ? (
        <Card size="small" style={{ borderRadius: 8, flex: 1, display: 'flex', flexDirection: 'column' }} bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>ĐỀ BÀI (MÔ TẢ):</Text>
            <TextArea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Nội dung yêu cầu đề bài..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              style={{ fontSize: 12 }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>TIÊU CHÍ CHẤM ĐIỂM (RUBRIC):</Text>
            <TextArea
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              placeholder="Tiêu chí đánh giá phân bổ điểm số..."
              autoSize={{ minRows: 4, maxRows: 8 }}
              style={{ fontSize: 12 }}
            />
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 8 }}>
            <Button
              type="primary"
              block
              style={{ backgroundColor: '#faad14', borderColor: '#faad14', color: '#000', fontWeight: 'bold', marginBottom: 8 }}
              onClick={handleSaveDetail}
            >
              Lưu thay đổi
            </Button>
            
            <Row gutter={8}>
              <Col span={12}>
                <Tooltip title="Tải ngay tệp .md của bài tập này về máy tính">
                  <Button 
                    block 
                    icon={<DownloadOutlined />} 
                    onClick={handleExportCurrentMd}
                    style={{ color: '#096dd9', borderColor: '#91d5ff', backgroundColor: '#e6f7ff' }}
                  >
                    Xuất file .md
                  </Button>
                </Tooltip>
              </Col>
              <Col span={12}>
                <Tooltip title="Sao chép Markdown vào bộ nhớ tạm">
                  <Button 
                    block 
                    icon={<CopyOutlined />} 
                    onClick={handleCopyCurrentMd}
                  >
                    Sao chép MD
                  </Button>
                </Tooltip>
              </Col>
            </Row>
          </div>
        </Card>
      ) : (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px dashed #d9d9d9', borderRadius: 8, backgroundColor: '#fafafa' }}>
          <Empty description="Chọn đề bài để xem chi tiết hoặc chỉnh sửa. Bạn cũng có thể bấm Lấy đề từ LMS." />
        </div>
      )}

      {/* Export Markdown Modal */}
      {isExportModalOpen && (
        <MarkdownExportModal
          selectedChapter={selectedChapter}
          selectedSession={selectedSession}
          selectedAssignment={selectedAssignment}
          promptText={promptText}
          criteriaText={criteriaText}
          exerciseTemplates={exerciseTemplates}
          onClose={() => setIsExportModalOpen(false)}
          onToast={showToast}
        />
      )}

      {/* Scraped Confirm Modal */}
      <Modal
        title="Thêm đề bài mới"
        open={isScrapeModalOpen}
        onCancel={() => setIsScrapeModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsScrapeModalOpen(false)}>Hủy</Button>,
          <Button key="submit" type="primary" onClick={handleConfirmScrapeSave}>Xác nhận lưu</Button>
        ]}
        width={400}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>CHƯƠNG (KHÓA HỌC):</Text>
            <AutoComplete
              value={scrapeChapter}
              onChange={setScrapeChapter}
              options={chapters.map(c => ({ value: c }))}
              placeholder="Gõ hoặc chọn chương trình"
              style={{ width: '100%' }}
              filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>SESSION:</Text>
            <AutoComplete
              value={scrapeSession}
              onChange={setScrapeSession}
              options={scrapeSessionSuggestions.map(s => ({ value: s }))}
              placeholder="Gõ hoặc chọn session"
              style={{ width: '100%' }}
              filterOption={(inputValue, option) =>
                option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>TÊN BÀI TẬP:</Text>
            <Input
              value={scrapeAssignmentName}
              onChange={(e) => setScrapeAssignmentName(e.target.value)}
              placeholder="Nhập tên bài tập..."
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>ĐỀ BÀI:</Text>
            <TextArea
              value={scrapeAssignmentText}
              onChange={(e) => setScrapeAssignmentText(e.target.value)}
              placeholder="Nội dung yêu cầu..."
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </div>

          <div>
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>RUBRIC CHẤM:</Text>
            <TextArea
              value={scrapeCriteriaText}
              onChange={(e) => setScrapeCriteriaText(e.target.value)}
              placeholder="Tiêu chí đánh giá..."
              autoSize={{ minRows: 2, maxRows: 6 }}
            />
          </div>
        </Space>
      </Modal>
    </div>
  );
};
