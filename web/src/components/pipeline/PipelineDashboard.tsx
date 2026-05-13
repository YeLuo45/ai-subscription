/**
 * PipelineDashboard Component
 * Main dashboard for monitoring multi-agent pipeline with real-time updates
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Tabs, Badge, Space, Typography, Button, Drawer } from 'antd';
import { DashboardOutlined, ReloadOutlined } from '@ant-design/icons';
import { AgentNodeCard } from './AgentNodeCard';
import { MessageFlow } from './MessageFlow';
import { ContextViewer } from './ContextViewer';
import { CriticTimeline } from './CriticTimeline';
import { messageBus } from '../../services/multi-agent/message-bus';
import { contextPool } from '../../services/multi-agent/context-pool';
import type { AgentMessage, AgentStatus, AgentId } from '../../services/multi-agent/types';
import type { CriticScore } from '../../services/multi-agent/agents/CriticAgent';

const { Text, Title } = Typography;

interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  score?: number;
}

interface EvaluationRecord {
  id: string;
  agent: string;
  score: CriticScore;
  timestamp: number;
  approved: boolean;
}

interface PipelineDashboardProps {
  open?: boolean;
  onClose?: () => void;
}

const AGENTS = [
  { id: 'coordinator', name: 'Coordinator', role: 'coordinator' as const },
  { id: 'extractor', name: 'Extractor', role: 'extractor' as const },
  { id: 'summarizer', name: 'Summarizer', role: 'summarizer' as const },
  { id: 'tagger', name: 'Tagger', role: 'tagger' as const },
  { id: 'translator', name: 'Translator', role: 'translator' as const },
  { id: 'critic', name: 'Critic', role: 'critic' as const },
];

export const PipelineDashboard: React.FC<PipelineDashboardProps> = ({ open, onClose }) => {
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({});
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);

  // Initialize agent states
  useEffect(() => {
    const initial: Record<string, AgentState> = {};
    AGENTS.forEach((agent) => {
      initial[agent.id] = {
        id: agent.id,
        name: agent.name,
        status: 'idle',
      };
    });
    setAgentStates(initial);
  }, []);

  // Subscribe to message bus events
  useEffect(() => {
    const handleMessage = (msg: AgentMessage) => {
      setMessages((prev) => [...prev.slice(-50), msg]);

      // Update agent state based on message
      setAgentStates((prev) => {
        const sourceId = msg.source.id;
        const agent = prev[sourceId] || { id: sourceId, name: msg.source.role || sourceId, status: 'idle' as AgentStatus };

        let newStatus: AgentStatus = agent.status;
        let newScore = agent.score;

        if (msg.type === 'agent_status' && typeof msg.payload === 'object') {
          const payload = msg.payload as Record<string, unknown>;
          if (payload.status) {
            newStatus = payload.status as AgentStatus;
          }
        } else if (msg.type === 'task_assigned') {
          newStatus = 'pending';
        } else if (msg.type === 'task_completed') {
          newStatus = 'completed';
        } else if (msg.type === 'error') {
          newStatus = 'failed';
        }

        if (msg.type === 'critic_result' && typeof msg.payload === 'object') {
          const payload = msg.payload as Record<string, unknown>;
          if (typeof payload.score === 'number') {
            newScore = payload.score;
          }
        }

        return {
          ...prev,
          [sourceId]: {
            ...agent,
            status: newStatus,
            score: newScore,
          },
        };
      });

      // Track critic evaluations
      if (msg.type === 'critic_result' && typeof msg.payload === 'object') {
        const payload = msg.payload as Record<string, unknown>;
        if (payload.score && typeof payload.score === 'object') {
          const score = payload.score as CriticScore;
          const evaluation: EvaluationRecord = {
            id: msg.id,
            agent: msg.source.role || msg.source.id,
            score,
            timestamp: msg.timestamp,
            approved: score.overall >= 50,
          };
          setEvaluations((prev) => [...prev.slice(-20), evaluation]);
        }
      }
    };

    // Subscribe to all message types
    const types: Array<keyof typeof import('../../services/multi-agent/types').AgentMessageType> = [
      'extraction_result', 'summary_result', 'tag_result', 'translation_result',
      'critic_result', 'agent_status', 'error', 'task_assigned', 'task_completed',
    ];

    const unsubscribers = types.map((type) =>
      messageBus.subscribe(type as any, handleMessage as any)
    );

    // Also load existing history
    const history = messageBus.getHistory();
    setMessages(history);

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  // Subscribe to context pool changes
  useEffect(() => {
    const contexts = contextPool.getAllContexts();
    contexts.forEach((ctx) => {
      setAgentStates((prev) => {
        const agentId = ctx.agent.id;
        const agent = prev[agentId] || { id: agentId, name: ctx.agent.role || agentId, status: 'idle' };
        return {
          ...prev,
          [agentId]: {
            ...agent,
            status: ctx.status,
            score: ctx.score,
          },
        };
      });
    });
  }, []);

  const handleReset = useCallback(() => {
    messageBus.clearHistory();
    contextPool.clear();
    setMessages([]);
    setEvaluations([]);
    setAgentStates((prev) => {
      const reset: Record<string, AgentState> = {};
      Object.keys(prev).forEach((key) => {
        reset[key] = { ...prev[key], status: 'idle', score: undefined };
      });
      return reset;
    });
  }, []);

  const tabItems = [
    {
      key: 'agents',
      label: <Badge count={Object.values(agentStates).filter((a) => a.status === 'running').length} offset={[10, 0]}>Agent状态</Badge>,
      children: (
        <Row gutter={[12, 12]}>
          {AGENTS.map((agent) => {
            const state = agentStates[agent.id] || { id: agent.id, name: agent.name, status: 'idle' as AgentStatus };
            return (
              <Col key={agent.id} xs={12} sm={8} md={6}>
                <AgentNodeCard
                  agentId={state.id}
                  agentName={state.name}
                  status={state.status}
                  criticScore={state.score}
                />
              </Col>
            );
          })}
        </Row>
      ),
    },
    {
      key: 'messages',
      label: <Badge count={messages.length} offset={[10, 0]}>消息流</Badge>,
      children: <MessageFlow messages={messages} />,
    },
    {
      key: 'context',
      label: '上下文',
      children: <ContextViewer pool={contextPool} />,
    },
    {
      key: 'evaluations',
      label: <Badge count={evaluations.length} offset={[10, 0]}>评估</Badge>,
      children: <CriticTimeline evaluations={evaluations} />,
    },
  ];

  return (
    <Drawer
      title={
        <Space>
          <DashboardOutlined />
          <span>Pipeline Dashboard</span>
        </Space>
      }
      placement="right"
      width={720}
      onClose={onClose}
      open={open}
      extra={
        <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
          重置
        </Button>
      }
    >
      <Tabs items={tabItems} defaultActiveKey="agents" />
    </Drawer>
  );
};

export default PipelineDashboard;
