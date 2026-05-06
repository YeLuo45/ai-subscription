// Workflow Rule Types for Automation

export interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'article_added' | 'keyword_detected' | 'sentiment_match' | 'source_match';
    keywords?: string[];     // keyword_detected
    sentiment?: string[];    // sentiment_match
    sources?: string[];      // source_match
  };
  conditions: {
    tags?: string[];
    minLength?: number;
  };
  actions: Array<{
    type: 'add_tag' | 'send_telegram' | 'send_webhook' | 'mark_starred' | 'add_to_list';
    params: Record<string, any>;
  }>;
  createdAt: number;
}

export interface WorkflowLogEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  articleId: string;
  articleTitle: string;
  actionType: string;
  success: boolean;
  error?: string;
  timestamp: number;
}

export type TriggerType = WorkflowRule['trigger']['type'];
export type ActionType = WorkflowRule['actions'][0]['type'];

export const TRIGGER_LABELS: Record<TriggerType, string> = {
  article_added: '文章入库',
  keyword_detected: '关键词匹配',
  sentiment_match: '情感匹配',
  source_match: '来源匹配',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  add_tag: '添加标签',
  send_telegram: '发送Telegram',
  send_webhook: '触发Webhook',
  mark_starred: '标记星标',
  add_to_list: '加入列表',
};
