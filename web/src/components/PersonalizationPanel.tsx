/**
 * PersonalizationPanel Component
 * Advanced theme customization, layout settings, and widget management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Slider,
  Select,
  Space,
  Divider,
  message,
  List,
  Tag,
  Popconfirm,
  ColorPicker,
  Typography,
  Alert,
  Collapse,
} from 'antd';
import {
  BgColorsOutlined,
  LayoutOutlined,
  AppstoreOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  UpOutlined,
  DownOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useI18n } from '../i18n';
import type {
  PersonalizationSettings,
  ThemeCustomization,
  LayoutCustomization,
  WidgetConfig,
  WidgetId,
  LayoutDensity,
  SidebarPosition,
} from '../types';
import { DEFAULT_PERSONALIZATION } from '../types';

const { TabPane } = Tabs;
const { Text } = Typography;

interface PersonalizationPanelProps {
  onSettingsChange?: (settings: PersonalizationSettings) => void;
}

export const PersonalizationPanel: React.FC<PersonalizationPanelProps> = ({ onSettingsChange }) => {
  const { t } = useI18n();
  const [settings, setSettings] = useState<PersonalizationSettings>(DEFAULT_PERSONALIZATION);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { getSettings } = await import('../services/storage');
      const appSettings = await getSettings();
      if (appSettings.personalization) {
        setSettings(appSettings.personalization);
      }
    } catch (err) {
      console.error('Failed to load personalization settings:', err);
    }
  };

  const saveSettings = async (newSettings: PersonalizationSettings) => {
    setLoading(true);
    try {
      const { getSettings, saveSettings } = await import('../services/storage');
      const appSettings = await getSettings();
      await saveSettings({
        ...appSettings,
        personalization: newSettings,
      });
      setSettings(newSettings);
      setHasChanges(false);
      onSettingsChange?.(newSettings);
      message.success('个性化设置已保存');
    } catch (err) {
      message.error('保存失败');
    } finally {
      setLoading(false);
    }
  };

  const updateTheme = (theme: Partial<ThemeCustomization>) => {
    const newSettings = {
      ...settings,
      theme: { ...settings.theme, ...theme },
    };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const updateLayout = (layout: Partial<LayoutCustomization>) => {
    const newSettings = {
      ...settings,
      layout: { ...settings.layout, ...layout },
    };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const updateWidget = (widgetId: WidgetId, updates: Partial<WidgetConfig>) => {
    const newWidgets = settings.widgets.map(w =>
      w.id === widgetId ? { ...w, ...updates } : w
    );
    const newSettings = { ...settings, widgets: newWidgets };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const toggleWidget = (widgetId: WidgetId) => {
    const widget = settings.widgets.find(w => w.id === widgetId);
    if (widget) {
      updateWidget(widgetId, { enabled: !widget.enabled });
    }
  };

  const moveWidget = (widgetId: WidgetId, direction: 'up' | 'down') => {
    const sortedWidgets = [...settings.widgets].sort((a, b) => a.order - b.order);
    const idx = sortedWidgets.findIndex(w => w.id === widgetId);
    if (direction === 'up' && idx > 0) {
      const temp = sortedWidgets[idx].order;
      sortedWidgets[idx].order = sortedWidgets[idx - 1].order;
      sortedWidgets[idx - 1].order = temp;
    } else if (direction === 'down' && idx < sortedWidgets.length - 1) {
      const temp = sortedWidgets[idx].order;
      sortedWidgets[idx].order = sortedWidgets[idx + 1].order;
      sortedWidgets[idx + 1].order = temp;
    }
    const newSettings = { ...settings, widgets: sortedWidgets };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_PERSONALIZATION);
    setHasChanges(true);
  };

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>个性化定制</h2>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadSettings}>
            重置
          </Button>
          <Button
            type="primary"
            onClick={() => saveSettings(settings)}
            disabled={!hasChanges}
            loading={loading}
          >
            保存设置
          </Button>
        </Space>
      </div>

      {hasChanges && (
        <Alert
          message="您有未保存的更改"
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs defaultActiveKey="theme">
        <TabPane
          tab={<span><BgColorsOutlined /> 主题定制</span>}
          key="theme"
        >
          <ThemeCustomizationPanel
            theme={settings.theme}
            onChange={updateTheme}
          />
        </TabPane>

        <TabPane
          tab={<span><LayoutOutlined /> 布局自定义</span>}
          key="layout"
        >
          <LayoutCustomizationPanel
            layout={settings.layout}
            onChange={updateLayout}
          />
        </TabPane>

        <TabPane
          tab={<span><AppstoreOutlined /> Widget 小部件</span>}
          key="widgets"
        >
          <WidgetPanel
            widgets={settings.widgets}
            onToggle={toggleWidget}
            onMove={moveWidget}
            onUpdate={updateWidget}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

interface ThemeCustomizationPanelProps {
  theme: ThemeCustomization;
  onChange: (theme: Partial<ThemeCustomization>) => void;
}

const ThemeCustomizationPanel: React.FC<ThemeCustomizationPanelProps> = ({ theme, onChange }) => {
  const { t } = useI18n();

  const presetColors = [
    '#1890ff', // Ant Design Blue (default)
    '#f5222d', // Red
    '#fa541c', // Volcano
    '#faad14', // Gold
    '#52c41a', // Green
    '#13c2c2', // Cyan
    '#722ed1', // Purple
    '#eb2f96', // Magenta
  ];

  return (
    <Card title="主题定制" size="small" style={{ maxWidth: 700 }}>
      <Form layout="vertical">
        <Form.Item label="主题色">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presetColors.map(color => (
              <div
                key={color}
                onClick={() => onChange({ primaryColor: color })}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: theme.primaryColor === color ? '2px solid #000' : '2px solid transparent',
                  boxShadow: theme.primaryColor === color ? '0 0 8px rgba(0,0,0,0.3)' : 'none',
                }}
              />
            ))}
            <ColorPicker
              value={theme.primaryColor}
              onChange={(color) => onChange({ primaryColor: color.toHexString() })}
              showText
              size={32}
            />
          </div>
        </Form.Item>

        <Form.Item label="圆角半径">
          <Space>
            <Slider
              min={0}
              max={24}
              value={theme.borderRadius}
              onChange={(value) => onChange({ borderRadius: value })}
              style={{ width: 200 }}
            />
            <InputNumber
              min={0}
              max={24}
              value={theme.borderRadius}
              onChange={(value) => onChange({ borderRadius: value || 0 })}
              style={{ width: 60 }}
            />
            <Text type="secondary">px</Text>
          </Space>
        </Form.Item>

        <Form.Item label="字体大小">
          <Select
            value={theme.fontSize}
            onChange={(value) => onChange({ fontSize: value })}
            style={{ width: 200 }}
          >
            <Select.Option value="small">小</Select.Option>
            <Select.Option value="medium">中</Select.Option>
            <Select.Option value="large">大</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="界面密度">
          <Select
            value={theme.density}
            onChange={(value) => onChange({ density: value })}
            style={{ width: 200 }}
          >
            <Select.Option value="compact">紧凑</Select.Option>
            <Select.Option value="comfortable">舒适</Select.Option>
            <Select.Option value="spacious">宽松</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="侧边栏位置">
          <Select
            value={theme.sidebarPosition}
            onChange={(value) => onChange({ sidebarPosition: value })}
            style={{ width: 200 }}
          >
            <Select.Option value="left">左侧</Select.Option>
            <Select.Option value="right">右侧</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="渐变强调色">
          <Switch
            checked={theme.accentGradient}
            onChange={(checked) => onChange({ accentGradient: checked })}
            checkedChildren="启用"
            unCheckedChildren="关闭"
          />
        </Form.Item>
      </Form>
    </Card>
  );
};

interface LayoutCustomizationPanelProps {
  layout: LayoutCustomization;
  onChange: (layout: Partial<LayoutCustomization>) => void;
}

const LayoutCustomizationPanel: React.FC<LayoutCustomizationPanelProps> = ({ layout, onChange }) => {
  return (
    <Card title="布局自定义" size="small" style={{ maxWidth: 700 }}>
      <Form layout="vertical">
        <Form.Item label="布局密度">
          <Select
            value={layout.density}
            onChange={(value) => onChange({ density: value })}
            style={{ width: 200 }}
          >
            <Select.Option value="compact">紧凑 - 更多内容</Select.Option>
            <Select.Option value="comfortable">舒适 - 平衡</Select.Option>
            <Select.Option value="spacious">宽松 - 更多留白</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="侧边栏宽度">
          <Space>
            <Slider
              min={180}
              max={400}
              value={layout.sidebarWidth}
              onChange={(value) => onChange({ sidebarWidth: value })}
              style={{ width: 200 }}
            />
            <InputNumber
              min={180}
              max={400}
              value={layout.sidebarWidth}
              onChange={(value) => onChange({ sidebarWidth: value || 240 })}
              style={{ width: 60 }}
            />
            <Text type="secondary">px</Text>
          </Space>
        </Form.Item>

        <Form.Item label="内容区最大宽度">
          <Space>
            <Slider
              min={800}
              max={2000}
              value={layout.contentMaxWidth}
              onChange={(value) => onChange({ contentMaxWidth: value })}
              style={{ width: 200 }}
            />
            <InputNumber
              min={800}
              max={2000}
              value={layout.contentMaxWidth}
              onChange={(value) => onChange({ contentMaxWidth: value || 1200 })}
              style={{ width: 60 }}
            />
            <Text type="secondary">px</Text>
          </Space>
        </Form.Item>

        <Form.Item label="顶部导航栏高度">
          <Space>
            <Slider
              min={48}
              max={80}
              value={layout.headerHeight}
              onChange={(value) => onChange({ headerHeight: value })}
              style={{ width: 200 }}
            />
            <InputNumber
              min={48}
              max={80}
              value={layout.headerHeight}
              onChange={(value) => onChange({ headerHeight: value || 64 })}
              style={{ width: 60 }}
            />
            <Text type="secondary">px</Text>
          </Space>
        </Form.Item>

        <Divider />

        <Collapse
          items={[
            {
              key: 'density-presets',
              label: '预设布局方案',
              children: (
                <Space wrap>
                  <Button onClick={() => onChange({ density: 'compact', contentMaxWidth: 1400, sidebarWidth: 200 })}>
                    紧凑模式
                  </Button>
                  <Button onClick={() => onChange({ density: 'comfortable', contentMaxWidth: 1200, sidebarWidth: 240 })}>
                    舒适模式
                  </Button>
                  <Button onClick={() => onChange({ density: 'spacious', contentMaxWidth: 1000, sidebarWidth: 280 })}>
                    宽松模式
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Form>
    </Card>
  );
};

interface WidgetPanelProps {
  widgets: WidgetConfig[];
  onToggle: (id: WidgetId) => void;
  onMove: (id: WidgetId, direction: 'up' | 'down') => void;
  onUpdate: (id: WidgetId, updates: Partial<WidgetConfig>) => void;
}

const widgetInfo: Record<WidgetId, { name: string; description: string; icon: string }> = {
  'weather': { name: '天气小部件', description: '显示当前位置天气信息', icon: '🌤️' },
  'quick-actions': { name: '快捷操作', description: '快速添加订阅、刷新等操作入口', icon: '⚡' },
  'reading-progress': { name: '阅读进度', description: '显示今日阅读进度和统计', icon: '📊' },
  'trending-topics': { name: '热门话题', description: '显示订阅源中的热门关键词', icon: '🔥' },
  'ai-insights': { name: 'AI 洞察', description: '基于 AI 分析的内容洞察', icon: '🤖' },
  'subscription-stats': { name: '订阅统计', description: '订阅源数量、更新频率等统计', icon: '📈' },
};

const WidgetPanel: React.FC<WidgetPanelProps> = ({ widgets, onToggle, onMove, onUpdate }) => {
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <Card title="Widget 小部件配置" size="small">
      <Alert
        message="小部件将显示在主界面侧边栏或顶部区域，帮助您快速获取信息和执行操作"
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <List
        dataSource={sortedWidgets}
        renderItem={(widget, index) => {
          const info = widgetInfo[widget.id];
          return (
            <List.Item
              key={widget.id}
              actions={[
                <Button
                  key="up"
                  type="text"
                  icon={<UpOutlined />}
                  onClick={() => onMove(widget.id, 'up')}
                  disabled={index === 0}
                />,
                <Button
                  key="down"
                  type="text"
                  icon={<DownOutlined />}
                  onClick={() => onMove(widget.id, 'down')}
                  disabled={index === sortedWidgets.length - 1}
                />,
                <Switch
                  key="toggle"
                  checked={widget.enabled}
                  onChange={() => onToggle(widget.id)}
                />,
              ]}
            >
              <List.Item.Meta
                avatar={<span style={{ fontSize: 24 }}>{info.icon}</span>}
                title={<span>{info.name}</span>}
                description={<Text type="secondary">{info.description}</Text>}
              />
              <div>
                {widget.enabled && (
                  <Select
                    value={widget.size || 'medium'}
                    onChange={(size) => onUpdate(widget.id, { size })}
                    size="small"
                    style={{ width: 80 }}
                  >
                    <Select.Option value="small">小</Select.Option>
                    <Select.Option value="medium">中</Select.Option>
                    <Select.Option value="large">大</Select.Option>
                  </Select>
                )}
              </div>
            </List.Item>
          );
        }}
      />
    </Card>
  );
};

export default PersonalizationPanel;