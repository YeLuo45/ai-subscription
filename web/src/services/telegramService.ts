/**
 * Telegram Service for Workflow Automation
 * Sends messages via Telegram Bot API
 */

const TG_API_URL = 'https://api.telegram.org';

export interface TelegramSendResult {
  success: boolean;
  error?: string;
}

/**
 * Send a message via Telegram bot
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  parseMode: 'MarkdownV2' | 'HTML' | undefined = 'HTML'
): Promise<TelegramSendResult> {
  if (!botToken || !chatId || !text) {
    return { success: false, error: 'Missing bot token, chat ID, or message text' };
  }

  try {
    const url = `${TG_API_URL}/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `Telegram API error ${response.status}: ${errorBody}`,
      };
    }

    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send article via Telegram with formatted message
 */
export async function sendArticleToTelegram(
  botToken: string,
  chatId: string,
  article: {
    title: string;
    url: string;
    description?: string;
    source?: string;
  }
): Promise<TelegramSendResult> {
  const message = buildArticleMessage(article);
  return sendTelegramMessage(botToken, chatId, message);
}

/**
 * Build formatted article message for Telegram
 */
function buildArticleMessage(article: {
  title: string;
  url: string;
  description?: string;
  source?: string;
}): string {
  const parts: string[] = [];

  if (article.title) {
    parts.push(`📰 <b>${escapeHtml(article.title)}</b>`);
  }

  if (article.source) {
    parts.push(`📢 来源: ${escapeHtml(article.source)}`);
  }

  if (article.description) {
    const desc = article.description.length > 200
      ? article.description.slice(0, 200) + '...'
      : article.description;
    parts.push(`\n${escapeHtml(desc)}`);
  }

  if (article.url) {
    parts.push(`\n🔗 <a href="${escapeHtml(article.url)}">阅读原文</a>`);
  }

  return parts.join('\n');
}

/**
 * Escape HTML special characters for Telegram messages
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
