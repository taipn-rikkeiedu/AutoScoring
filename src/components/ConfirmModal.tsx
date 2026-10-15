import React from 'react';
import { Modal } from 'antd';

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
  return (
    <Modal
      open={isOpen}
      title={title}
      onOk={() => { onConfirm(); onCancel(); }}
      onCancel={onCancel}
      okText={confirmText}
      cancelText={cancelText}
      okButtonProps={{ danger: isDanger }}
      destroyOnClose
      centered
    >
      <p>{message}</p>
    </Modal>
  );
};
