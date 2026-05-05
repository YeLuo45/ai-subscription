/**
 * ArticleDetail Component
 * Displays article details with translation support
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Divider, Switch, message } from 'antd';
import { GlobalOutlined, EditOutlined } from '@ant-design/icons';
import { LanguageBadge } from './LanguageBadge';
import { useTranslation } from '../hooks/useTranslation';
import { detectLanguage, type Language } from '../lib/languageDetect';

const { Title, Text, Paragraph } = Typography;

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  feedId: string;
}

interface ArticleDetailProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, open, onClose }) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const { translating, translation, sourceLang, translate, clearTranslation } = useTranslation();

  // Reset state when article changes
  useEffect(() => {
    if (!open) {
      clearTranslation();
      setShowTranslation(false);
    }
  }, [open, clearTranslation]);

  // Detect language when article loads
  const [detectedLang, setDetectedLang] = useState<Language>('EN');

  useEffect(() => {
    if (article) {
      const lang = detectLanguage(article.title + ' ' + article.description);
      setDetectedLang(lang);
    }
  }, [article]);

  const handleTranslate = async () => {
    if (!article) return;
    
    const result = await translate(article.id, article.title, article.description);
    if (result) {
      setShowTranslation(true);
    }
  };

  const handleToggleTranslation = (checked: boolean) => {
    setShowTranslation(checked);
  };

  const handleClose = () => {
    clearTranslation();
    setShowTranslation(false);
    onClose();
  };

  if (!article) return null;

  return (
    <Modal
      title={
        <Space>
          <GlobalOutlined />
          <span>文章详情</span>
          <LanguageBadge lang={detectedLang} />
        </Space>
      }
      open={open}
      onCancel={handleClose}
      width={700}
      footer={
        <Space>
          <Button onClick={handleClose}>关闭</Button>
          <Button 
            type="primary" 
            icon={<GlobalOutlined />}
            loading={translating}
            onClick={handleTranslate}
          >
            翻译
          </Button>
        </Space>
      }
    >
      <div style={{ padding: '16px 0' }}>
        {/* Original Content */}
        <div style={{ marginBottom: showTranslation ? 24 : 0 }}>
          <Title level={4}>{article.title}</Title>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            发布日期: {article.pubDate} | 
            <a href={article.link} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8 }}>
              查看原文
            </a>
          </Text>
          <Divider style={{ margin: '12px 0' }} />
          <Paragraph ellipsis={{ rows: 4, expandable: true }}>
            {article.description}
          </Paragraph>
        </div>

        {/* Translation Section */}
        {showTranslation && translation && (
          <>
            <Divider orientation="left">
              <Space>
                <GlobalOutlined />
                <span>翻译 ({detectedLang} → ZH)</span>
                <Switch 
                  size="small" 
                  checked={showTranslation} 
                  onChange={handleToggleTranslation}
                />
              </Space>
            </Divider>
            <div style={{ 
              backgroundColor: '#f5f5f5', 
              padding: 16, 
              borderRadius: 8,
              marginTop: 8
            }}>
              <Title level={5}>{translation.title}</Title>
              <Paragraph>{translation.description}</Paragraph>
            </div>
          </>
        )}

        {/* Toggle Translation Switch (shown when translation exists) */}
        {translation && !showTranslation && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Switch 
              checkedChildren="显示原文" 
              unCheckedChildren="显示译文"
              checked={showTranslation} 
              onChange={handleToggleTranslation}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ArticleDetail;
