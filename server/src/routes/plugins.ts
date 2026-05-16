// Plugin CRUD routes
import { Router, Request, Response } from 'express';
import { pluginService } from '../services/plugin-service';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// All plugin routes require authentication
router.use(authMiddleware);

// GET /api/plugins - List plugins with pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string;

    const result = await pluginService.getPlugins(page, pageSize, status);
    
    res.json({
      data: result.data,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    });
  } catch (error) {
    console.error('Error fetching plugins:', error);
    res.status(500).json({ error: 'Failed to fetch plugins' });
  }
});

// GET /api/plugins/:id - Get plugin details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const plugin = await pluginService.getPluginById(req.params.id);
    if (!plugin) {
      res.status(404).json({ error: 'Plugin not found' });
      return;
    }
    res.json(plugin);
  } catch (error) {
    console.error('Error fetching plugin:', error);
    res.status(500).json({ error: 'Failed to fetch plugin' });
  }
});

// POST /api/plugins - Create new plugin
router.post('/', async (req: Request, res: Response) => {
  try {
    const plugin = await pluginService.createPlugin(req.body);
    res.status(201).json(plugin);
  } catch (error) {
    console.error('Error creating plugin:', error);
    res.status(500).json({ error: 'Failed to create plugin' });
  }
});

// PUT /api/plugins/:id - Update plugin
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const plugin = await pluginService.updatePlugin(req.params.id, req.body);
    if (!plugin) {
      res.status(404).json({ error: 'Plugin not found' });
      return;
    }
    res.json(plugin);
  } catch (error) {
    console.error('Error updating plugin:', error);
    res.status(500).json({ error: 'Failed to update plugin' });
  }
});

// DELETE /api/plugins/:id - Delete plugin
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await pluginService.deletePlugin(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Plugin not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting plugin:', error);
    res.status(500).json({ error: 'Failed to delete plugin' });
  }
});

// GET /api/plugins/:id/versions - Get plugin versions
router.get('/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await pluginService.getVersions(req.params.id);
    res.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

// POST /api/plugins/:id/versions - Add new version
router.post('/:id/versions', async (req: Request, res: Response) => {
  try {
    const version = await pluginService.addVersion(req.params.id, req.body, '');
    if (!version) {
      res.status(404).json({ error: 'Plugin not found' });
      return;
    }
    res.status(201).json(version);
  } catch (error) {
    console.error('Error adding version:', error);
    res.status(500).json({ error: 'Failed to add version' });
  }
});

// POST /api/plugins/:id/rate - Rate a plugin
router.post('/:id/rate', async (req: Request, res: Response) => {
  try {
    const { rating } = req.body;
    if (typeof rating !== 'number' || rating < 0 || rating > 5) {
      res.status(400).json({ error: 'Rating must be a number between 0 and 5' });
      return;
    }
    await pluginService.updateRating(req.params.id, rating);
    res.json({ success: true });
  } catch (error) {
    console.error('Error rating plugin:', error);
    res.status(500).json({ error: 'Failed to rate plugin' });
  }
});

// POST /api/plugins/:id/download - Increment download count
router.post('/:id/download', async (req: Request, res: Response) => {
  try {
    await pluginService.incrementDownloads(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error incrementing downloads:', error);
    res.status(500).json({ error: 'Failed to increment downloads' });
  }
});

export default router;
