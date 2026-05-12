/**
 * Telegram Sender
 * Send push notifications via Telegram Bot API
 */

import type { TelegramConfig } from './types';

export async function sendTelegram(
  content: { title: string; summary: string; tags: string[] },
  config: TelegramConfig
): Promise<void> {
  const text = `${content.title}\n\n${content.summary}\n\n#${content.tags.join(' #')}`;
  
  const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: config.chatId, text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Telegram API error: ${response.status} - ${error}`);
  }
}

export async function testTelegramConfig(config: TelegramConfig): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}
