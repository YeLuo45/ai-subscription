/**
 * EmailSender Component
 * Send emails to subscribers with progress tracking
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Select, Input, Button, Space, Progress, message, Alert, Table, Tag, Modal } from 'antd';
import { SendOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';
import type { EmailTemplate, EmailHistory, EmailSendingProgress, Subscriber } from '../types/emailSubscription';
import * as emailService from '../services/emailService';

const { Option } = Select;
const { TextArea } = Input;

export const EmailSender: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<EmailSendingProgress | null>(null);
  const [history, setHistory] = useState<EmailHistory[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await emailService.initDefaultTemplatesIfNeeded();
      const [tmpls, subs, hist] = await Promise.all([
        emailService.getTemplates(),
        emailService.getSubscribers(),
        emailService.getEmailHistory(),
      ]);
      setTemplates(tmpls);
      setSubscribers(subs);
      setHistory(hist);
      if (tmpls.length > 0) {
        setSelectedTemplate(tmpls[0]);
        form.setFieldsValue({ templateId: tmpls[0].id });
      }
    } catch (error) {
      message.error('加载数据失败');
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(tmpl);
    }
  };

  const handleSend = async () => {
    if (!selectedTemplate) {
      message.warning('请选择邮件模板');
      return;
    }
    if (!content.trim()) {
      message.warning('请输入邮件内容');
      return;
    }

    const activeSubscribers = subscribers.filter(s => s.status === 'active');
    if (activeSubscribers.length === 0) {
      message.warning('没有活跃的订阅者');
      return;
    }

    Modal.confirm({
      title: '确认发送',
      content: `确定要发送邮件给 ${activeSubscribers.length} 位订阅者吗？`,
      okText: '确认发送',
      cancelText: '取消',
      onOk: async () => {
        setSending(true);
        setProgress({ total: activeSubscribers.length, sent: 0, failed: 0 });
        
        try {
          const result = await emailService.sendBulkEmails(
            activeSubscribers,
            selectedTemplate,
            content,
            (prog) => setProgress({ ...prog })
          );
          
          if (result.success) {
            message.success(`发送完成：${result.progress.sent} 封成功`);
          } else {
            message.warning(`发送完成：${result.progress.sent} 成功，${result.progress.failed} 失败`);
          }
          setContent('');
          loadData();
        } catch (error) {
          message.error('发送失败');
        } finally {
          setSending(false);
          setProgress(null);
        }
      },
    });
  };

  const handleRetryFailed = async () => {
    if (!selectedTemplate) return;
    
    const failedHistory = history.filter(h => h.status === 'failed');
    if (failedHistory.length === 0) {
      message.info('没有需要重试的失败邮件');
      return;
    }

    Modal.confirm({
      title: '重试失败邮件',
      content: `确定要重试 ${failedHistory.length} 封失败邮件吗？`,
      okText: '确认重试',
      cancelText: '取消',
      onOk: async () => {
        setSending(true);
        setProgress({ total: failedHistory.length, sent: 0, failed: 0 });
        
        try {
          const result = await emailService.retryFailedEmails(
            selectedTemplate,
            content,
            (prog) => setProgress({ ...prog })
          );
          
          if (result.success) {
            message.success(`重试完成：${result.progress.sent} 封成功`);
          } else {
            message.warning(`重试完成：${result.progress.sent} 成功，${result.progress.failed} 失败`);
          }
          loadData();
        } catch (error) {
          message.error('重试失败');
        } finally {
          setSending(false);
          setProgress(null);
        }
      },
    });
  };

  const historyColumns = [
    { title: '收件人', dataIndex: 'to', key: 'to' },
    { title: '主题', dataIndex: 'subject', key: 'subject' },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => {
        const colors: Record<string, string> = { pending: 'orange', sending: 'blue', sent: 'green', failed: 'red' };
        const labels: Record<string, string> = { pending: '等待中', sending: '发送中', sent: '已发送', failed: '失败' };
        return <Tag color={colors[status]}>{labels[status]}</Tag>;
      }
    },
    { 
      title: '时间', 
      dataIndex: 'sentAt', 
      key: 'sentAt',
      render: (ts?: number) => ts ? new Date(ts).toLocaleString('zh-CN') : '-'
    },
    { title: '错误信息', dataIndex: 'errorMessage', key: 'errorMessage', render: (msg?: string) => msg || '-' },
  ];

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const failedCount = history.filter(h => h.status === 'failed').length;

  return (
    <Card title="邮件发送" size="small">
      <Form form={form} layout="vertical">
        <Form.Item label="选择模板" name="templateId">
          <Select style={{ width: 200 }} onChange={handleTemplateChange}>
            {templates.map(tmpl => (
              <Option key={tmpl.id} value={tmpl.id}>{tmpl.name}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="邮件内容" required
          extra="AI 摘要内容将作为 {{content}} 变量插入模板">
          <TextArea
            rows={6}
            placeholder="输入要发送的邮件内容..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </Form.Item>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Space>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={sending}
              disabled={!content.trim() || activeCount === 0}
            >
              发送邮件 ({activeCount} 位订阅者)
            </Button>
            
            {failedCount > 0 && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRetryFailed}
                loading={sending}
              >
                重试失败邮件 ({failedCount})
              </Button>
            )}
            
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryVisible(true)}>
              发送历史
            </Button>
          </Space>

          {progress && (
            <div style={{ width: 400 }}>
              <Progress
                percent={Math.round(((progress.sent + progress.failed) / progress.total) * 100)}
                status={progress.failed > 0 ? 'exception' : 'active'}
                format={() => `${progress.sent}/${progress.total}`}
              />
              {progress.current && (
                <Alert message={`正在发送给: ${progress.current}`} type="info" showIcon />
              )}
            </div>
          )}
        </Space>
      </Form>

      <Modal
        title="发送历史"
        open={historyVisible}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
        width={900}
      >
        <Table
          dataSource={history}
          columns={historyColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Modal>
    </Card>
  );
};

export default EmailSender;
