import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // SSE realtime push middleware
    {
      name: 'sse-realtime',
      configureServer(server) {
        server.middlewares.use('/api/realtime/subscribe', (req, res) => {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.flushHeaders();
          
          const client = res;
          client.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected' })}\n\n`);
          
          const heartbeat = setInterval(() => {
            try {
              client.write(`event: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`);
            } catch {
              clearInterval(heartbeat);
            }
          }, 30000);
          
          req.on('close', () => {
            clearInterval(heartbeat);
          });
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
})
