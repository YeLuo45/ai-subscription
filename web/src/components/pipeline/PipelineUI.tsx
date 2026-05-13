'use client';

import React, { useState, useCallback } from 'react';

export interface CriticScore {
  overall: number;
  accuracy: number;
  coherence: number;
  relevance: number;
  details: string;
}

export interface PipelineEvent {
  type: 'agent_start' | 'extraction_delta' | 'summary_delta' | 'tag_delta' | 'translation_delta' | 'critic_delta' | 'agent_end' | 'done' | 'error';
  agent?: string;
  delta?: string;
  tags?: string[];
  message?: string;
  data?: CriticScore;
  error?: string;
}

export interface StageState {
  status: 'pending' | 'running' | 'done' | 'error';
  content: string;
  tags?: string[];
  fallback?: boolean; // Indicates if fallback was used
}

export interface PipelineUIState {
  status: 'idle' | 'running' | 'completed' | 'error';
  stages: {
    extract: StageState;
    summarize: StageState;
    tag: StageState;
    translate: StageState;
  };
  criticScore?: CriticScore;
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
              
            case 'critic_delta':
              if (event.data) {
                next.criticScore = event.data;
              }
              break;
              
            case 'agent_end':
              if (event.agent === 'ExtractorAgent' || event.agent === 'extractor') {
                next.stages = { ...next.stages, extract: { ...next.stages.extract, status: 'done' } };
              } else if (event.agent === 'SummarizerAgent' || event.agent === 'summarizer') {
                next.stages = { ...next.stages, summarize: { ...next.stages.summarize, status: 'done' } };
              } else if (event.agent === 'TaggerAgent' || event.agent === 'tagger' || event.agent === 'parallel_tagger_translator') {
                next.stages = { ...next.stages, tag: { ...next.stages.tag, status: 'done' } };
              } else if (event.agent === 'TranslatorAgent' || event.agent === 'translator') {
                next.stages = { ...next.stages, translate: { ...next.stages.translate, status: 'done' } };
              } else if (event.agent === 'critic') {
                // Critic agent completion is handled via critic_delta
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

      {/* Critic Score Section */}
      {state.criticScore && (
        <div className="mt-4 p-3 bg-purple-900/50 border border-purple-500 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400">📊</span>
            <span className="font-medium text-purple-300">质量评估</span>
            <span className={`ml-auto px-2 py-0.5 rounded text-xs font-medium ${
              state.criticScore.overall >= 70
                ? 'bg-green-600 text-white'
                : state.criticScore.overall >= 50
                ? 'bg-yellow-600 text-white'
                : 'bg-red-600 text-white'
            }`}>
              {state.criticScore.overall.toFixed(0)}分
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="text-center">
              <div className="text-gray-400">准确性</div>
              <div className={`font-medium ${
                state.criticScore.accuracy >= 70 ? 'text-green-400' : state.criticScore.accuracy >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {state.criticScore.accuracy.toFixed(0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">连贯性</div>
              <div className={`font-medium ${
                state.criticScore.coherence >= 70 ? 'text-green-400' : state.criticScore.coherence >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {state.criticScore.coherence.toFixed(0)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-400">相关性</div>
              <div className={`font-medium ${
                state.criticScore.relevance >= 70 ? 'text-green-400' : state.criticScore.relevance >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {state.criticScore.relevance.toFixed(0)}
              </div>
            </div>
          </div>
          {state.criticScore.overall < 50 && (
            <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
              <span>⚠️</span>
              <span>质量低于阈值，可能存在错误，建议人工复核</span>
            </div>
          )}
          {state.criticScore.overall >= 50 && state.criticScore.overall < 70 && (
            <div className="mt-2 text-xs text-yellow-300 flex items-center gap-1">
              <span>ℹ️</span>
              <span>{state.criticScore.details}</span>
            </div>
          )}
        </div>
      )}

      {/* Fallback Indicators */}
      {(state.stages.extract.fallback || state.stages.summarize.fallback || 
        state.stages.tag.fallback || state.stages.translate.fallback) && (
        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-400">🔄</span>
            <span className="font-medium text-yellow-300">使用备用方案</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {state.stages.extract.fallback && (
              <span className="px-2 py-1 bg-yellow-600/50 rounded">内容提取</span>
            )}
            {state.stages.summarize.fallback && (
              <span className="px-2 py-1 bg-yellow-600/50 rounded">智能摘要</span>
            )}
            {state.stages.tag.fallback && (
              <span className="px-2 py-1 bg-yellow-600/50 rounded">标签生成</span>
            )}
            {state.stages.translate.fallback && (
              <span className="px-2 py-1 bg-yellow-600/50 rounded">翻译</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PipelineUI;
