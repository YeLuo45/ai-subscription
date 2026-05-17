/**
 * Sensitive Confirm Modal Component
 * 
 * Provides secondary verification for high-risk operations:
 * - Delete subscription source
 * - Clear all data
 * - Modify API Key
 * - Batch export
 * 
 * Requires user to type "confirm" to proceed with the sensitive action.
 */

import React, { useState } from 'react';
import { Modal, Input, Button, Space, Typography, Alert } from 'antd';
import { ExclamationCircleOutlined, SafetyOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

export type SensitiveOperationType = 
  | 'delete_subscription'
  | 'clear_all_data'
  | 'modify_api_key'
  | 'batch_export';

export interface SensitiveConfirmModalProps {
  /** The type of sensitive operation */
  operationType: SensitiveOperationType;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Optional custom title, defaults to operation type */
  title?: string;
  /** Optional custom description */
  description?: string;
  /** Optional item name being operated on (e.g., subscription name) */
  itemName?: string;
}

/**
 * Get default title for operation type
 */
function getDefaultTitle(operationType: SensitiveOperationType): string {
  switch (operationType) {
    case 'delete_subscription':
      return '删除订阅源';
    case 'clear_all_data':
      return '清除所有数据';
    case 'modify_api_key':
      return '修改 API Key';
    case 'batch_export':
      return '批量导出数据';
  }
}

/**
 * Get default description for operation type
 */
function getDefaultDescription(operationType: SensitiveOperationType, itemName?: string): string {
  const itemContext = itemName ? `「${itemName}」` : '此操作';
  
  switch (operationType) {
    case 'delete_subscription':
      return `删除订阅源${itemContext}是永久性操作，所有关联的文章和摘要都将被删除，且无法恢复。`;
    case 'clear_all_data':
      return '清除所有数据将删除所有订阅源、文章、摘要、笔记和设置。此操作不可恢复！';
    case 'modify_api_key':
      return '修改 API Key 将影响与 AI 服务的连接。请确保新 Key 有效且有足够的配额。';
    case 'batch_export':
      return '批量导出将包含所有订阅源、文章和设置数据。请确认导出文件的安全存储。';
  }
}

/**
 * Get confirmation word for operation type
 */
function getConfirmationWord(operationType: SensitiveOperationType): string {
  switch (operationType) {
    case 'delete_subscription':
      return '确认删除';
    case 'clear_all_data':
      return '确认清除';
    case 'modify_api_key':
      return '确认修改';
    case 'batch_export':
      return '确认导出';
  }
}

/**
 * SensitiveConfirmModal Component
 * 
 * Displays a confirmation modal requiring user to type a specific word
 * to confirm high-risk operations.
 * 
 * @example
 * ```tsx
 * <SensitiveConfirmModal
 *   operationType="delete_subscription"
 *   open={showModal}
 *   onConfirm={handleDelete}
 *   onCancel={() => setShowModal(false)}
 *   itemName="我的订阅源"
 * />
 * ```
 */
export const SensitiveConfirmModal: React.FC<SensitiveConfirmModalProps> = ({
  operationType,
  open,
  onConfirm,
  onCancel,
  title,
  description,
  itemName,
}) => {
  const [inputValue, setInputValue] = useState('');
  const confirmationWord = getConfirmationWord(operationType);

  const handleConfirm = () => {
    if (inputValue === 'confirm' || inputValue === confirmationWord) {
      onConfirm();
      setInputValue('');
    }
  };

  const handleCancel = () => {
    setInputValue('');
    onCancel();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (inputValue === 'confirm' || inputValue === confirmationWord)) {
      handleConfirm();
    }
  };

  const isConfirmed = inputValue === 'confirm' || inputValue === confirmationWord;

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <span>{title || getDefaultTitle(operationType)}</span>
        </Space>
      }
      open={open}
      onCancel={handleCancel}
      footer={null}
      maskClosable={false}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        {/* Warning Alert */}
        <Alert
          type="warning"
          message="安全确认"
          description={description || getDefaultDescription(operationType, itemName)}
          showIcon
          icon={<SafetyOutlined />}
          style={{ marginBottom: 16 }}
        />

        {/* Confirmation Instructions */}
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          请在下输入框中输入 <Text strong code>confirm</Text> 或 <Text strong code>{confirmationWord}</Text> 以确认此操作：
        </Paragraph>

        {/* Confirmation Input */}
        <Input
          placeholder={`输入 "${confirmationWord}" 确认`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          status={inputValue.length > 0 && !isConfirmed ? 'warning' : undefined}
          style={{ marginBottom: 16 }}
        />

        {/* Action Buttons */}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleCancel}>
            取消
          </Button>
          <Button
            type="primary"
            danger
            onClick={handleConfirm}
            disabled={!isConfirmed}
          >
            确认操作
          </Button>
        </Space>
      </div>
    </Modal>
  );
};

/**
 * Hook for managing sensitive operation confirmation state
 */
export function useSensitiveConfirm() {
  const [confirmModalState, setConfirmModalState] = useState<{
    open: boolean;
    operationType: SensitiveOperationType | null;
    itemName?: string;
    onConfirmCallback?: () => void;
  }>({
    open: false,
    operationType: null,
  });

  const requestConfirmation = (
    operationType: SensitiveOperationType,
    itemName?: string,
    onConfirmCallback?: () => void
  ) => {
    setConfirmModalState({
      open: true,
      operationType,
      itemName,
      onConfirmCallback,
    });
  };

  const handleConfirm = () => {
    if (confirmModalState.onConfirmCallback) {
      confirmModalState.onConfirmCallback();
    }
    setConfirmModalState({ open: false, operationType: null });
  };

  const handleCancel = () => {
    setConfirmModalState({ open: false, operationType: null });
  };

  const SensitiveModal = confirmModalState.operationType ? (
    <SensitiveConfirmModal
      operationType={confirmModalState.operationType}
      open={confirmModalState.open}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      itemName={confirmModalState.itemName}
    />
  ) : null;

  return {
    requestConfirmation,
    SensitiveModal,
  };
}

export default SensitiveConfirmModal;