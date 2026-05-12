/**
 * Push Channel Panel
 * React component for managing push channels (Telegram, Email, WebPush)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getPushChannelService, PushChannelService } from '../../../../shared/lib/ai/push-channel';
import type {
  PushChannel,
  SendHistory,
  ChannelType,
  CreateChannelParams,
  TelegramConfig,
  EmailConfig,
  WebPushConfig,
  PushTemplate,
} from '../../../../shared/lib/ai/push-channel/types';

const DEFAULT_TEMPLATE: PushTemplate = {
  title: '{{title}}',
  body: '{{summary}}\n\nTags: {{tags}}',
  locale: 'en',
};

export const PushChannelPanel: React.FC = () => {
  const [channels, setChannels] = useState<PushChannel[]>([]);
  const [history, setHistory] = useState<SendHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<PushChannelService | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<PushChannel | null>(null);
  const [activeTab, setActiveTab] = useState<'channels' | 'history'>('channels');

  // Form state
  const [formType, setFormType] = useState<ChannelType>('telegram');
  const [formName, setFormName] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  
  // Telegram fields
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  
  // Email fields
  const [emailSmtpHost, setEmailSmtpHost] = useState('');
  const [emailSmtpPort, setEmailSmtpPort] = useState('587');
  const [emailSmtpUser, setEmailSmtpUser] = useState('');
  const [emailSmtpPassword, setEmailSmtpPassword] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailToAddresses, setEmailToAddresses] = useState('');
  
  // WebPush fields
  const [webpushPublicKey, setWebpushPublicKey] = useState('');
  const [webpushPrivateKey, setWebpushPrivateKey] = useState('');
  const [webpushSubject, setWebpushSubject] = useState('');
  
  // Template fields
  const [templateTitle, setTemplateTitle] = useState('{{title}}');
  const [templateBody, setTemplateBody] = useState('{{summary}}\n\nTags: {{tags}}');
  const [templateFooter, setTemplateFooter] = useState('');
  const [templateLocale, setTemplateLocale] = useState<'zh' | 'en' | 'ja'>('en');

  // Test state
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Initialize service
  useEffect(() => {
    setService(getPushChannelService());
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    if (!service) return;
    try {
      const [channelsData, historyData] = await Promise.all([
        service.getChannels(),
        service.getSendHistory(undefined, 50),
      ]);
      setChannels(channelsData);
      setHistory(historyData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    if (service) {
      loadData();
    }
  }, [service, loadData]);

  // Reset form
  const resetForm = () => {
    setFormName('');
    setFormEnabled(true);
    setTelegramBotToken('');
    setTelegramChatId('');
    setEmailSmtpHost('');
    setEmailSmtpPort('587');
    setEmailSmtpUser('');
    setEmailSmtpPassword('');
    setEmailFromAddress('');
    setEmailToAddresses('');
    setWebpushPublicKey('');
    setWebpushPrivateKey('');
    setWebpushSubject('');
    setTemplateTitle('{{title}}');
    setTemplateBody('{{summary}}\n\nTags: {{tags}}');
    setTemplateFooter('');
    setTemplateLocale('en');
  };

  // Open create modal
  const handleOpenCreate = () => {
    resetForm();
    setEditingChannel(null);
    setShowCreateModal(true);
  };

  // Open edit modal
  const handleOpenEdit = (channel: PushChannel) => {
    setEditingChannel(channel);
    setFormName(channel.name);
    setFormEnabled(channel.enabled);
    setTemplateTitle(channel.template.title);
    setTemplateBody(channel.template.body);
    setTemplateFooter(channel.template.footer || '');
    setTemplateLocale(channel.template.locale);

    if (channel.type === 'telegram') {
      const config = channel.config as TelegramConfig;
      setTelegramBotToken(config.botToken);
      setTelegramChatId(config.chatId);
    } else if (channel.type === 'email') {
      const config = channel.config as EmailConfig;
      setEmailSmtpHost(config.smtpHost);
      setEmailSmtpPort(String(config.smtpPort));
      setEmailSmtpUser(config.smtpUser);
      setEmailSmtpPassword(config.smtpPassword);
      setEmailFromAddress(config.fromAddress);
      setEmailToAddresses(config.toAddresses.join(', '));
    } else if (channel.type === 'webpush') {
      const config = channel.config as WebPushConfig;
      setWebpushPublicKey(config.publicKey);
      setWebpushPrivateKey(config.privateKey);
      setWebpushSubject(config.subject);
    }

    setFormType(channel.type);
    setShowCreateModal(true);
  };

  // Get config based on type
  const getConfig = (): TelegramConfig | EmailConfig | WebPushConfig => {
    switch (formType) {
      case 'telegram':
        return { botToken: telegramBotToken, chatId: telegramChatId };
      case 'email':
        return {
          smtpHost: emailSmtpHost,
          smtpPort: Number(emailSmtpPort),
          smtpUser: emailSmtpUser,
          smtpPassword: emailSmtpPassword,
          fromAddress: emailFromAddress,
          toAddresses: emailToAddresses.split(',').map(s => s.trim()).filter(Boolean),
        };
      case 'webpush':
        return { publicKey: webpushPublicKey, privateKey: webpushPrivateKey, subject: webpushSubject };
    }
  };

  // Handle save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!service) return;

    try {
      const template: PushTemplate = {
        title: templateTitle,
        body: templateBody,
        footer: templateFooter || undefined,
        locale: templateLocale,
      };

      if (editingChannel) {
        await service.updateChannel(editingChannel.id, {
          name: formName,
          enabled: formEnabled,
          config: getConfig(),
          template,
        });
      } else {
        await service.createChannel({
          type: formType,
          name: formName,
          config: getConfig(),
          template,
        });
      }

      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channel');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!service) return;
    if (!confirm('Delete this channel?')) return;

    try {
      await service.deleteChannel(id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel');
    }
  };

  // Handle toggle
  const handleToggle = async (id: string, enabled: boolean) => {
    if (!service) return;

    try {
      await service.toggleChannel(id, enabled);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle channel');
    }
  };

  // Handle test
  const handleTest = async (id: string) => {
    if (!service) return;
    setTestingId(id);
    setTestResult(null);

    try {
      const success = await service.testChannel(id);
      setTestResult({ id, success, message: success ? 'Test sent successfully!' : 'Test failed' });
    } catch (err) {
      setTestResult({ id, success: false, message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTestingId(null);
    }
  };

  // Get channel icon
  const getChannelIcon = (type: ChannelType) => {
    switch (type) {
      case 'telegram': return '📱';
      case 'email': return '📧';
      case 'webpush': return '🔔';
    }
  };

  // Get channel type label
  const getChannelTypeLabel = (type: ChannelType) => {
    switch (type) {
      case 'telegram': return 'Telegram';
      case 'email': return 'Email';
      case 'webpush': return 'WebPush';
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="push-channel-panel p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Push Channels</h2>
        <button
          onClick={handleOpenCreate}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Add Channel
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab('channels')}
          className={`px-4 py-2 ${activeTab === 'channels' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
        >
          Channels ({channels.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 ${activeTab === 'history' ? 'border-b-2 border-blue-500 font-semibold' : 'text-gray-500'}`}
        >
          Send History ({history.length})
        </button>
      </div>

      {activeTab === 'channels' ? (
        <>
          {channels.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No push channels configured. Click "Add Channel" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {channels.map(channel => (
                <div key={channel.id} className="border p-4 rounded bg-white">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getChannelIcon(channel.type)}</span>
                      <div>
                        <h3 className="font-semibold">{channel.name}</h3>
                        <span className="text-sm text-gray-500">{getChannelTypeLabel(channel.type)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={channel.enabled}
                          onChange={e => handleToggle(channel.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                      <button
                        onClick={() => handleTest(channel.id)}
                        disabled={testingId === channel.id}
                        className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                      >
                        {testingId === channel.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(channel)}
                        className="text-gray-600 hover:underline text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(channel.id)}
                        className="text-red-600 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {testResult && testResult.id === channel.id && (
                    <div className={`mt-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {testResult.message}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-400">
                    Template: {channel.template.title}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {history.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              No send history yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(item => (
                <div key={item.id} className="border p-3 rounded bg-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-gray-600">{item.summary}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        <span>{getChannelIcon(item.channelType)} {item.channelName}</span>
                        <span className="mx-2">|</span>
                        <span>{new Date(item.sentAt).toLocaleString()}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${item.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {item.status}
                    </span>
                  </div>
                  {item.error && (
                    <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg">
                {editingChannel ? 'Edit Channel' : 'Create New Channel'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              {/* Channel Type Selection */}
              {!editingChannel && (
                <div>
                  <label className="block text-sm font-medium mb-2">Channel Type</label>
                  <div className="flex gap-4">
                    {(['telegram', 'email', 'webpush'] as ChannelType[]).map(type => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="channelType"
                          value={type}
                          checked={formType === type}
                          onChange={() => setFormType(type)}
                          className="mr-1"
                        />
                        <span>{getChannelIcon(type)} {getChannelTypeLabel(type)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium mb-2">Channel Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full border p-2 rounded"
                  placeholder="My Telegram Channel"
                  required
                />
              </div>

              {/* Telegram Config */}
              {formType === 'telegram' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Bot Token</label>
                    <input
                      type="text"
                      value={telegramBotToken}
                      onChange={e => setTelegramBotToken(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="123456:ABC-DEF..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Chat ID</label>
                    <input
                      type="text"
                      value={telegramChatId}
                      onChange={e => setTelegramChatId(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="-100123456789"
                      required
                    />
                  </div>
                </>
              )}

              {/* Email Config */}
              {formType === 'email' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Host</label>
                      <input
                        type="text"
                        value={emailSmtpHost}
                        onChange={e => setEmailSmtpHost(e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="smtp.gmail.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Port</label>
                      <input
                        type="number"
                        value={emailSmtpPort}
                        onChange={e => setEmailSmtpPort(e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="587"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP User</label>
                      <input
                        type="text"
                        value={emailSmtpUser}
                        onChange={e => setEmailSmtpUser(e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="user@gmail.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">SMTP Password</label>
                      <input
                        type="password"
                        value={emailSmtpPassword}
                        onChange={e => setEmailSmtpPassword(e.target.value)}
                        className="w-full border p-2 rounded"
                        placeholder="App password"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">From Address</label>
                    <input
                      type="email"
                      value={emailFromAddress}
                      onChange={e => setEmailFromAddress(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="noreply@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">To Addresses (comma separated)</label>
                    <input
                      type="text"
                      value={emailToAddresses}
                      onChange={e => setEmailToAddresses(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="user1@example.com, user2@example.com"
                      required
                    />
                  </div>
                </>
              )}

              {/* WebPush Config */}
              {formType === 'webpush' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">VAPID Public Key</label>
                    <input
                      type="text"
                      value={webpushPublicKey}
                      onChange={e => setWebpushPublicKey(e.target.value)}
                      className="w-full border p-2 rounded font-mono text-sm"
                      placeholder="BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LF..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">VAPID Private Key</label>
                    <input
                      type="password"
                      value={webpushPrivateKey}
                      onChange={e => setWebpushPrivateKey(e.target.value)}
                      className="w-full border p-2 rounded font-mono text-sm"
                      placeholder="63F3D6487D7E..."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Subject (mailto or https)</label>
                    <input
                      type="text"
                      value={webpushSubject}
                      onChange={e => setWebpushSubject(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="mailto:admin@example.com"
                      required
                    />
                  </div>
                </>
              )}

              {/* Template Section */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Message Template</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title Template</label>
                    <input
                      type="text"
                      value={templateTitle}
                      onChange={e => setTemplateTitle(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="{{title}}"
                    />
                    <p className="text-xs text-gray-500 mt-1">Variables: {'{{title}}'}, {'{{summary}}'}, {'{{tags}}'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Body Template</label>
                    <textarea
                      value={templateBody}
                      onChange={e => setTemplateBody(e.target.value)}
                      className="w-full border p-2 rounded"
                      rows={3}
                      placeholder="{{summary}}"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Footer (optional)</label>
                    <input
                      type="text"
                      value={templateFooter}
                      onChange={e => setTemplateFooter(e.target.value)}
                      className="w-full border p-2 rounded"
                      placeholder="Sent via AI Subscription"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Locale</label>
                    <select
                      value={templateLocale}
                      onChange={e => setTemplateLocale(e.target.value as 'zh' | 'en' | 'ja')}
                      className="border p-2 rounded"
                    >
                      <option value="en">English</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {editingChannel ? 'Save Changes' : 'Create Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushChannelPanel;
