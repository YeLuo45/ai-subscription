/**
 * useKnowledgeGraph Hook
 * Manages knowledge graph extraction, caching, and state
 */

import { useState, useCallback } from 'react';
import { callLLM } from '../../../shared/lib/ai/llm';
import type { KnowledgeGraph, Entity, Relation, KnowledgeGraphExtracted } from '../types/knowledgeGraph';
import { generateEntityId, generateRelationId } from '../types/knowledgeGraph';
import * as kgDB from '../db/knowledgeGraphDB';

interface UseKnowledgeGraphReturn {
  loading: boolean;
  error: string | null;
  graph: KnowledgeGraph | null;
  history: KnowledgeGraph[];
  extractGraph: (articleId: string, articleTitle: string, content: string) => Promise<KnowledgeGraph | null>;
  loadGraph: (articleId: string) => Promise<KnowledgeGraph | null>;
  loadHistory: () => Promise<void>;
  deleteGraph: (id: string) => Promise<void>;
  regenerateGraph: (articleId: string, articleTitle: string, content: string) => Promise<KnowledgeGraph | null>;
}

const ENTITY_TYPES = ['人物', '组织', '地点', '事件', '概念'];
const ENTITY_TYPE_EN = ['person', 'organization', 'location', 'event', 'concept'];

/**
 * Build entity extraction prompt for LLM
 */
function buildExtractionPrompt(title: string, content: string): string {
  return `分析以下文章，提取最多10个最重要的实体及其关系。

实体类型：
- 人物 (person): 人物名称
- 组织 (organization): 公司、机构、团体等
- 地点 (location): 地名、位置
- 事件 (event): 发生的事情、活动
- 概念 (concept): 思想、理论、技术名词

要求：
1. 提取实体数量控制在5-10个之间
2. 每个实体需要：名称、类型
3. 实体关系需要：源实体、目标实体、关系描述
4. 优先提取文章的核心实体和关键关系

只返回JSON格式，格式如下：
{
  "entities": [
    {"name": "实体名称", "type": "person|organization|location|event|concept", "description": "简要描述（可选）"}
  ],
  "relations": [
    {"source": "实体A名称", "target": "实体B名称", "relation": "关系描述"}
  ]
}

文章信息：
标题：${title}
内容：${content.slice(0, 2000)}`;
}

/**
 * Parse LLM response to extract entities and relations
 */
function parseExtractionResponse(text: string): KnowledgeGraphExtracted | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*?"entities"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.entities && Array.isArray(parsed.entities)) {
        return {
          entities: parsed.entities.slice(0, 10).map((e: any) => ({
            name: String(e.name || ''),
            type: mapEntityType(e.type),
            description: e.description ? String(e.description) : undefined,
          })).filter((e: any) => e.name && e.type),
          relations: (parsed.relations || []).slice(0, 15).map((r: any) => ({
            source: String(r.source || ''),
            target: String(r.target || ''),
            relation: String(r.relation || ''),
          })).filter((r: any) => r.source && r.target && r.relation),
        };
      }
    }
  } catch {
    // parsing failed
  }
  return null;
}

/**
 * Map Chinese type to English type
 */
function mapEntityType(type: string): 'person' | 'organization' | 'location' | 'event' | 'concept' {
  const typeMap: Record<string, 'person' | 'organization' | 'location' | 'event' | 'concept'> = {
    '人物': 'person',
    'person': 'person',
    '人': 'person',
    '组织': 'organization',
    'organization': 'organization',
    '机构': 'organization',
    '公司': 'organization',
    '地点': 'location',
    'location': 'location',
    '地方': 'location',
    '位置': 'location',
    '事件': 'event',
    'event': 'event',
    '活动': 'event',
    '概念': 'concept',
    'concept': 'concept',
    '技术': 'concept',
    '理论': 'concept',
  };
  return typeMap[type] || 'concept';
}

export function useKnowledgeGraph(): UseKnowledgeGraphReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [history, setHistory] = useState<KnowledgeGraph[]>([]);

  const extractGraph = useCallback(async (
    articleId: string,
    articleTitle: string,
    content: string
  ): Promise<KnowledgeGraph | null> => {
    setLoading(true);
    setError(null);

    try {
      const prompt = buildExtractionPrompt(articleTitle, content);

      const result = await callLLM(
        {
          model: 'minimax/MiniMax-Text-01',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 2000,
        },
        'knowledge-graph-extraction'
      );

      const extracted = parseExtractionResponse(result.text);

      if (!extracted || extracted.entities.length === 0) {
        throw new Error('Failed to extract entities from article');
      }

      // Create entity objects with IDs
      const entities: Entity[] = extracted.entities.map(e => ({
        id: generateEntityId(),
        name: e.name,
        type: e.type,
        description: e.description,
      }));

      // Create relation objects, mapping names to IDs
      const entityMap = new Map(entities.map(e => [e.name, e.id]));
      const relations: Relation[] = extracted.relations
        .map(r => {
          const sourceId = entityMap.get(r.source);
          const targetId = entityMap.get(r.target);
          if (!sourceId || !targetId) return null;
          return {
            id: generateRelationId(),
            sourceId,
            targetId,
            label: r.relation,
          };
        })
        .filter((r): r is Relation => r !== null);

      // Create knowledge graph
      const kg: KnowledgeGraph = {
        id: `kg_${articleId}_${Date.now()}`,
        articleId,
        articleTitle,
        entities,
        relations,
        createdAt: Date.now(),
      };

      // Save to IndexedDB
      await kgDB.saveKnowledgeGraph(kg);
      setGraph(kg);

      return kg;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to extract knowledge graph';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGraph = useCallback(async (articleId: string): Promise<KnowledgeGraph | null> => {
    try {
      const cached = await kgDB.getKnowledgeGraphByArticleId(articleId);
      if (cached) {
        setGraph(cached);
        return cached;
      }
      return null;
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
      return null;
    }
  }, []);

  const loadHistory = useCallback(async (): Promise<void> => {
    try {
      const graphs = await kgDB.getRecentKnowledgeGraphs(20);
      setHistory(graphs);
    } catch (err) {
      console.error('Failed to load knowledge graph history:', err);
    }
  }, []);

  const deleteGraph = useCallback(async (id: string): Promise<void> => {
    try {
      await kgDB.deleteKnowledgeGraph(id);
      if (graph?.id === id) {
        setGraph(null);
      }
      await loadHistory();
    } catch (err) {
      console.error('Failed to delete knowledge graph:', err);
    }
  }, [graph, loadHistory]);

  const regenerateGraph = useCallback(async (
    articleId: string,
    articleTitle: string,
    content: string
  ): Promise<KnowledgeGraph | null> => {
    // Delete existing graph for this article
    await kgDB.deleteKnowledgeGraphsByArticleId(articleId);
    // Extract new graph
    return extractGraph(articleId, articleTitle, content);
  }, [extractGraph]);

  return {
    loading,
    error,
    graph,
    history,
    extractGraph,
    loadGraph,
    loadHistory,
    deleteGraph,
    regenerateGraph,
  };
}
