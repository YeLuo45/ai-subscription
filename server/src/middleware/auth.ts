// Authentication middleware - simple API Key verification
import { Request, Response, NextFunction } from 'express';

const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'admin-secret-key-2024';
const DEVELOPER_API_KEY = process.env.DEVELOPER_API_KEY || 'dev-secret-key-2024';

export interface AuthRequest extends Request {
  apiKey?: string;
  role?: 'admin' | 'developer';
}

// Export a middleware function
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const apiKey = req.headers['x-api-key'] as string;
  const authReq = req as AuthRequest;

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  if (apiKey === ADMIN_API_KEY) {
    authReq.role = 'admin';
    authReq.apiKey = apiKey;
    next();
    return;
  }

  if (apiKey === DEVELOPER_API_KEY) {
    authReq.role = 'developer';
    authReq.apiKey = apiKey;
    next();
    return;
  }

  res.status(403).json({ error: 'Invalid API key' });
}

export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  const authReq = req as AuthRequest;
  if (authReq.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}
