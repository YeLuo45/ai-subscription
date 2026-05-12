/**
 * ArticleDetail Component
 * Displays article details with translation support and AI processing pipeline
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Space, Typography, Divider, Switch, message } from 'antd';
import { GlobalOutlined, EditOutlined, ApartmentOutlined, RobotOutlined } from '@ant-design/icons';
import { LanguageBadge } from './LanguageBadge';
import { KnowledgeGraphPanel } from './KnowledgeGraphPanel';
import { ArticleProcessResult, type ArticleProcessResult } from './article/ArticleProcessResult';
import { PipelineUI, type PipelineUIState } from './pipeline/PipelineUI';
import { useTranslation } from '../hooks/useTranslation';
import { detectLanguage, type Language } from '../lib/languageDetect';
import { runPipeline, type PipelineEvent } from '../services/pipeline/pipeline';
import { message as antMessage } from 'antd';

const { Title, Text, Paragraph } = Typography;

interface Article {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  feedId: string;
  content?: string;
}

interface ArticleDetailProps {
  article: Article | null;
  open: boolean;
  onClose: () => void;
}

type PipelineState = 'idle' | 'running' | 'done';

export const ArticleDetail: React.FC<ArticleDetailProps> = ({ article, open, onClose }) => {
  const [showTranslation, setShowTranslation] = useState(false);
  const [knowledgeGraphOpen, setKnowledgeGraphOpen] = useState(false);
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle');
  const [processResult, setProcessResult] = useState<ArticleProcessResult | null>(null);
  const [pipelineUIState, setPipelineUIState] = useState<PipelineUIState | null>(null);
  const pipelineResultRef = useRef<{
    summary: string;
    tags: string[];
    translatedContent?: string;
  } | null>(null);

  const { translating, translation, sourceLang, translate, clearTranslation } = useTranslation();

  // Reset state when article changes
  useEffect(() => {
    if (!open) {
      clearTranslation();
      setShowTranslation(false);
      setKnowledgeGraphOpen(false);
      setPipelineState('idle');
      setProcessResult(null);
      setPipelineUIState(null);
      pipelineResultRef.current = null;
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
    setPipelineState('idle');
    onClose();
  };

  // Handle AI process button click
  const handleProcessClick = useCallback(async () => {
    if (!article) return;

    setPipelineState('running');
    pipelineResultRef.current = { summary: '', tags: [], translatedContent: undefined };

    // Initialize pipeline UI state
    setPipelineUIState({
      status: 'running',
      stages: {
        extract: { status: 'running', content: '' },
        summarize: { status: 'pending', content: '' },
        tag: { status: 'pending', content: '', tags: [] },
        translate: { status: 'pending', content: '' },
      },
    });

    try {
      const pipelineArticle = {
        title: article.title,
        content: article.content || article.description,
        description: article.description,
      };

      for await (const event of runPipeline(pipelineArticle)) {
        // Update pipeline UI state based on events
        setPipelineUIState(prev => {
          if (!prev) return prev;
          const next = { ...prev };

          switch (event.type) {
            case 'agent_start':
              break;
            case 'extraction_delta':
              next.stages = {
                ...prev.stages,
                extract: { status: 'done', content: event.data.summary },
              };
              break;
            case 'summary_delta':
              next.stages = {
                ...prev.stages,
                summarize: { status: 'done', content: event.data.keyPoints.join('\n') },
              };
              pipelineResultRef.current!.summary = event.data.keyPoints.join('\n');
              break;
            case 'tag_delta':
              next.stages = {
                ...prev.stages,
                tag: { status: 'done', content: '', tags: event.data.tags },
              };
              pipelineResultRef.current!.tags = event.data.tags;
              break;
            case 'translation_delta':
              next.stages = {
                ...prev.stages,
                translate: { 
                  status: 'done', 
                  content: event.data.translatedTitle + '\n\n' + event.data.translatedDescription,
                },
              };
              pipelineResultRef.current!.translatedContent = 
                event.data.translatedTitle + '\n\n' + event.data.translatedDescription;
              break;
            case 'agent_end':
              if (event.agent === 'ExtractorAgent') {
                next.stages = { ...next.stages, extract: { ...next.stages.extract, status: 'done' } };
              } else if (event.agent === 'SummarizerAgent') {
                next.stages = { ...next.stages, summarize: { ...next.stages.summarize, status: 'done' } };
              } else if (event.agent === 'TaggerAgent') {
                next.stages = { ...next.stages, tag: { ...next.stages.tag, status: 'done' } };
              } else if (event.agent === 'TranslatorAgent') {
                next.stages = { ...next.stages, translate: { ...next.stages.translate, status: 'done' } };
              }
              break;
            case 'done':
              next.status = 'completed';
              break;
            case 'error':
              next.status = 'error';
              next.error = event.error;
              break;
          }
          return next;
        });
      }

      // Set final result
      const result = {
        ...pipelineResultRef.current!,
        processedAt: Date.now(),
      };
      
      // Persist to localStorage
      localStorage.setItem(`ai_result_${article.id}`, JSON.stringify(result));
      
      setProcessResult(result);
      setPipelineState('done');
      antMessage.success('AI处理完成');
    } catch (err) {
      setPipelineState('idle');
      antMessage.error(err instanceof Error ? err.message : 'AI处理失败');
    }
  }, [article]);

  const handleDismissResult = useCallback(() => {
    setProcessResult(null);
    setPipelineState('idle');
    setPipelineUIState(null);
    pipelineResultRef.current = null;
  }, []);

  // Load persisted AI result when article opens
  useEffect(() => {
    if (article && open) {
      const stored = localStorage.getItem(`ai_result_${article.id}`);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setProcessResult(parsed);
          setPipelineState('done');
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [article, open]);

  if (!article) return null;

  return (
    <>
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
          <Button 
            icon={<ApartmentOutlined />}
            onClick={() => setKnowledgeGraphOpen(true)}
          >
            知识图谱
          </Button>
          <Button 
            type="dashed"
            icon={<RobotOutlined />}
            onClick={handleProcessClick}
            loading={pipelineState === 'running'}
            disabled={pipelineState === 'running'}
          >
            AI处理
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

        {/* Pipeline UI Panel (shown when running) */}
        {pipelineState === 'running' && pipelineUIState && (
          <div style={{ marginTop: 16 }}>
            <Divider style={{ margin: '12px 0' }} />
            <PipelineUI initialState={pipelineUIState} />
          </div>
        )}

        {/* Process Result (shown when done) */}
        {processResult && (
          <ArticleProcessResult result={processResult} onDismiss={handleDismissResult} />
        )}
      </div>
    </Modal>

    {/* Knowledge Graph Panel */}
    <KnowledgeGraphPanel
      article={article}
      open={knowledgeGraphOpen}
      onClose={() => setKnowledgeGraphOpen(false)}
    />
    </>
  );
};

export default ArticleDetail;
