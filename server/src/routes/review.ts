// Review queue routes
import { Router, Request, Response } from 'express';
import { reviewService } from '../services/review-service';
import { authMiddleware, adminOnly } from '../middleware/auth';

const router = Router();

// All review routes require authentication
router.use(authMiddleware);

// GET /api/review - Get pending reviews (admin only)
router.get('/', adminOnly, async (req: Request, res: Response) => {
  try {
    const reviews = await reviewService.getPendingReviews();
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// POST /api/review - Submit plugin for review
router.post('/', async (req: Request, res: Response) => {
  try {
    const { pluginId } = req.body;
    if (!pluginId) {
      res.status(400).json({ error: 'pluginId is required' });
      return;
    }

    const review = await reviewService.submitForReview(pluginId);
    res.status(201).json(review);
  } catch (error: any) {
    console.error('Error submitting for review:', error);
    res.status(500).json({ error: error.message || 'Failed to submit for review' });
  }
});

// POST /api/review/:id/approve - Approve a plugin
router.post('/:id/approve', adminOnly, async (req: Request, res: Response) => {
  try {
    const reviewer = req.headers['x-api-key'] as string || 'admin';
    const comment = req.body.comment;
    const review = await reviewService.approve(req.params.id, reviewer, comment);
    
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({ error: 'Failed to approve plugin' });
  }
});

// POST /api/review/:id/reject - Reject a plugin
router.post('/:id/reject', adminOnly, async (req: Request, res: Response) => {
  try {
    const reviewer = req.headers['x-api-key'] as string || 'admin';
    const comment = req.body.comment;
    const review = await reviewService.reject(req.params.id, reviewer, comment);
    
    if (!review) {
      res.status(404).json({ error: 'Review not found' });
      return;
    }

    res.json(review);
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({ error: 'Failed to reject plugin' });
  }
});

export default router;
