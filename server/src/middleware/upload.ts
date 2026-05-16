// Multer upload configuration
import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  },
  fileFilter: (req: Request, file: any, cb: any) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed') {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'));
    }
  }
});

export const uploadFields = upload.fields([
  { name: 'zipFile', maxCount: 1 },
  { name: 'manifest', maxCount: 1 }
]);
