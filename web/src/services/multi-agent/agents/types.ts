/**
 * Multi-Agent System Types
 * Core type definitions for the agent hierarchy
 */

/**
 * Agent status enum
 */
export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Agent role enum
 */
export enum AgentRole {
  COORDINATOR = 'coordinator',
  SPECIALIST = 'specialist',
  CRITIC = 'critic',
  PIPELINE = 'pipeline',
}

/**
 * Pipeline agent type enum
 */
export enum PipelineAgentType {
  EXTRACTOR = 'extractor',
  SUMMARIZER = 'summarizer',
  TAGGER = 'tagger',
  TRANSLATOR = 'translator',
}

/**
 * Agent message interface for inter-agent communication
 */
export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'task' | 'result' | 'error' | 'status' | 'heartbeat';
  payload: unknown;
  timestamp: number;
  traceId?: string;
}

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Base agent state interface
 */
export interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  currentTask?: string;
  lastError?: string;
  messageCount: number;
  startTime?: number;
}

/**
 * Task interface for agent task distribution
 */
export interface AgentTask {
  id: string;
  type: string;
  description: string;
  inputs: Record<string, unknown>;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: unknown;
  dependencies?: string[];
  createdAt: number;
  completedAt?: number;
}

/**
 * Agent result wrapper
 */
export interface AgentResult<T = unknown> {
  agent: string;
  data: T;
  success: boolean;
  error?: string;
  duration?: number;
}
