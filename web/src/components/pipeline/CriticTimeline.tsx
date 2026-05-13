/**
 * CriticTimeline Component
 * Displays a timeline of critic scores with color coding
 * Green ≥70, Yellow ≥50, Red <50
 */

import React from 'react';
import { Timeline, Progress, Tag, Typography } from 'antd';
import type { CriticScore } from '../../services/multi-agent/agents/CriticAgent';

const { Text } = Typography;

interface Evaluation {
  id: string;
  agent: string;
  score: CriticScore;
  timestamp: number;
  approved: boolean;
}

interface CriticTimelineProps {
  evaluations: Evaluation[];
}

const getScoreColor = (score: number): string => {
  if (score >= 70) return '#52c41a';
  if (score >= 50) return '#faad14';
  return '#ff4d4f';
};

const getScoreStatus = (score: number): 'success' | 'normal' | 'exception' => {
  if (score >= 70) return 'success';
  if (score >= 50) return 'normal';
  return 'exception';
};

const ScoreBar: React.FC<{ score: number; label: string }> = ({ score, label }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>{label}</Text>
      <Text style={{ fontSize: 12, color: getScoreColor(score) }}>{score}</Text>
    </div>
    <Progress
      percent={score}
      showInfo={false}
      status={getScoreStatus(score)}
      strokeColor={getScoreColor(score)}
      size="small"
    />
  </div>
);

export const CriticTimeline: React.FC<CriticTimelineProps> = ({ evaluations }) => {
  if (evaluations.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Text type="secondary">暂无评估记录</Text>
      </div>
    );
  }

  const items = evaluations.slice(-10).reverse().map((eval_) => ({
    key: eval_.id,
    color: getScoreColor(eval_.score.overall),
    children: (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Tag color={eval_.approved ? 'success' : 'warning'}>
            {eval_.approved ? '通过' : '需改进'}
          </Tag>
          <Text strong>{eval_.agent}</Text>
          <Tag color={getScoreColor(eval_.score.overall)} style={{ marginLeft: 'auto' }}>
            总分: {eval_.score.overall}
          </Tag>
        </div>

        <div style={{ paddingLeft: 8, borderLeft: '2px solid #f0f0f0' }}>
          <ScoreBar score={eval_.score.accuracy} label="准确性" />
          <ScoreBar score={eval_.score.coherence} label="连贯性" />
          <ScoreBar score={eval_.score.relevance} label="相关性" />
        </div>

        {eval_.score.details && (
          <div style={{ marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {eval_.score.details}
            </Text>
          </div>
        )}

        <div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {new Date(eval_.timestamp).toLocaleTimeString()}
          </Text>
        </div>
      </div>
    ),
  }));

  return (
    <div style={{ maxHeight: 400, overflow: 'auto' }}>
      <Timeline items={items} />
    </div>
  );
};

export default CriticTimeline;
