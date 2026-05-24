/**
 * Subscription Management Tools for MCP Server
 * Implements: list_subscriptions, add_subscription, remove_subscription
 */

import type { MCPTool, MCPToolCallResult, SubscriptionData, AddSubscriptionParams, RemoveSubscriptionParams } from '../types';
import { MCP_SERVER_ERROR_CODES } from '../types';
import { getSubscriptions, saveSubscription, deleteSubscription } from '../../storage';

// Tool definitions
export const listSubscriptionsTool: MCPTool = {
  name: 'list_subscriptions',
  description: 'List all RSS/Atom feed subscriptions. Returns subscription ID, name, URL, category, and status.',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
};

export const addSubscriptionTool: MCPTool = {
  name: 'add_subscription',
  description: 'Add a new RSS/Atom feed subscription. Requires URL and name.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'RSS/Atom feed URL',
      },
      name: {
        type: 'string',
        description: 'Display name for the subscription',
      },
      category: {
        type: 'string',
        description: 'Category for the subscription (default: "General")',
        default: 'General',
      },
    },
    required: ['url', 'name'],
  },
};

export const removeSubscriptionTool: MCPTool = {
  name: 'remove_subscription',
  description: 'Remove an existing subscription by ID.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Subscription ID to remove',
      },
    },
    required: ['id'],
  },
};

// Tool handlers
async function handleListSubscriptions(_args: Record<string, unknown>): Promise<MCPToolCallResult> {
  try {
    const subscriptions = await getSubscriptions();
    
    const result: SubscriptionData[] = subscriptions.map(sub => ({
      id: sub.id,
      name: sub.name,
      url: sub.url,
      type: sub.type,
      category: sub.category,
      enabled: sub.enabled,
      aiSummaryEnabled: sub.aiSummaryEnabled,
      fetchIntervalMinutes: sub.fetchIntervalMinutes,
      lastFetchedAt: sub.lastFetchedAt,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      groupId: sub.groupId,
      useCustomInterval: sub.useCustomInterval,
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          subscriptions: result,
          total: result.length,
        }),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Failed to list subscriptions', details: error instanceof Error ? error.message : String(error) }),
      }],
      isError: true,
    };
  }
}

async function handleAddSubscription(args: Record<string, unknown>): Promise<MCPToolCallResult> {
  try {
    const params = args as unknown as AddSubscriptionParams;
    const { url, name, category = 'General' } = params;

    if (!url || typeof url !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Invalid params: url is required' }),
        }],
        isError: true,
      };
    }

    if (!name || typeof name !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Invalid params: name is required' }),
        }],
        isError: true,
      };
    }

    // Detect feed type from URL
    let feedType: 'rss' | 'atom' | 'api' = 'rss';
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes('atom') || lowerUrl.includes('feed')) {
      feedType = 'atom';
    } else if (lowerUrl.includes('api')) {
      feedType = 'api';
    }

    const subscription = await saveSubscription({
      name,
      url,
      type: feedType,
      category: category as string,
      enabled: true,
      aiSummaryEnabled: true,
      fetchIntervalMinutes: 60,
      useCustomInterval: false,
    });

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          subscription: {
            id: subscription.id,
            name: subscription.name,
            url: subscription.url,
            type: subscription.type,
            category: subscription.category,
            enabled: subscription.enabled,
          },
        }),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Failed to add subscription', details: error instanceof Error ? error.message : String(error) }),
      }],
      isError: true,
    };
  }
}

async function handleRemoveSubscription(args: Record<string, unknown>): Promise<MCPToolCallResult> {
  try {
    const params = args as unknown as RemoveSubscriptionParams;
    const { id } = params;

    if (!id || typeof id !== 'string') {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Invalid params: id is required' }),
        }],
        isError: true,
      };
    }

    // Check if subscription exists
    const subscriptions = await getSubscriptions();
    const exists = subscriptions.some(sub => sub.id === id);

    if (!exists) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ error: 'Subscription not found', code: MCP_SERVER_ERROR_CODES.SUBSCRIPTION_NOT_FOUND }),
        }],
        isError: true,
      };
    }

    await deleteSubscription(id);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          removedId: id,
        }),
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: 'Failed to remove subscription', details: error instanceof Error ? error.message : String(error) }),
      }],
      isError: true,
    };
  }
}

// Export tool handlers map
export const subscriptionTools = {
  list_subscriptions: handleListSubscriptions,
  add_subscription: handleAddSubscription,
  remove_subscription: handleRemoveSubscription,
};

// Export tool definitions
export const subscriptionToolDefs: MCPTool[] = [
  listSubscriptionsTool,
  addSubscriptionTool,
  removeSubscriptionTool,
];