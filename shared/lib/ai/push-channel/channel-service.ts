/**
 * Push Channel Service
 * Main service for managing push channels and sending notifications
 */

import type {
  PushChannel,
  SendHistory,
  CreateChannelParams,
  UpdateChannelParams,
  PushContent,
  TemplateVariables,
  ChannelType,
  TelegramConfig,
  EmailConfig,
  WebPushConfig,
  PushTemplate,
} from './types';
import * as storage from './storage';
import { sendTelegram } from './telegram-sender';
import { sendEmail } from './email-sender';
import { sendWebPush, getExistingSubscription } from './webpush-sender';

export class PushChannelService {
  async createChannel(params: CreateChannelParams): Promise<PushChannel> {
    const channel = {
      ...params,
      enabled: true,
    };
    return storage.saveChannel(channel);
  }

  async getChannels(): Promise<PushChannel[]> {
    return storage.getAllChannels();
  }

  async getChannel(id: string): Promise<PushChannel | undefined> {
    return storage.getChannel(id);
  }

  async getEnabledChannels(): Promise<PushChannel[]> {
    return storage.getEnabledChannels();
  }

  async getChannelsByType(type: ChannelType): Promise<PushChannel[]> {
    return storage.getChannelsByType(type);
  }

  async updateChannel(id: string, updates: UpdateChannelParams): Promise<PushChannel> {
    const existing = await storage.getChannel(id);
    if (!existing) {
      throw new Error(`Channel not found: ${id}`);
    }
    const updated: PushChannel = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };
    return storage.saveChannel(updated);
  }

  async deleteChannel(id: string): Promise<void> {
    return storage.deleteChannel(id);
  }

  async toggleChannel(id: string, enabled: boolean): Promise<void> {
    const existing = await storage.getChannel(id);
    if (!existing) {
      throw new Error(`Channel not found: ${id}`);
    }
    await storage.saveChannel({
      ...existing,
      enabled,
      updatedAt: Date.now(),
    });
  }

  async sendPush(
    content: PushContent,
    channelIds?: string[]
  ): Promise<{ success: string[]; failed: { channelId: string; error: string }[] }> {
    let channels: PushChannel[];
    
    if (channelIds && channelIds.length > 0) {
      channels = [];
      for (const id of channelIds) {
        const channel = await storage.getChannel(id);
        if (channel) channels.push(channel);
      }
    } else {
      channels = await storage.getEnabledChannels();
    }

    const results = {
      success: [] as string[],
      failed: [] as { channelId: string; error: string }[],
    };

    for (const channel of channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, content);
        await storage.saveSendHistory({
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.type,
          title: content.title,
          summary: content.summary,
          tags: content.tags,
          articleIds: content.articleIds,
          status: 'success',
          sentAt: Date.now(),
        });
        results.success.push(channel.id);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await storage.saveSendHistory({
          channelId: channel.id,
          channelName: channel.name,
          channelType: channel.type,
          title: content.title,
          summary: content.summary,
          tags: content.tags,
          articleIds: content.articleIds,
          status: 'failed',
          error: errorMessage,
          sentAt: Date.now(),
        });
        results.failed.push({ channelId: channel.id, error: errorMessage });
      }
    }

    return results;
  }

  private async sendToChannel(channel: PushChannel, content: PushContent): Promise<void> {
    const templateVars: TemplateVariables = {
      title: content.title,
      summary: content.summary,
      tags: content.tags,
      ...content,
    };

    const renderedContent = {
      title: this.renderTemplate(channel.template.title, templateVars),
      summary: this.renderTemplate(channel.template.body, templateVars),
      tags: content.tags,
    };

    switch (channel.type) {
      case 'telegram':
        await sendTelegram(renderedContent, channel.config as TelegramConfig);
        break;
      case 'email':
        await sendEmail(renderedContent, channel.config as EmailConfig);
        break;
      case 'webpush':
        // For webpush, we need an existing subscription
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await getExistingSubscription(registration);
          if (subscription) {
            await sendWebPush(renderedContent, channel.config as WebPushConfig, subscription);
          } else {
            throw new Error('No WebPush subscription found. Please subscribe first.');
          }
        } else {
          throw new Error('WebPush not available in this environment');
        }
        break;
      default:
        throw new Error(`Unknown channel type: ${(channel as PushChannel).type}`);
    }
  }

  async previewTemplate(channelId: string, variables: TemplateVariables): Promise<{ title: string; body: string }> {
    const channel = await storage.getChannel(channelId);
    if (!channel || !channel.template) {
      return { title: variables.title || '', body: variables.summary || '' };
    }
    return {
      title: this.renderTemplate(channel.template.title, variables),
      body: this.renderTemplate(channel.template.body, variables),
    };
  }

  private renderTemplate(template: string, variables: TemplateVariables): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined) {
        const placeholder = `{{${key}}}`;
        const replacement = Array.isArray(value) ? value.join(', ') : String(value);
        result = result.split(placeholder).join(replacement);
      }
    }
    return result;
  }

  async testChannel(channelId: string): Promise<boolean> {
    const channel = await storage.getChannel(channelId);
    if (!channel) {
      throw new Error(`Channel not found: ${channelId}`);
    }

    const testContent: PushContent = {
      title: 'Test Notification',
      summary: 'This is a test notification from AI Subscription.',
      tags: ['test', 'ai-subscription'],
      articleIds: [],
    };

    try {
      await this.sendToChannel(channel, testContent);
      return true;
    } catch {
      return false;
    }
  }

  async getSendHistory(channelId?: string, limit?: number): Promise<SendHistory[]> {
    return storage.getSendHistory(channelId, limit);
  }

  async clearHistory(channelId?: string): Promise<void> {
    return storage.clearSendHistory(channelId);
  }
}

// Default singleton instance
let defaultService: PushChannelService | null = null;

export function getPushChannelService(): PushChannelService {
  if (!defaultService) {
    defaultService = new PushChannelService();
  }
  return defaultService;
}
