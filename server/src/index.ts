// Express server entry point
import express from 'express';
import cors from 'cors';
import pluginsRouter from './routes/plugins';
import uploadRouter from './routes/upload';
import reviewRouter from './routes/review';
import platformRouter from './routes/platform';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/plugins', pluginsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/review', reviewRouter);
app.use('/api/platform', platformRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Plugin marketplace server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints:`);
  console.log(`  GET    /api/plugins`);
  console.log(`  GET    /api/plugins/:id`);
  console.log(`  POST   /api/plugins`);
  console.log(`  PUT    /api/plugins/:id`);
  console.log(`  DELETE /api/plugins/:id`);
  console.log(`  GET    /api/plugins/:id/versions`);
  console.log(`  POST   /api/plugins/:id/versions`);
  console.log(`  POST   /api/upload`);
  console.log(`  GET    /api/upload/:pluginId/:version`);
  console.log(`  GET    /api/review`);
  console.log(`  POST   /api/review`);
  console.log(`  POST   /api/review/:id/approve`);
  console.log(`  POST   /api/review/:id/reject`);
  console.log(`  GET    /api/platform/health`);
  console.log(`  GET    /api/platform/plugins`);
  console.log(`  GET    /api/platform/plugins/:id`);
  console.log(`  GET    /api/platform/plugins/:id/versions`);
  console.log(`  GET    /api/platform/keys`);
  console.log(`  POST   /api/platform/keys`);
  console.log(`  DELETE /api/platform/keys/:id`);
  console.log(`  GET    /api/platform/webhooks`);
  console.log(`  POST   /api/platform/webhooks`);
  console.log(`  DELETE /api/platform/webhooks/:id`);
  console.log(`  GET    /api/platform/stats`);
  console.log(`  GET    /api/platform/usage`);
});

export default app;
