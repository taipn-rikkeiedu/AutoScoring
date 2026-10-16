import React, { useMemo, useState } from 'react';
import {
  Button, Select, Input, Flex, Typography, Empty, Collapse, Tag, Tooltip, Popconfirm, Drawer, Progress, Alert
} from 'antd';
import { CloudDownloadOutlined, ExportOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { useApp } from '~/src/core/AppContext';
import { useToast } from '~/src/core/ToastContext';
import { useExerciseBank } from '~/src/hooks/exercise-bank/useExerciseBank';
import { BankCourse, BankHomework, bankStats } from '~/src/core/exerciseBank';
import { plainText } from '~/src/core/examAnalysis';
import { DEFAULT_CRITERIA } from '~/src/core/utils';
import { MarkdownExportModal } from '~/src/components/MarkdownExportModal';

const { Text } = Typography;

interface OpenExercise { course: BankCourse; session: string; homework: BankHomework }

const fmtTime = (iso: string) => new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/**
 * Kho đề bài: lấy trực tiếp từ QLĐT (môn → buổi → đề + tiêu chí chấm), chỉ đọc.
 * Các phần chấm điểm dùng kho đề này để lấy đề và tiêu chí.
 */
export const ExercisesTab: React.FC = () => {
  const b = useExerciseBank();
  const { exerciseTemplates } = useApp();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<OpenExercise | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const courses = Object.values(b.bank).sort((x, y) => x.courseName.localeCompare(y.courseName, 'vi'));
  const q = plainText(query);

  /** Lọc đề theo tên (gõ không dấu được). Khi đang tìm, môn / buổi không còn đề khớp thì ẩn. */
  const filtered = useMemo(() => courses.map(c => ({
    course: c,
    sessions: c.sessions
      .map(s => ({ ...s, homework: s.homework.filter(h => !q || plainText(h.title).includes(q)) }))
      .filter(s => s.homework.length)
  })).filter(x => !q || x.sessions.length), [courses, q]);

  return (
    <Flex vertical gap={12} style={{ height: '100%', padding: 16, overflow: 'hidden' }}>
      {/* Chọn lớp / môn + tải đề */}
      <Flex gap={8}>
        <Select
          style={{ flex: 1, minWidth: 0 }}
          placeholder="Chọn lớp"
          options={b.classes}
          value={b.classId || undefined}
          onChange={b.handleClassChange}
          onOpenChange={(o) => { if (o && !b.classes.length) b.reloadClasses(); }}
          notFoundContent="Chưa tải được danh sách lớp — cần đăng nhập QLĐT"
          showSearch
          optionFilterProp="label"
          disabled={!!b.syncing}
        />
        <Select
          style={{ flex: 1, minWidth: 0 }}
          placeholder={b.classId ? 'Chọn môn học' : 'Chọn lớp trước'}
          options={b.courses}
          value={b.courseId || undefined}
          onChange={b.setCourseId}
          showSearch
          optionFilterProp="label"
          disabled={!!b.syncing || !b.classId}
        />
        <Button type="primary" icon={<CloudDownloadOutlined />} onClick={b.handleSyncSelected} loading={!!b.syncing} disabled={!b.courseId}>
          Tải đề từ QLĐT
        </Button>
      </Flex>

      {b.progress && (
        <Progress
          percent={b.progress.total ? Math.round((b.progress.done / b.progress.total) * 100) : 0}
          status="active"
          format={() => `${b.progress!.done}/${b.progress!.total} buổi`}
        />
      )}
      {b.error && <Alert type="error" showIcon title={b.error} closable />}

      {courses.length > 0 && (
        <Flex justify="space-between" gap={8}>
          <Input.Search placeholder="Tìm đề theo tên" allowClear value={query} onChange={(e) => setQuery(e.target.value)} style={{ maxWidth: 280 }} />
          <Button icon={<ExportOutlined />} onClick={() => setExportOpen(true)}>Xuất Markdown</Button>
        </Flex>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {!courses.length ? (
          <Empty description='Chưa có đề nào. Chọn lớp và môn học rồi bấm "Tải đề từ QLĐT" — đề và tiêu chí chấm được lấy đúng như trên hệ thống.' />
        ) : !filtered.length ? (
          <Empty description="Không có đề nào khớp tìm kiếm." />
        ) : (
          <Collapse
            defaultActiveKey={courses.length === 1 ? [courses[0].courseId] : []}
            {...(q ? { activeKey: filtered.map(x => x.course.courseId) } : {})}
            items={filtered.map(({ course, sessions }) => {
              const st = bankStats(course);
              return {
                key: course.courseId,
                label: (
                  <Flex vertical>
                    <Text strong>{course.courseName}</Text>
                    <Text type="secondary">
                      {st.sessions} buổi · {st.homework} đề · cập nhật {fmtTime(course.syncedAt)}
                      {st.missingCriteria > 0 && <> · <Text type="warning">{st.missingCriteria} đề thiếu tiêu chí</Text></>}
                    </Text>
                  </Flex>
                ),
                extra: (
                  <Flex gap={4} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Tải lại đề mới nhất từ QLĐT">
                      <Button size="small" icon={<ReloadOutlined />} loading={b.syncing === course.courseId} disabled={!!b.syncing} onClick={() => b.syncCourse(course.courseId, course.courseName)} />
                    </Tooltip>
                    <Popconfirm title="Xoá môn này khỏi kho đề?" description="Có thể tải lại bất cứ lúc nào." okText="Xoá" cancelText="Huỷ" onConfirm={() => b.removeCourse(course.courseId)}>
                      <Tooltip title="Xoá khỏi kho đề"><Button size="small" icon={<DeleteOutlined />} disabled={!!b.syncing} /></Tooltip>
                    </Popconfirm>
                  </Flex>
                ),
                children: !sessions.length ? (
                  <Text type="secondary">Chưa có đề nào trên QLĐT. Bấm ↻ để tải lại khi đã có đề.</Text>
                ) : (
                  <Flex vertical gap={12}>
                    {sessions.map(s => (
                      <div key={s.id}>
                        <Text type="secondary" strong>{s.name}</Text>
                        <Flex vertical style={{ marginTop: 4 }}>
                          {s.homework.map(h => (
                            <Flex
                              key={h.id}
                              justify="space-between"
                              align="center"
                              gap={8}
                              onClick={() => setOpen({ course, session: s.name, homework: h })}
                              style={{ padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}
                              className="exercise-row"
                            >
                              <Text>{h.title}</Text>
                              {!h.criteria && <Tag color="gold" variant="filled" style={{ margin: 0 }}>Thiếu tiêu chí</Tag>}
                            </Flex>
                          ))}
                        </Flex>
                      </div>
                    ))}
                  </Flex>
                )
              };
            })}
          />
        )}
      </div>
      <style>{`.exercise-row:hover{background:#f5f5f5}`}</style>

      {/* Chi tiết 1 đề (chỉ đọc) */}
      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        size={540}
        title={open && (
          <Flex vertical>
            <span>{open.homework.title}</span>
            <Text type="secondary" style={{ fontWeight: 'normal' }}>{open.course.courseName} · {open.session}</Text>
          </Flex>
        )}
      >
        {open && (
          <Flex vertical gap={24}>
            <div>
              <Flex justify="space-between" align="center">
                <Text strong style={{ fontSize: 15 }}>Đề bài</Text>
                <Text copyable={{ text: open.homework.assignment, tooltips: ['Sao chép đề', 'Đã sao chép'] }} />
              </Flex>
              <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{open.homework.assignment || <Text type="secondary">Đề không có mô tả.</Text>}</div>
            </div>
            <div>
              <Text strong style={{ fontSize: 15 }}>Tiêu chí chấm</Text>
              {open.homework.criteria ? (
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{open.homework.criteria}</div>
              ) : (
                <Flex vertical gap={8} style={{ marginTop: 8 }}>
                  <Alert type="warning" showIcon title="Đề này chưa có tiêu chí chấm trên QLĐT — khi chấm sẽ dùng tiêu chí mặc định dưới đây." />
                  <div style={{ whiteSpace: 'pre-wrap', color: '#8c8c8c' }}>{DEFAULT_CRITERIA}</div>
                </Flex>
              )}
            </div>
          </Flex>
        )}
      </Drawer>

      {exportOpen && (
        <MarkdownExportModal
          selectedChapter={open?.course.courseName || ''}
          selectedSession={open?.session || ''}
          selectedAssignment={open?.homework.title || ''}
          promptText={open?.homework.assignment || ''}
          criteriaText={open ? (open.homework.criteria || DEFAULT_CRITERIA) : ''}
          exerciseTemplates={exerciseTemplates}
          onClose={() => setExportOpen(false)}
          onToast={showToast}
        />
      )}
    </Flex>
  );
};
