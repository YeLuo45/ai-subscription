import { useState, useRef } from 'react';
import { Button, Space, message, Modal, List, Typography } from 'antd';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { parseOPML } from '../services/opmlParser';
import { exportOPML } from '../services/opmlExporter';
import { exportAllData, downloadJSON } from '../services/backupExporter';
import { importAllData } from '../services/backupImporter';
import { getSubscriptions, saveSubscription } from '../services/storage';

const { Text } = Typography;

export default function ImportExportPanel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [includeArticles, setIncludeArticles] = useState(false);

  // OPML Export
  async function handleExportOPML() {
    const subs = await getSubscriptions();
    if (subs.length === 0) {
      message.warning('暂无订阅源可导出');
      return;
    }
    const xml = exportOPML(subs);
    const blob = new Blob([xml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscriptions-${new Date().toISOString().slice(0,10)}.opml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('OPML 已导出');
  }

  // OPML Import
  function handleImportOPML(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const xml = ev.target?.result as string;
        const parsed = parseOPML(xml);
        if (parsed.length === 0) {
          message.warning('未找到有效的 RSS/Atom 订阅源');
          return;
        }
        
        // Preview modal
        Modal.confirm({
          title: `导入 ${parsed.length} 个订阅源`,
          content: (
            <List
              size="small"
              dataSource={parsed.slice(0, 10)}
              renderItem={item => <List.Item>{item.name} ({item.type})</List.Item>}
            />
          ),
          onOk: async () => {
            let count = 0;
            for (const sub of parsed) {
              await saveSubscription(sub as any);
              count++;
            }
            message.success(`已导入 ${count} 个订阅源`);
          },
        });
      } catch (err) {
        message.error('OPML 解析失败');
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // JSON Backup Export
  async function handleExportJSON() {
    try {
      const data = await exportAllData(includeArticles);
      downloadJSON(data, `ai-subscription-backup-${new Date().toISOString().slice(0,10)}.json`);
      message.success('备份已导出');
    } catch (err) {
      message.error('备份导出失败');
    }
  }

  // JSON Backup Import
  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.version || !data.subscriptions) {
          throw new Error('Invalid backup file');
        }
        
        Modal.confirm({
          title: '导入备份',
          content: (
            <Space direction="vertical">
              <Text>订阅源: {data.subscriptions?.length || 0} 个</Text>
              <Text>AI模型: {data.models?.length || 0} 个</Text>
              <Text>导出时间: {new Date(data.exportedAt).toLocaleString('zh-CN')}</Text>
            </Space>
          ),
          onOk: async () => {
            const result = await importAllData(data, 'merge');
            message.success(`导入完成: ${result.subscriptionsImported} 订阅, ${result.modelsImported} 模型`);
          },
        });
      } catch (err) {
        message.error('备份文件解析失败');
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* OPML Section */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>OPML 订阅源</Text>
          <Space>
            <input
              ref={fileInputRef}
              type="file"
              accept=".opml,.xml"
              style={{ display: 'none' }}
              onChange={handleImportOPML}
            />
            <Button icon={<UploadOutlined />} onClick={() => fileInputRef.current?.click()}>
              导入 OPML
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportOPML}>
              导出 OPML
            </Button>
          </Space>
        </div>
        
        {/* JSON Backup Section */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>数据备份</Text>
          <Space wrap>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportJSON}
            />
            <Button icon={<UploadOutlined />} onClick={() => jsonInputRef.current?.click()}>
              导入备份
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportJSON}>
              导出备份
            </Button>
          </Space>
        </div>
      </Space>
    </div>
  );
}
