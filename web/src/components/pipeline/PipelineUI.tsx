'use client';

import React, { useState, useCallback } from 'react';

export interface PipelineEvent {
  type: 'agent_start' | 'extraction_delta' | 'summary_delta' | 'tag_delta' | 'translation_delta' | 'agent_end' | 'done' | 'error';
  agent?: string;
  delta?: string;
  tags?: string[];
  message?: string;
}

export interface StageState {
  status: 'pending' | 'running' | 'done' | 'error';
  content: string;
  tags?: string[];
}

export interface PipelineUIState {
  status: 'idle' | 'running' | 'completed' | 'error';
  stages: {
    extract: StageState;
    summarize: StageState;
    tag: StageState;
    translate: StageState;
  };
  error?: string;
}

interface PipelineUIProps {
  articleId?: string;
  onProcess?: (articleId: string) => AsyncGenerator<PipelineEvent, void, unknown>;
  initialState?: PipelineUIState;
}

const initialState: PipelineUIState = {
  status: 'idle',
  stages: {
    extract: { status: 'pending', content: '' },
    summarize: { status: 'pending', content: '' },
    tag: { status: 'pending', content: '', tags: [] },
    translate: { status: 'pending', content: '' },
  },
};

export function PipelineUI({ articleId, onProcess, initialState: initial }: PipelineUIProps) {
  const [state, setState] = useState<PipelineUIState>(initial || initialState);
  const [currentStage, setCurrentStage] = useState<string>('');

  const handleProcess = useCallback(async () => {
    if (!articleId || !onProcess) return;

    setState({
      status: 'running',
      stages: {
        extract: { status: 'running', content: '' },
        summarize: { status: 'pending', content: '' },
        tag: { status: 'pending', content: '', tags: [] },
        translate: { status: 'pending', content: '' },
      },
    });

    try {
      const pipeline = onProcess(articleId);
      
      for await (const event of pipeline) {
        setState(prev => {
          const next = { ...prev };
          
          switch (event.type) {
            case 'agent_start':
              setCurrentStage(event.agent || '');
              break;
              
            case 'extraction_delta':
              next.stages = {
                ...prev.stages,
                extract: {
                  ...prev.stages.extract,
                  content: prev.stages.extract.content + (event.delta || ''),
                },
              };
              break;
              
            case 'summary_delta':
              next.stages = {
                ...prev.stages,
                summarize: {
                  ...prev.stages.summarize,
                  content: prev.stages.summarize.content + (event.delta || ''),
                },
              };
              break;
              
            case 'tag_delta':
              next.stages = {
                ...prev.stages,
                tag: {
                  ...prev.stages.tag,
                  tags: event.tags || [],
                  status: 'done',
                },
              };
              break;
              
            case 'translation_delta':
              next.stages = {
                ...prev.stages,
                translate: {
                  ...prev.stages.translate,
                  content: prev.stages.translate.content + (event.delta || ''),
                },
              };
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
              next.error = event.message;
              break;
          }
          
          return next;
        });
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  }, [articleId, onProcess]);

  const handleReset = useCallback(() => {
    setState(initialState);
    setCurrentStage('');
  }, []);

  const getStageStatusColor = (status: StageState['status']) => {
    switch (status) {
      case 'done': return 'text-green-400';
      case 'running': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-500';
    }
  };

  const getStageStatusIcon = (status: StageState['status']) => {
    switch (status) {
      case 'done': return '✓';
      case 'running': return '...';
      case 'error': return '✗';
      default: return '○';
    }
  };

  return (
    <div className="pipeline-ui p-4 bg-gray-900 rounded-lg text-white">
      <div className="header flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">文章处理流水线</h3>
        <div className="flex gap-2">
          {state.status === 'idle' && (
            <button
              onClick={handleProcess}
              disabled={!articleId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-sm"
            >
              开始处理
            </button>
          )}
          {state.status === 'running' && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
            >
              取消
            </button>
          )}
          {(state.status === 'completed' || state.status === 'error') && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-sm"
            >
              重置
            </button>
          )}
        </div>
      </div>

      {currentStage && state.status === 'running' && (
        <div className="current-stage mb-4 text-sm text-yellow-400">
          当前阶段: {currentStage}
        </div>
      )}

      <div className="stages space-y-3">
        {/* Extraction Stage */}
        <div className={`stage p-3 rounded border ${state.stages.extract.status === 'error' ? 'border-red-500' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={getStageStatusColor(state.stages.extract.status)}>
              {getStageStatusIcon(state.stages.extract.status)}
            </span>
            <span className="font-medium">内容提取</span>
          </div>
          <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {state.stages.extract.content || (state.stages.extract.status === 'running' ? '提取中...' : '')}
          </div>
        </div>

        {/* Summarization Stage */}
        <div className={`stage p-3 rounded border ${state.stages.summarize.status === 'error' ? 'border-red-500' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={getStageStatusColor(state.stages.summarize.status)}>
              {getStageStatusIcon(state.stages.summarize.status)}
            </span>
            <span className="font-medium">智能摘要</span>
          </div>
          <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {state.stages.summarize.content || (state.stages.summarize.status === 'running' ? '摘要生成中...' : '')}
          </div>
        </div>

        {/* Tagging Stage */}
        <div className={`stage p-3 rounded border ${state.stages.tag.status === 'error' ? 'border-red-500' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={getStageStatusColor(state.stages.tag.status)}>
              {getStageStatusIcon(state.stages.tag.status)}
            </span>
            <span className="font-medium">标签生成</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.stages.tag.tags?.map((tag, i) => (
              <span key={i} className="px-2 py-1 bg-blue-600 rounded text-xs">
                {tag}
              </span>
            ))}
            {state.stages.tag.status === 'running' && (
              <span className="text-gray-400 text-sm">生成中...</span>
            )}
          </div>
        </div>

        {/* Translation Stage */}
        <div className={`stage p-3 rounded border ${state.stages.translate.status === 'error' ? 'border-red-500' : 'border-gray-700'}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className={getStageStatusColor(state.stages.translate.status)}>
              {getStageStatusIcon(state.stages.translate.status)}
            </span>
            <span className="font-medium">翻译</span>
          </div>
          <div className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
            {state.stages.translate.content || (state.stages.translate.status === 'running' ? '翻译中...' : '')}
          </div>
        </div>
      </div>

      {state.error && (
        <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300 text-sm">
          错误: {state.error}
        </div>
      )}

      {state.status === 'completed' && (
        <div className="mt-4 p-3 bg-green-900/50 border border-green-500 rounded text-green-300 text-sm">
          处理完成 ✓
        </div>
      )}
    </div>
  );
}

export default PipelineUI;
