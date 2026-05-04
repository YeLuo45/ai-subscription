/**
 * ToolCallDisplay Component
 * React component for displaying tool calls and their results in the UI
 */

import React from 'react';

interface ToolCallState {
  toolName: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  status: 'calling' | 'done' | 'error';
}

interface ToolCallDisplayProps {
  toolCalls: ToolCallState[];
}

export const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ toolCalls }) => {
  if (toolCalls.length === 0) {
    return null;
  }

  return (
    <div className="tool-call-container">
      {toolCalls.map((tc, i) => (
        <div key={i} className={`tool-call tool-call--${tc.status}`}>
          <div className="tool-call__header">
            <span className="tool-call__icon">
              {tc.status === 'calling' ? '⚙️' : tc.status === 'done' ? '✅' : '❌'}
            </span>
            <span className="tool-call__name">{tc.toolName}</span>
          </div>
          <div className="tool-call__params">
            <code>{JSON.stringify(tc.params, null, 2)}</code>
          </div>
          {tc.result && (
            <div className="tool-call__result">
              <pre>{JSON.stringify(tc.result, null, 2)}</pre>
            </div>
          )}
          {tc.error && (
            <div className="tool-call__error">{tc.error}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export type { ToolCallState };
