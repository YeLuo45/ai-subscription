import express, { Request, Response, NextFunction } from 'express';
import { Plugin } from '../types';

const router = express.Router();

// Device authentication middleware
const authenticateDevice = (req: Request, res: Response, next: NextFunction) => {
  const deviceId = req.headers['x-device-id'] as string;
  if (!deviceId) {
    return res.status(401).json({ error: 'Missing X-Device-Id header' });
  }
  (req as any).deviceId = deviceId;
  next();
};

// Sync state interface
interface SyncState {
  deviceId: string;
  lastSyncTime: number;
  entities: Record<string, any>;
}

// In-memory sync store (replace with database in production)
const syncStore = new Map<string, SyncState>();

// Get all changes since last sync
router.get('/delta', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).deviceId;
    const since = parseInt(req.query.since as string) || 0;
    const state = syncStore.get(deviceId);
    
    if (!state) {
      return res.json({ changes: [], lastSyncTime: Date.now() });
    }

    const changes: any[] = [];
    for (const [id, entity] of Object.entries(state.entities)) {
      if ((entity as any).updatedAt > since) {
        changes.push(entity);
      }
    }

    res.json({
      changes,
      lastSyncTime: Date.now(),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delta' });
  }
});

// Push local changes
router.post('/push', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).deviceId;
    const { changes } = req.body;

    if (!Array.isArray(changes)) {
      return res.status(400).json({ error: 'changes must be an array' });
    }

    let state = syncStore.get(deviceId);
    if (!state) {
      state = { deviceId, lastSyncTime: Date.now(), entities: {} };
      syncStore.set(deviceId, state);
    }

    for (const change of changes) {
      const existing = state.entities[change.id];
      // Last-Write-Wins: only update if newer
      if (!existing || change.updatedAt > existing.updatedAt) {
        state.entities[change.id] = {
          ...change,
          updatedAt: Date.now(),
          syncedBy: deviceId,
        };
      }
    }

    state.lastSyncTime = Date.now();
    res.json({ success: true, lastSyncTime: state.lastSyncTime });
  } catch (error) {
    res.status(500).json({ error: 'Failed to push changes' });
  }
});

// Get full sync state
router.get('/state', authenticateDevice, async (req: Request, res: Response) => {
  try {
    const deviceId = (req as any).deviceId;
    const state = syncStore.get(deviceId);
    
    if (!state) {
      return res.json({ entities: {}, lastSyncTime: Date.now() });
    }

    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch state' });
  }
});

// Register device
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceName } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    let state = syncStore.get(deviceId);
    if (!state) {
      state = { deviceId, lastSyncTime: Date.now(), entities: {} };
      syncStore.set(deviceId, state);
    }

    res.json({ success: true, deviceId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register device' });
  }
});

export default router;
