'use client';

import React from 'react';

export interface StageOutputProps {
  label: string;
  content: string;
  tags?: string[];
  status: 'pending' | 'running' | 'done' | 'error';
  isStreaming?: boolean;
}

export function StageOutput({ label, content, tags, status, isStreaming }: StageOutputProps) {
  const statusColors = {
    pending: 'text-gray-500',
    running: 'text-yellow-400',
    done: 'text-green-400',
    error: 'text-red-400',
  };

  const statusIcons = {
    pending: '○',
    running: '...',
    done: '✓',
    error: '✗',
  };

  const borderColors = {
    pending: 'border-gray-700',
    running: 'border-yellow-600',
    done: 'border-green-600',
    error: 'border-red-600',
  };

  return (
    <div className={`stage p-3 rounded border ${borderColors[status]} bg-gray-800/50`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={statusColors[status]}>{statusIcons[status]}</span>
        <span className="font-medium text-white">{label}</span>
        {isStreaming && status === 'running' && (
          <span className="animate-pulse text-xs text-yellow-400">处理中</span>
        )}
      </div>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag, i) => (
            <span key={i} className="px-2 py-1 bg-blue-600 rounded text-xs text-white">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
        {content || (status === 'running' ? `${label}中...` : '')}
      </div>
    </div>
  );
}

export default StageOutput;
