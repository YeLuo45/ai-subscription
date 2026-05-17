import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { ViteDevServer } from 'vite'

// API Service helpers for dev server
async function setupApiEndpoints(server: ViteDevServer) {
  const { validateApiKey, addApiLog, getFeeds, getFeedArticles, getArticleById, getTags, searchArticles } = await import('./src/services/apiService.ts');
  
  server.middlewares.use(async (req, res, next) => {
    // Only handle /api/v1/* routes
    if (!req.url?.startsWith('/api/v1/')) {
      return next();
    }

    const url = new URL(req.url, 'http://localhost');
    const endpoint = url.pathname.replace('/api/v1/', '');
    const query = Object.fromEntries(url.searchParams);
    const startTime = Date.now();

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Extract API key from Authorization header
    const authHeader = req.headers.authorization || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) {
      const duration = Date.now() - startTime;
      await addApiLog({
        keyId: 'unknown',
        endpoint: req.url,
        method: req.method,
        statusCode: 401,
        requestParams: query,
        error: 'Missing API Key',
        timestamp: Date.now(),
        duration,
      });

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Missing API Key', statusCode: 401 }));
      return;
    }

    // Validate API key
    const validKey = await validateApiKey(apiKey);
    if (!validKey) {
      const duration = Date.now() - startTime;
      await addApiLog({
        keyId: 'invalid',
        endpoint: req.url,
        method: req.method,
        statusCode: 401,
        requestParams: query,
        error: 'Invalid API Key',
        timestamp: Date.now(),
        duration,
      });

      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid API Key', statusCode: 401 }));
      return;
    }

    // Route handling
    try {
      let result: unknown;
      let statusCode = 200;

      // GET /api/v1/feeds
      if (endpoint === 'feeds' && req.method === 'GET') {
        result = { success: true, data: getFeeds() };
      }
      // GET /api/v1/feeds/{feedId}/articles
      else if (endpoint.match(/^feeds\/([^/]+)\/articles$/) && req.method === 'GET') {
        const feedId = endpoint.match(/^feeds\/([^/]+)\/articles$/)?.[1];
        const page = parseInt(query.page as string) || 1;
        const perPage = parseInt(query.perPage as string) || 20;
        const { items, total } = getFeedArticles(feedId!, page, perPage);
        result = { success: true, data: items, meta: { total, page, perPage } };
      }
      // GET /api/v1/articles/{articleId}
      else if (endpoint.match(/^articles\/([^/]+)$/) && req.method === 'GET') {
        const articleId = endpoint.match(/^articles\/([^/]+)$/)?.[1];
        const article = getArticleById(articleId!);
        if (article) {
          result = { success: true, data: article };
        } else {
          statusCode = 404;
          result = { success: false, error: 'Article not found', statusCode: 404 };
        }
      }
      // GET /api/v1/tags
      else if (endpoint === 'tags' && req.method === 'GET') {
        result = { success: true, data: getTags() };
      }
      // GET /api/v1/search
      else if (endpoint === 'search' && req.method === 'GET') {
        const q = query.q as string || '';
        const page = parseInt(query.page as string) || 1;
        const perPage = parseInt(query.perPage as string) || 20;
        const { items, total } = searchArticles(q, page, perPage);
        result = { success: true, data: items, meta: { total, page, perPage } };
      }
      else {
        statusCode = 404;
        result = { success: false, error: 'Endpoint not found', statusCode: 404 };
      }

      const duration = Date.now() - startTime;
      await addApiLog({
        keyId: validKey.id,
        endpoint: req.url,
        method: req.method,
        statusCode,
        requestParams: query,
        timestamp: Date.now(),
        duration,
      });

      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      const duration = Date.now() - startTime;
      await addApiLog({
        keyId: validKey.id,
        endpoint: req.url,
        method: req.method,
        statusCode: 500,
        requestParams: query,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: Date.now(),
        duration,
      });

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal server error', statusCode: 500 }));
    }
  });
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        setupApiEndpoints(server);
      },
    },
  ],
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      'async_hooks': path.resolve(__dirname, './async-hooks-stub.ts'),
    },
  },
  define: {
    // Mock async_hooks for browser build - AsyncLocalStorage is only used
    // for Node.js request tracing and replaced with no-ops in browser
    'import.meta.env.ASYNC_HOOKS_AVAILABLE': 'false',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*'],
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React core - split react and react-dom
          if (id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-dom/')) {
            return 'vendor-react-dom';
          }
          // Ant Design - all antd packages
          if (id.includes('node_modules/antd/') || id.includes('node_modules/@ant-design/')) {
            return 'vendor-antd';
          }
          // AI SDKs - separate chunk for AI functionality
          if (id.includes('node_modules/@ai-sdk/') || id.includes('node_modules/ai/')) {
            return 'vendor-ai-sdk';
          }
          // Math and utility libraries
          if (id.includes('node_modules/mathjs/') || id.includes('node_modules/zod/')) {
            return 'vendor-utils';
          }
          // Internal service modules
          if (id.includes('/src/services/mcp/')) {
            return 'vendor-mcp';
          }
          if (id.includes('/src/services/workflow/')) {
            return 'vendor-workflow';
          }
          if (id.includes('/src/services/recommendation-engine/')) {
            return 'vendor-recommendation';
          }
          if (id.includes('/src/services/scheduler/')) {
            return 'vendor-scheduler';
          }
          if (id.includes('/src/services/sync/')) {
            return 'vendor-sync';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
  optimizeDeps: {
    include: [
      'ai', '@ai-sdk/openai', '@ai-sdk/anthropic', '@ai-sdk/google',
      'mathjs', 'jsonrepair', 'partial-json', 'zod',
    ],
  },
})
