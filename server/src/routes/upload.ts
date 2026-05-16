// File upload routes
import { Router, Request, Response } from 'express';
import { storageService } from '../services/storage-service';
import { pluginService } from '../services/plugin-service';
import { uploadFields } from '../middleware/upload';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// All upload routes require authentication
router.use(authMiddleware);

interface MulterRequest extends Request {
  files: { [fieldname: string]: Array<{ buffer: Buffer; originalname: string; mimetype: string }> };
}

// POST /api/upload - Upload plugin zip with manifest
router.post('/', uploadFields, async (req: Request, res: Response) => {
  try {
    const multerReq = req as MulterRequest;
    const files = multerReq.files;
    
    if (!files.zipFile || !files.zipFile[0]) {
      res.status(400).json({ error: 'Zip file is required' });
      return;
    }

    const zipBuffer = files.zipFile[0].buffer;
    const pluginId = req.body.pluginId;
    const version = req.body.version;

    if (!pluginId || !version) {
      res.status(400).json({ error: 'pluginId and version are required' });
      return;
    }

    const zipUrl = await storageService.savePluginZip(zipBuffer, pluginId, version);
    
    // If there's a manifest file, parse it and create a version
    if (files.manifest && files.manifest[0]) {
      try {
        const manifest = JSON.parse(files.manifest[0].buffer.toString());
        await pluginService.addVersion(pluginId, {
          version,
          manifest,
          signature: req.body.signature || '',
          changelog: req.body.changelog
        }, zipUrl);
      } catch (parseError) {
        console.error('Error parsing manifest:', parseError);
      }
    }

    res.json({ success: true, zipUrl });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/upload/:pluginId/:version - Download plugin zip
router.get('/:pluginId/:version', async (req: Request, res: Response) => {
  try {
    const { pluginId, version } = req.params;
    const zipBuffer = await storageService.getPluginZip(pluginId, version);
    
    if (!zipBuffer) {
      res.status(404).json({ error: 'Plugin version not found' });
      return;
    }

    await pluginService.incrementDownloads(pluginId);
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${pluginId}-${version}.zip"`);
    res.send(zipBuffer);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

export default router;
