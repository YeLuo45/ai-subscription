/**
 * EmailTemplateEditor Component
 * Editor for email templates with preview
 */

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Space, message, Select, Divider, Alert } from 'antd';
import type { EmailTemplate } from '../types/emailSubscription';
import * as emailService from '../services/emailService';

const { Option } = Select;
const { TextArea } = Input;

export const EmailTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      await emailService.initDefaultTemplatesIfNeeded();
      const tmpls = await emailService.getTemplates();
      setTemplates(tmpls);
      if (tmpls.length > 0 && !selectedTemplate) {
        setSelectedTemplate(tmpls[0]);
        form.setFieldsValue({
          name: tmpls[0].name,
          subject: tmpls[0].subject,
          content: tmpls[0].content,
        });
      }
    } catch (error) {
      message.error('加载模板失败');
    }
  };

  const handleTemplateChange = (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (tmpl) {
      setSelectedTemplate(tmpl);
      form.setFieldsValue({
        name: tmpl.name,
        subject: tmpl.subject,
        content: tmpl.content,
      });
      setHasChanges(false);
    }
  };

  const handleValuesChange = () => {
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedTemplate) return;
    
    setLoading(true);
    try {
      const values = form.getFieldsValue();
      const updated: EmailTemplate = {
        ...selectedTemplate,
        name: values.name,
        subject: values.subject,
        content: values.content,
        updatedAt: Date.now(),
      };
      await emailService.saveTemplate(updated);
      message.success('模板已保存');
      setHasChanges(false);
      loadTemplates();
    } catch (error) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (selectedTemplate) {
      form.setFieldsValue({
        name: selectedTemplate.name,
        subject: selectedTemplate.subject,
        content: selectedTemplate.content,
      });
      setHasChanges(false);
    }
  };

  const getPreviewHtml = () => {
    const values = form.getFieldsValue();
    let preview = values.content || '';
    preview = preview.replace('{{content}}', '<p>这是示例内容...</p><p>包含文章标题和摘要</p>');
    preview = preview.replace('{{date}}', new Date().toLocaleDateString('zh-CN'));
    preview = preview.replace('{{week}}', `${new Date().getFullYear()}年第1周`);
    preview = preview.replace('{{unsubscribeUrl}}', '#unsubscribe');
    return preview;
  };

  return (
    <Card title="邮件模板编辑" size="small">
      <Form form={form} layout="vertical" onValuesChange={handleValuesChange}>
        <Form.Item label="选择模板" name="templateId">
          <Select
            style={{ width: 200 }}
            value={selectedTemplate?.id}
            onChange={handleTemplateChange}
          >
            {templates.map(tmpl => (
              <Option key={tmpl.id} value={tmpl.id}>
                {tmpl.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Divider />

        <Form.Item label="模板名称" name="name" rules={[{ required: true, message: '请输入模板名称' }]}>
          <Input placeholder="如：每日精选模板" style={{ width: 300 }} />
        </Form.Item>

        <Form.Item label="邮件主题" name="subject" rules={[{ required: true, message: '请输入邮件主题' }]}
          extra="可用变量：{{date}} 日期，{{week}} 周数">
          <Input placeholder="📬 每日精选 - {{date}}" style={{ width: 400 }} />
        </Form.Item>

        <Form.Item label="HTML 内容" name="content" 
          rules={[{ required: true, message: '请输入邮件内容' }]}
          extra="可用变量：{{content}} 文章内容，{{date}} 日期，{{week}} 周数，{{unsubscribeUrl}} 退订链接">
          <TextArea 
            rows={12} 
            placeholder="<html>...</html>"
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Space>
          <Button type="primary" onClick={handleSave} loading={loading} disabled={!hasChanges}>
            保存模板
          </Button>
          <Button onClick={handleReset} disabled={!hasChanges}>
            重置
          </Button>
        </Space>

        <Divider />

        <div style={{ marginTop: 16 }}>
          <h4>预览</h4>
          <div
            style={{
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              padding: 16,
              background: '#fff',
              maxWidth: 600,
            }}
            dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
          />
        </div>
      </Form>
    </Card>
  );
};

export default EmailTemplateEditor;
