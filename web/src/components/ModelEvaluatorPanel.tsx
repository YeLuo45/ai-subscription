// Model Evaluator Panel - Multi-model comparison interface
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Button, Space, Typography, Tag, Select, Checkbox, Divider, List, Spin, message, Alert } from 'antd';
import { 
  PlayCircleOutlined, 
  HistoryOutlined, 
  CheckCircleOutlined,
  StarOutlined,
  DollarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { runEvaluation, recommendBestModel } from '../services/model-evaluator/evaluator';
import { saveEvaluation, getEvaluationHistory, deleteEvaluation } from '../services/model-evaluator/history';
import { TASK_LABELS, DEFAULT_EVAL_MODELS, type EvaluationTaskType, type EvaluationResult, type ModelOutput } from '../services/model-evaluator/types';
import { getArticles } from '../services/storage';

const { Title, Text, Paragraph } = Typography;

const ALL_MODELS = [
  { modelId: 'gpt-4o', providerId: 'openai', label: 'GPT-4o' },
  { modelId: 'claude-3-5-sonnet-20241022', providerId: 'anthropic', label: 'Claude 3.5 Sonnet' },
  { modelId: 'gemini-2.5-pro-preview-06-05', providerId: 'google', label: 'Gemini 2.5 Pro' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const ModelEvaluatorPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [articles, setArticles] = useState<Array<{id: string; title: string; content?: string}>>([]);
  const [selectedArticleId, setSelectedArticleId] = useState<string>('');
  const [taskType, setTaskType] = useState<EvaluationTaskType>('structured-summary');
  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-2.5-pro-preview-06-05']);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ModelOutput[]>([]);
  const [history, setHistory] = useState<EvaluationResult[]>([]);
  const [activeTab, setActiveTab] = useState<'evaluate' | 'history'>('evaluate');
  const [recommendedModel, setRecommendedModel] = useState<string>('');

  const loadArticles = useCallback(async () => {
    try {
      const arts = await getArticles('', 100);
      setArticles(arts.map(a => ({ id: a.id || String(a.url), title: a.title || a.url || 'Untitled', content: a.content })));
    } catch (error) {
      console.error('[ModelEvaluator] Failed to load articles:', error);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const hist = await getEvaluationHistory(20);
      setHistory(hist);
    } catch (error) {
      console.error('[ModelEvaluator] Failed to load history:', error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadArticles();
      loadHistory();
    }
  }, [isOpen, loadArticles, loadHistory]);

  const handleRunEvaluation = async () => {
    if (!selectedArticleId) {
      message.warning('Please select an article');
      return;
    }
    if (selectedModels.length < 2) {
      message.warning('Please select at least 2 models to compare');
      return;
    }

    const article = articles.find(a => a.id === selectedArticleId);
    if (!article?.content) {
      message.error('Article content is empty');
      return;
    }

    setRunning(true);
    setResults([]);
    setRecommendedModel('');

    try {
      const modelConfigs = ALL_MODELS
        .filter(m => selectedModels.includes(m.modelId))
        .map(m => ({ modelId: m.modelId, providerId: m.providerId }));

      const outputs = await runEvaluation({
        models: modelConfigs,
        taskType,
        articleContent: article.content,
      });

      setResults(outputs);
      const recommended = recommendBestModel(outputs);
      setRecommendedModel(recommended);

      // Save to history
      const historyEntry: EvaluationResult = {
        id: `eval-${Date.now()}`,
        articleId: selectedArticleId,
        articleTitle: article.title,
        taskType,
        outputs,
        recommendedModelId: recommended,
        totalCostUSD: outputs.reduce((sum, o) => sum + (o.costUSD || 0), 0),
        totalTokens: outputs.reduce((sum, o) => sum + (o.usage?.totalTokens || 0), 0),
        createdAt: Date.now(),
      };
      await saveEvaluation(historyEntry);
      loadHistory();
      message.success('Evaluation complete');
    } catch (error) {
      message.error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  const getScoreColor = (score?: number): string => {
    if (!score) return '#999';
    if (score >= 4.5) return '#52c41a';
    if (score >= 3.5) return '#1890ff';
    if (score >= 2.5) return '#faad14';
    return '#ff4d4f';
  };

  const renderModelCard = (output: ModelOutput) => {
    const isRecommended = output.modelId === recommendedModel;
    const modelInfo = ALL_MODELS.find(m => m.modelId === output.modelId);
    
    return (
      <Card
        key={output.modelId}
        size="small"
        title={
          <Space>
            <Text strong>{modelInfo?.label || output.modelId}</Text>
            {isRecommended && <Tag color="green">Recommended</Tag>}
            {output.text.startsWith('Error:') && <Tag color="red">Error</Tag>}
          </Space>
        }
        style={{ 
          height: '100%',
          borderColor: isRecommended ? '#52c41a' : undefined,
        }}
      >
        <div style={{ maxHeight: 300, overflow: 'auto' }}>
          <Paragraph 
            ellipsis={{ rows: 8, expandable: true, symbol: 'more' }}
            style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}
          >
            {output.text}
          </Paragraph>
        </div>
        
        <Divider style={{ margin: '12px 0' }} />
        
        <Space direction="vertical" style={{ width: '100%' }} size={4}>
          {output.qualityScore && (
            <Space>
              <StarOutlined style={{ color: getScoreColor(output.qualityScore) }} />
              <Text style={{ color: getScoreColor(output.qualityScore) }}>
                Quality: {output.qualityScore}/5
              </Text>
            </Space>
          )}
          {output.usage && (
            <Space>
              <CheckCircleOutlined />
              <Text type="secondary">
                Tokens: {output.usage.totalTokens.toLocaleString()}
              </Text>
            </Space>
          )}
          {output.costUSD !== undefined && (
            <Space>
              <DollarOutlined />
              <Text type="secondary">
                Cost: ${output.costUSD.toFixed(4)}
              </Text>
            </Space>
          )}
          {output.latencyMs && (
            <Space>
              <ClockCircleOutlined />
              <Text type="secondary">
                Latency: {output.latencyMs}ms
              </Text>
            </Space>
          )}
        </Space>
      </Card>
    );
  };

  const renderEvaluateTab = () => (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={24}>
          <Card size="small">
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Select Article</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Choose an article to evaluate"
                  value={selectedArticleId || undefined}
                  onChange={setSelectedArticleId}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                  options={articles.map(a => ({ value: a.id, label: a.title }))}
                />
              </div>
              
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Task Type</Text>
                <Select
                  style={{ width: '100%' }}
                  value={taskType}
                  onChange={setTaskType}
                  options={Object.entries(TASK_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </div>
              
              <div>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>Models to Compare</Text>
                <Checkbox.Group
                  value={selectedModels}
                  onChange={(values) => setSelectedModels(values as string[])}
                  style={{ width: '100%' }}
                >
                  <Space direction="vertical">
                    {ALL_MODELS.map(m => (
                      <Checkbox key={m.modelId} value={m.modelId}>
                        {m.label}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </div>
              
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={running}
                onClick={handleRunEvaluation}
                disabled={!selectedArticleId || selectedModels.length < 2}
                block
              >
                Run Evaluation
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>

      {running && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" tip="Running multi-model evaluation..." />
        </div>
      )}

      {results.length > 0 && !running && (
        <>
          <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
            <Col span={24}>
              <Alert
                type="info"
                message={
                  <Space>
                    <Text>Total Cost: </Text>
                    <Text strong>${results.reduce((s, o) => s + (o.costUSD || 0), 0).toFixed(4)}</Text>
                    <Text type="secondary"> | </Text>
                    <Text>Total Tokens: </Text>
                    <Text strong>{results.reduce((s, o) => s + (o.usage?.totalTokens || 0), 0).toLocaleString()}</Text>
                  </Space>
                }
              />
            </Col>
          </Row>
          
          <Row gutter={[8, 8]}>
            {results.map(output => (
              <Col span={24 / Math.min(results.length, 3)} key={output.modelId} style={{ minWidth: 300 }}>
                {renderModelCard(output)}
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <List
      size="small"
      dataSource={history}
      locale={{ emptyText: 'No evaluation history' }}
      renderItem={(item) => (
        <List.Item
          actions={[
            <Button 
              key="delete" 
              type="link" 
              size="small"
              danger
              onClick={() => deleteEvaluation(item.id).then(loadHistory)}
            >
              Delete
            </Button>
          ]}
        >
          <List.Item.Meta
            title={
              <Space>
                <Text>{item.articleTitle}</Text>
                <Tag>{TASK_LABELS[item.taskType as EvaluationTaskType]}</Tag>
              </Space>
            }
            description={
              <Space direction="vertical" size={0}>
                <Text type="secondary">
                  {item.outputs.length} models · ${item.totalCostUSD.toFixed(4)} · {new Date(item.createdAt).toLocaleString()}
                </Text>
                <Text type="secondary">
                  Recommended: {ALL_MODELS.find(m => m.modelId === item.recommendedModelId)?.label || item.recommendedModelId}
                </Text>
              </Space>
            }
          />
        </List.Item>
      )}
    />
  );

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button 
          type={activeTab === 'evaluate' ? 'primary' : 'default'}
          onClick={() => setActiveTab('evaluate')}
          icon={<PlayCircleOutlined />}
        >
          Evaluate
        </Button>
        <Button 
          type={activeTab === 'history' ? 'primary' : 'default'}
          onClick={() => setActiveTab('history')}
          icon={<HistoryOutlined />}
        >
          History
        </Button>
      </Space>

      {activeTab === 'evaluate' ? renderEvaluateTab() : renderHistoryTab()}
    </div>
  );
};

export default ModelEvaluatorPanel;
