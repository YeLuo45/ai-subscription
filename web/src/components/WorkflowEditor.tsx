/**
 * Workflow Editor Component
 * Drawer for creating/editing workflow rules
 */

import React, { useEffect } from 'react';
import {
  Drawer,
  Form,
  Input,
  Switch,
  Select,
  Button,
  Space,
  Tag,
  Card,
  Divider,
  InputNumber,
  message,
  Alert,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { WorkflowRule, TriggerType, ActionType } from '../types/workflow';
import { TRIGGER_LABELS, ACTION_LABELS } from '../types/workflow';

interface WorkflowEditorProps {
  open: boolean;
  rule: WorkflowRule | null;
  onClose: () => void;
  onSave: (rule: Omit<WorkflowRule, 'id' | 'createdAt'> | WorkflowRule) => Promise<void>;
}

type RuleFormData = {
  name: string;
  enabled: boolean;
  triggerType: TriggerType;
  keywords: string[];
  sentiment: string[];
  sources: string[];
  conditionsTags: string[];
  minLength?: number;
  actions: Array<{
    type: ActionType;
    params: Record<string, any>;
  }>;
};

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  open,
  rule,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm<RuleFormData>();
  const [triggerType, setTriggerType] = React.useState<TriggerType>('article_added');
  const [actions, setActions] = React.useState<Array<{ type: ActionType; params: Record<string, any> }>>([]);
  const [saving, setSaving] = React.useState(false);

  useEffect(() => {
    if (open) {
      if (rule) {
        // Editing existing rule
        form.setFieldsValue({
          name: rule.name,
          enabled: rule.enabled,
          triggerType: rule.trigger.type,
          keywords: rule.trigger.keywords || [],
          sentiment: rule.trigger.sentiment || [],
          sources: rule.trigger.sources || [],
          conditionsTags: rule.conditions.tags || [],
          minLength: rule.conditions.minLength,
        });
        setTriggerType(rule.trigger.type);
        setActions(rule.actions);
      } else {
        // New rule
        form.resetFields();
        form.setFieldsValue({
          name: '',
          enabled: true,
          triggerType: 'article_added',
          keywords: [],
          sentiment: [],
          sources: [],
          conditionsTags: [],
        });
        setTriggerType('article_added');
        setActions([]);
      }
    }
  }, [open, rule, form]);

  const handleAddAction = () => {
    setActions(prev => [...prev, { type: 'add_tag', params: {} }]);
  };

  const handleRemoveAction = (index: number) => {
    setActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleActionTypeChange = (index: number, type: ActionType) => {
    setActions(prev => prev.map((a, i) => i === index ? { ...a, type, params: {} } : a));
  };

  const handleActionParamChange = (index: number, param: string, value: any) => {
    setActions(prev => prev.map((a, i) => 
      i === index ? { ...a, params: { ...a.params, [param]: value } } : a
    ));
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const ruleData: Omit<WorkflowRule, 'id' | 'createdAt'> = {
        name: values.name,
        enabled: values.enabled,
        trigger: {
          type: values.triggerType,
          keywords: values.keywords?.filter(Boolean),
          sentiment: values.sentiment?.filter(Boolean),
          sources: values.sources?.filter(Boolean),
        },
        conditions: {
          tags: values.conditionsTags?.filter(Boolean),
          minLength: values.minLength,
        },
        actions: actions,
      };

      if (rule && rule.id) {
        await onSave({ ...ruleData, id: rule.id, createdAt: rule.createdAt } as WorkflowRule);
      } else {
        await onSave(ruleData);
      }
    } catch (err) {
      message.error('请检查表单填写');
    } finally {
      setSaving(false);
    }
  };

  const renderActionEditor = (action: { type: ActionType; params: Record<string, any> }, index: number) => {
    switch (action.type) {
      case 'add_tag':
        return (
          <Space key={index}>
            <Input
              placeholder="标签名"
              style={{ width: 120 }}
              value={action.params.tag || ''}
              onChange={e => handleActionParamChange(index, 'tag', e.target.value)}
            />
          </Space>
        );
      case 'send_telegram':
        return (
          <Space key={index} wrap>
            <Input
              placeholder="Bot Token"
              style={{ width: 150 }}
              value={action.params.botToken || ''}
              onChange={e => handleActionParamChange(index, 'botToken', e.target.value)}
            />
            <Input
              placeholder="Chat ID"
              style={{ width: 120 }}
              value={action.params.chatId || ''}
              onChange={e => handleActionParamChange(index, 'chatId', e.target.value)}
            />
            <Input.TextArea
              placeholder="消息模板，支持 {{title}} {{source}} {{url}} {{sentiment}} {{key_points}}"
              style={{ width: 300 }}
              rows={2}
              value={action.params.message || ''}
              onChange={e => handleActionParamChange(index, 'message', e.target.value)}
            />
          </Space>
        );
      case 'send_webhook':
        return (
          <Space key={index} wrap>
            <Input
              placeholder="Webhook URL"
              style={{ width: 200 }}
              value={action.params.url || ''}
              onChange={e => handleActionParamChange(index, 'url', e.target.value)}
            />
          </Space>
        );
      case 'mark_starred':
        return <span key={index} style={{ color: '#666' }}>标记文章为星标</span>;
      case 'add_to_list':
        return <span key={index} style={{ color: '#666' }}>加入稍后读列表</span>;
      default:
        return null;
    }
  };

  return (
    <Drawer
      title={rule ? '编辑工作流' : '新建工作流'}
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onClose}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>
            保存规则
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="规则名称"
          rules={[{ required: true, message: '请输入规则名称' }]}
        >
          <Input placeholder="如: AI投资新闻监控" />
        </Form.Item>

        <Form.Item name="enabled" label="启用规则" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Divider>触发条件</Divider>

        <Form.Item
          name="triggerType"
          label="触发类型"
          rules={[{ required: true }]}
        >
          <Select onChange={val => setTriggerType(val)}>
            <Select.Option value="article_added">article_added - 新文章入库时</Select.Option>
            <Select.Option value="keyword_detected">keyword_detected - 关键词匹配</Select.Option>
            <Select.Option value="sentiment_match">sentiment_match - 情感标签匹配</Select.Option>
            <Select.Option value="source_match">source_match - 来源匹配</Select.Option>
          </Select>
        </Form.Item>

        {triggerType === 'keyword_detected' && (
          <Form.Item name="keywords" label="关键词列表">
            <Select
              mode="tags"
              placeholder="输入关键词后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {triggerType === 'sentiment_match' && (
          <Form.Item name="sentiment" label="情感标签">
            <Select
              mode="tags"
              placeholder="输入情感标签后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        {triggerType === 'source_match' && (
          <Form.Item name="sources" label="来源名称">
            <Select
              mode="tags"
              placeholder="输入订阅源名称后按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>
        )}

        <Divider>执行条件（可选）</Divider>

        <Form.Item name="conditionsTags" label="必须包含的标签">
          <Select
            mode="tags"
            placeholder="留空表示不限制"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item name="minLength" label="文章最小长度">
          <InputNumber min={0} placeholder="留空表示不限制" style={{ width: '100%' }} />
        </Form.Item>

        <Divider>执行动作</Divider>

        {actions.length === 0 ? (
          <Alert message="暂无动作，请添加至少一个动作" type="info" showIcon />
        ) : (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {actions.map((action, index) => (
              <Card key={index} size="small" style={{ background: '#f5f5f5' }}>
                <Space align="start">
                  <Select
                    value={action.type}
                    onChange={val => handleActionTypeChange(index, val)}
                    style={{ width: 140 }}
                  >
                    <Select.Option value="add_tag">{ACTION_LABELS.add_tag}</Select.Option>
                    <Select.Option value="send_telegram">{ACTION_LABELS.send_telegram}</Select.Option>
                    <Select.Option value="send_webhook">{ACTION_LABELS.send_webhook}</Select.Option>
                    <Select.Option value="mark_starred">{ACTION_LABELS.mark_starred}</Select.Option>
                    <Select.Option value="add_to_list">{ACTION_LABELS.add_to_list}</Select.Option>
                  </Select>
                  {renderActionEditor(action, index)}
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemoveAction(index)}
                  />
                </Space>
              </Card>
            ))}
          </Space>
        )}

        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={handleAddAction}
          style={{ marginTop: 16, width: '100%' }}
        >
          添加动作
        </Button>

        <Divider />

        <Alert
          message="变量说明"
          description={
            <div style={{ fontSize: 12 }}>
              <code>{'{{title}}'}</code> 文章标题 &nbsp;
              <code>{'{{source}}'}</code> 来源名称 &nbsp;
              <code>{'{{url}}'}</code> 文章链接<br />
              <code>{'{{generated_title}}'}</code> AI生成标题 &nbsp;
              <code>{'{{sentiment}}'}</code> 情感标签<br />
              <code>{'{{key_points}}'}</code> 关键点摘要
            </div>
          }
          type="info"
          showIcon
        />
      </Form>
    </Drawer>
  );
};
