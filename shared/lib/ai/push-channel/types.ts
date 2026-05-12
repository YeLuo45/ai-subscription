/**
 * Push Channel Types
 * Data models for multi-channel push notifications (Telegram, Email, WebPush)
 */

export type ChannelType = 'telegram' | 'email' | 'webpush';
export type Locale = 'zh' | 'en' | 'ja';

export interface PushTemplate {
  title: string;
  body: string;
  footer?: string;
  locale: Locale;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  toAddresses: string[];
}

export interface WebPushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface PushChannel {
  id: string;
  type: ChannelType;
  name: string;
  enabled: boolean;
  config: TelegramConfig | EmailConfig | WebPushConfig;
  template: PushTemplate;
  createdAt: number;
  updatedAt: number;
}

export interface SendHistory {
  id: string;
  channelId: string;
  channelName: string;
  channelType: ChannelType;
  title: string;
  summary: string;
  tags: string[];
  articleIds: string[];
  status: 'success' | 'failed';
  error?: string;
  sentAt: number;
}

export interface CreateChannelParams {
  type: ChannelType;
  name: string;
  config: TelegramConfig | EmailConfig | WebPushConfig;
  template: PushTemplate;
}

export interface UpdateChannelParams {
  name?: string;
  enabled?: boolean;
  config?: TelegramConfig | EmailConfig | WebPushConfig;
  template?: PushTemplate;
}

export interface PushContent {
  title: string;
  summary: string;
  tags: string[];
  articleIds: string[];
}

export interface TemplateVariables {
  title?: string;
  summary?: string;
  tags?: string[];
  [key: string]: string | string[] | undefined;
}
