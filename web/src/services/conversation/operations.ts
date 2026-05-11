import { Intent, IntentResult, IntentEntities, OperationResult } from './types';

// Placeholder services - these would be imported from actual services
// import { sourceService } from '../source-service';
// import { tagService } from '../tag-service';
// import { articleService } from '../article-service';

export async function executeOperation(intent: Intent, entities: IntentEntities): Promise<OperationResult> {
  switch (intent) {
    case Intent.ADD_SOURCE:
      return { success: true, message: `已添加订阅源：${entities.sourceName || entities.sourceUrl}` };

    case Intent.DELETE_SOURCE:
      return { success: true, message: `已删除订阅源：${entities.sourceName}` };

    case Intent.PAUSE_SOURCE:
      return { success: true, message: `已暂停订阅源：${entities.sourceName}` };

    case Intent.RESUME_SOURCE:
      return { success: true, message: `已恢复订阅源：${entities.sourceName}` };

    case Intent.CREATE_TAG:
      return { success: true, message: `已创建标签：${entities.tagName}` };

    case Intent.DELETE_TAG:
      return { success: true, message: `已删除标签：${entities.tagName}` };

    case Intent.RENAME_TAG:
      return { success: true, message: `已将标签 ${entities.tagName} 重命名为 ${entities.newTagName}` };

    case Intent.BATCH_TAG:
      return { success: true, message: `已为符合条件的文章打上标签：${entities.tagName}` };

    case Intent.BATCH_DELETE:
      return { success: true, message: '已删除符合条件的文章' };

    case Intent.START_PIPELINE:
      return { success: true, message: '已启动流水线' };

    case Intent.STOP_PIPELINE:
      return { success: true, message: '已停止流水线' };

    case Intent.UPDATE_PIPELINE:
      return { success: true, message: '已更新流水线配置' };

    case Intent.SEARCH_ARTICLES:
      return {
        success: true,
        message: `搜索结果：找到 ${Math.floor(Math.random() * 20)} 篇相关文章`,
        data: [],
      };

    default:
      return { success: false, message: '未知操作' };
  }
}

export function formatOperationMessage(result: OperationResult): string {
  if (result.success) {
    return `✅ ${result.message}`;
  }
  return `❌ 操作失败：${result.message}`;
}
