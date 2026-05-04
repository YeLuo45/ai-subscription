import { Button, Space, message, Tooltip } from 'antd';
import { TwitterOutlined, SendOutlined, WechatOutlined, CopyOutlined } from '@ant-design/icons';
import { getTwitterShareUrl, getTelegramShareUrl, copyToClipboard } from '../services/shareUtils';

interface SharePanelProps {
  content: string;       // The text content to share
  title?: string;        // Optional title
  url?: string;          // Optional URL to share
  disabled?: boolean;
}

export default function SharePanel({ content, title, url, disabled }: SharePanelProps) {
  const maxLength = 280; // Twitter limit
  const truncatedContent = content.length > maxLength 
    ? content.slice(0, maxLength - 3) + '...' 
    : content;

  function handleTwitter() {
    const shareUrl = getTwitterShareUrl(truncatedContent, url);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  function handleTelegram() {
    const shareUrl = getTelegramShareUrl(truncatedContent, url);
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  async function handleWechat() {
    const success = await copyToClipboard(content);
    if (success) {
      message.success('已复制到剪贴板，请在微信中粘贴');
    } else {
      message.error('复制失败');
    }
  }

  async function handleCopy() {
    const success = await copyToClipboard(content);
    if (success) {
      message.success('已复制到剪贴板');
    } else {
      message.error('复制失败');
    }
  }

  if (disabled) return null;

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
      <Space size="small">
        <Tooltip title="分享到 Twitter/X">
          <Button 
            size="small" 
            icon={<TwitterOutlined />} 
            onClick={handleTwitter}
          >
            Twitter
          </Button>
        </Tooltip>
        <Tooltip title="分享到 Telegram">
          <Button 
            size="small" 
            icon={<SendOutlined />} 
            onClick={handleTelegram}
          >
            Telegram
          </Button>
        </Tooltip>
        <Tooltip title="复制内容（微信分享）">
          <Button 
            size="small" 
            icon={<WechatOutlined />} 
            onClick={handleWechat}
          >
            微信
          </Button>
        </Tooltip>
        <Tooltip title="复制原文">
          <Button 
            size="small" 
            icon={<CopyOutlined />} 
            onClick={handleCopy}
          >
            复制
          </Button>
        </Tooltip>
      </Space>
    </div>
  );
}
