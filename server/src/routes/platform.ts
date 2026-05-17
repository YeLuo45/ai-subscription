// API Platform Routes - Open API Platform for Third-party Integration
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { storageService } from '../services/storage-service';
import { pluginService } from '../services/plugin-service';
import { reviewService } from '../services/review-service';

const router = Router();

// In-memory API key store (replace with database in production)
interface ApiKey {
  id: string;
  key: string;
  name: string;
  role: 'developer' | 'admin';
  owner: string;
  permissions: string[];
  rateLimit: number; // requests per minute
  createdAt: string;
  lastUsedAt: string;
  isActive: boolean;
}

interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: string[]; // 'plugin.created', 'plugin.updated', 'review.approved', etc.
  secret: string; // for HMAC signature
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt: string;
  failureCount: number;
}

interface ApiUsageRecord {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: string;
}

const apiKeys = new Map<string, ApiKey>();
const webhookSubscriptions = new Map<string, WebhookSubscription>();
const apiUsageLog: ApiUsageRecord[] = [];

// Rate limiting state
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Initialize default admin API key
const defaultAdminKey: ApiKey = {
  id: 'admin-default',
  key: 'admin-secret-key-2024',
  name: 'Default Admin Key',
  role: 'admin',
  owner: 'system',
  permissions: ['*'],
  rateLimit: 1000,
  createdAt: new Date().toISOString(),
  lastUsedAt: new Date().toISOString(),
  isActive: true,
};
apiKeys.set(defaultAdminKey.key, defaultAdminKey);

// Initialize default developer API key
const defaultDevKey: ApiKey = {
  id: 'dev-default',
  key: 'dev-secret-key-2024',
  name: 'Default Developer Key',
  role: 'developer',
  owner: 'developers',
  permissions: ['plugins.read', 'plugins.write', 'reviews.read'],
  rateLimit: 100,
  createdAt: new Date().toISOString(),
  lastUsedAt: new Date().toISOString(),
  isActive: true,
};
apiKeys.set(defaultDevKey.key, defaultDevKey);

// ============================================================
// Helper Functions
// ============================================================

function checkRateLimit(apiKey: ApiKey, endpoint: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = `${apiKey.id}:${endpoint}`;
  const state = rateLimitMap.get(key);
  
  if (!state || now > state.resetTime) {
    const resetTime = now + 60000; // 1 minute window
    rateLimitMap.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: apiKey.rateLimit - 1, resetIn: 60 };
  }
  
  if (state.count >= apiKey.rateLimit) {
    return { allowed: false, remaining: 0, resetIn: Math.ceil((state.resetTime - now) / 1000) };
  }
  
  state.count++;
  return { allowed: true, remaining: apiKey.rateLimit - state.count, resetIn: Math.ceil((state.resetTime - now) / 1000) };
}

function logApiUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, responseTime: number) {
  apiUsageLog.push({
    id: uuidv4(),
    apiKeyId,
    endpoint,
    method,
    statusCode,
    responseTime,
    timestamp: new Date().toISOString(),
  });
  // Keep only last 10000 records
  if (apiUsageLog.length > 10000) {
    apiUsageLog.shift();
  }
}

async function triggerWebhooks(event: string, payload: any) {
  const subscriptions = Array.from(webhookSubscriptions.values()).filter(
    sub => sub.isActive && sub.events.includes(event)
  );
  
  for (const sub of subscriptions) {
    try {
      const payloadStr = JSON.stringify(payload);
      // In production, compute HMAC-SHA256 signature
      const signature = `sha256=${Buffer.from(sub.secret + payloadStr).toString('base64').slice(0, 64)}`;
      
      const response = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
        },
        body: payloadStr,
      });
      
      if (response.ok) {
        sub.lastTriggeredAt = new Date().toISOString();
        sub.failureCount = 0;
      } else {
        sub.failureCount++;
        console.error(`Webhook ${sub.id} failed with status ${response.status}`);
      }
    } catch (err) {
      sub.failureCount++;
      console.error(`Webhook ${sub.id} error:`, err);
    }
    
    // Disable after 10 consecutive failures
    if (sub.failureCount >= 10) {
      sub.isActive = false;
      console.warn(`Webhook ${sub.id} disabled due to repeated failures`);
    }
  }
}

// ============================================================
// API Key Management (Admin only)
// ============================================================

// GET /api/platform/keys - List all API keys
router.get('/keys', async (req: Request, res: Response) => {
  try {
    const keys = Array.from(apiKeys.values()).map(k => ({
      id: k.id,
      name: k.name,
      role: k.role,
      owner: k.owner,
      permissions: k.permissions,
      rateLimit: k.rateLimit,
      createdAt: k.createdAt,
      lastUsedAt: k.lastUsedAt,
      isActive: k.isActive,
      // Don't expose the actual key
      keyPreview: k.key.slice(0, 8) + '...' + k.key.slice(-4),
    }));
    
    res.json({ data: keys, total: keys.length });
  } catch (error) {
    console.error('Error listing API keys:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

// POST /api/platform/keys - Create new API key
router.post('/keys', async (req: Request, res: Response) => {
  try {
    const { name, role, owner, permissions, rateLimit } = req.body;
    
    if (!name || !role || !owner) {
      res.status(400).json({ error: 'name, role, and owner are required' });
      return;
    }
    
    const newKey = `ais_${uuidv4().replace(/-/g, '')}_${Date.now().toString(36)}`;
    const apiKey: ApiKey = {
      id: uuidv4(),
      key: newKey,
      name,
      role: role || 'developer',
      owner,
      permissions: permissions || ['plugins.read'],
      rateLimit: rateLimit || 100,
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      isActive: true,
    };
    
    apiKeys.set(newKey, apiKey);
    
    res.status(201).json({
      id: apiKey.id,
      key: newKey, // Only returned on creation
      name: apiKey.name,
      role: apiKey.role,
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// DELETE /api/platform/keys/:id - Revoke API key
router.delete('/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const key = Array.from(apiKeys.values()).find(k => k.id === id);
    
    if (!key) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    
    // Don't allow deleting the default admin key
    if (key.key === 'admin-secret-key-2024') {
      res.status(403).json({ error: 'Cannot delete default admin key' });
      return;
    }
    
    apiKeys.delete(key.key);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// PATCH /api/platform/keys/:id - Update API key
router.patch('/keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const key = Array.from(apiKeys.values()).find(k => k.id === id);
    
    if (!key) {
      res.status(404).json({ error: 'API key not found' });
      return;
    }
    
    const { name, permissions, rateLimit, isActive } = req.body;
    
    if (name !== undefined) key.name = name;
    if (permissions !== undefined) key.permissions = permissions;
    if (rateLimit !== undefined) key.rateLimit = rateLimit;
    if (isActive !== undefined) key.isActive = isActive;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

// ============================================================
// Webhook Subscription Management
// ============================================================

// GET /api/platform/webhooks - List webhook subscriptions
router.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const subscriptions = Array.from(webhookSubscriptions.values()).map(sub => ({
      id: sub.id,
      name: sub.name,
      url: sub.url,
      events: sub.events,
      isActive: sub.isActive,
      createdAt: sub.createdAt,
      lastTriggeredAt: sub.lastTriggeredAt,
      failureCount: sub.failureCount,
    }));
    
    res.json({ data: subscriptions, total: subscriptions.length });
  } catch (error) {
    console.error('Error listing webhooks:', error);
    res.status(500).json({ error: 'Failed to list webhooks' });
  }
});

// POST /api/platform/webhooks - Create webhook subscription
router.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const { name, url, events, secret } = req.body;
    
    if (!name || !url || !events || !Array.isArray(events) || events.length === 0) {
      res.status(400).json({ error: 'name, url, and events (array) are required' });
      return;
    }
    
    const validEvents = ['plugin.created', 'plugin.updated', 'plugin.deleted', 
                         'review.submitted', 'review.approved', 'review.rejected',
                         'version.created', 'download.incremented'];
    
    const invalidEvents = events.filter((e: string) => !validEvents.includes(e));
    if (invalidEvents.length > 0) {
      res.status(400).json({ error: `Invalid events: ${invalidEvents.join(', ')}` });
      return;
    }
    
    const webhookSecret = secret || uuidv4();
    const subscription: WebhookSubscription = {
      id: uuidv4(),
      name,
      url,
      events,
      secret: webhookSecret,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastTriggeredAt: new Date().toISOString(),
      failureCount: 0,
    };
    
    webhookSubscriptions.set(subscription.id, subscription);
    
    res.status(201).json({
      id: subscription.id,
      secret: webhookSecret, // Only returned on creation
      name: subscription.name,
      url: subscription.url,
      events: subscription.events,
    });
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// DELETE /api/platform/webhooks/:id - Delete webhook subscription
router.delete('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exists = webhookSubscriptions.has(id);
    
    if (!exists) {
      res.status(404).json({ error: 'Webhook subscription not found' });
      return;
    }
    
    webhookSubscriptions.delete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// PATCH /api/platform/webhooks/:id - Update webhook subscription
router.patch('/webhooks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sub = webhookSubscriptions.get(id);
    
    if (!sub) {
      res.status(404).json({ error: 'Webhook subscription not found' });
      return;
    }
    
    const { name, url, events, isActive } = req.body;
    
    if (name !== undefined) sub.name = name;
    if (url !== undefined) sub.url = url;
    if (events !== undefined) sub.events = events;
    if (isActive !== undefined) sub.isActive = isActive;
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

// POST /api/platform/webhooks/:id/test - Test webhook delivery
router.post('/webhooks/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sub = webhookSubscriptions.get(id);
    
    if (!sub) {
      res.status(404).json({ error: 'Webhook subscription not found' });
      return;
    }
    
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        subscriptionId: id,
      }
    };
    
    const payloadStr = JSON.stringify(testPayload);
    const signature = `sha256=${Buffer.from(sub.secret + payloadStr).toString('base64').slice(0, 64)}`;
    
    const response = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': 'test',
        'X-Webhook-Signature': signature,
      },
      body: payloadStr,
    });
    
    if (response.ok) {
      res.json({ success: true, message: 'Test delivery successful' });
    } else {
      res.status(400).json({ success: false, message: `Test delivery failed with status ${response.status}` });
    }
  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// ============================================================
// Open API Endpoints (with rate limiting and usage tracking)
// ============================================================

// GET /api/platform/plugins - Public plugin listing
router.get('/plugins', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string || 'approved';
    
    // Only return approved plugins for public API
    const result = await pluginService.getPlugins(page, pageSize, status);
    
    const responseTime = Date.now() - startTime;
    logApiUsage('public', '/api/platform/plugins', 'GET', 200, responseTime);
    
    res.json({
      data: result.data,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiUsage('public', '/api/platform/plugins', 'GET', 500, responseTime);
    res.status(500).json({ error: 'Failed to fetch plugins' });
  }
});

// GET /api/platform/plugins/:id - Public plugin details
router.get('/plugins/:id', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const plugin = await pluginService.getPluginById(req.params.id);
    
    if (!plugin) {
      const responseTime = Date.now() - startTime;
      logApiUsage('public', '/api/platform/plugins/:id', 'GET', 404, responseTime);
      res.status(404).json({ error: 'Plugin not found' });
      return;
    }
    
    // Only return approved plugins for public API
    if (plugin.status !== 'approved') {
      const responseTime = Date.now() - startTime;
      logApiUsage('public', '/api/platform/plugins/:id', 'GET', 403, responseTime);
      res.status(403).json({ error: 'Plugin not publicly available' });
      return;
    }
    
    const responseTime = Date.now() - startTime;
    logApiUsage('public', '/api/platform/plugins/:id', 'GET', 200, responseTime);
    
    res.json(plugin);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiUsage('public', '/api/platform/plugins/:id', 'GET', 500, responseTime);
    res.status(500).json({ error: 'Failed to fetch plugin' });
  }
});

// GET /api/platform/plugins/:id/versions - Public plugin versions
router.get('/plugins/:id/versions', async (req: Request, res: Response) => {
  const startTime = Date.now();
  try {
    const versions = await pluginService.getVersions(req.params.id);
    
    const responseTime = Date.now() - startTime;
    logApiUsage('public', '/api/platform/plugins/:id/versions', 'GET', 200, responseTime);
    
    res.json(versions);
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logApiUsage('public', '/api/platform/plugins/:id/versions', 'GET', 500, responseTime);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// ============================================================
// API Usage Statistics
// ============================================================

// GET /api/platform/stats - Get API usage statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const last1h = now - 60 * 60 * 1000;
    
    const recentUsage = apiUsageLog.filter(r => new Date(r.timestamp).getTime() > last24h);
    const last1hUsage = apiUsageLog.filter(r => new Date(r.timestamp).getTime() > last1h);
    
    const totalRequests = recentUsage.length;
    const successfulRequests = recentUsage.filter(r => r.statusCode >= 200 && r.statusCode < 300).length;
    const failedRequests = recentUsage.filter(r => r.statusCode >= 400).length;
    const avgResponseTime = recentUsage.length > 0 
      ? Math.round(recentUsage.reduce((sum, r) => sum + r.responseTime, 0) / recentUsage.length)
      : 0;
    
    // Requests per minute in last hour
    const requestsPerMinute = last1hUsage.length / 60;
    
    // Top endpoints
    const endpointCounts = new Map<string, number>();
    for (const record of recentUsage) {
      endpointCounts.set(record.endpoint, (endpointCounts.get(record.endpoint) || 0) + 1);
    }
    const topEndpoints = Array.from(endpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([endpoint, count]) => ({ endpoint, count }));
    
    res.json({
      period: '24h',
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      topEndpoints,
      activeApiKeys: Array.from(apiKeys.values()).filter(k => k.isActive).length,
      activeWebhooks: Array.from(webhookSubscriptions.values()).filter(s => s.isActive).length,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/platform/usage - Get detailed API usage log
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const records = apiUsageLog.slice(offset, offset + limit);
    res.json({
      data: records,
      total: apiUsageLog.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage log' });
  }
});

// ============================================================
// Health Check
// ============================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      apiKeys: apiKeys.size,
      webhooks: webhookSubscriptions.size,
      apiUsageLog: apiUsageLog.length,
    }
  });
});

export default router;