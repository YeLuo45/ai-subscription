// Review service - handles plugin review state machine
import { storageService } from './storage-service';
import { ReviewItem } from '../types';
import { pluginService } from './plugin-service';

export class ReviewService {
  private reviews: Map<string, ReviewItem> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const plugins = storageService.getPlugins();
    plugins.forEach(p => {
      if (p.status === 'pending') {
        const review: ReviewItem = {
          id: `review-${p.id}`,
          pluginId: p.id,
          status: 'pending',
          createdAt: p.createdAt,
          updatedAt: p.updatedAt
        };
        this.reviews.set(p.id, review);
      }
    });
  }

  private saveReview(pluginId: string, review: ReviewItem): void {
    this.reviews.set(pluginId, review);
  }

  async submitForReview(pluginId: string): Promise<ReviewItem> {
    const plugin = await pluginService.getPluginById(pluginId);
    if (!plugin) {
      throw new Error('Plugin not found');
    }

    plugin.status = 'pending';
    storageService.savePlugin(plugin);

    const review: ReviewItem = {
      id: `review-${pluginId}`,
      pluginId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.saveReview(pluginId, review);
    return review;
  }

  async getPendingReviews(): Promise<ReviewItem[]> {
    return Array.from(this.reviews.values()).filter(r => r.status === 'pending');
  }

  async approve(reviewId: string, reviewer: string, comment?: string): Promise<ReviewItem | null> {
    const pluginId = reviewId.replace('review-', '');
    const review = this.reviews.get(pluginId);
    
    if (!review) return null;

    review.status = 'approved';
    review.reviewer = reviewer;
    review.comment = comment;
    review.updatedAt = new Date().toISOString();

    const plugin = await pluginService.getPluginById(pluginId);
    if (plugin) {
      plugin.status = 'approved';
      storageService.savePlugin(plugin);
    }

    this.saveReview(pluginId, review);
    return review;
  }

  async reject(reviewId: string, reviewer: string, comment?: string): Promise<ReviewItem | null> {
    const pluginId = reviewId.replace('review-', '');
    const review = this.reviews.get(pluginId);
    
    if (!review) return null;

    review.status = 'rejected';
    review.reviewer = reviewer;
    review.comment = comment;
    review.updatedAt = new Date().toISOString();

    const plugin = await pluginService.getPluginById(pluginId);
    if (plugin) {
      plugin.status = 'rejected';
      storageService.savePlugin(plugin);
    }

    this.saveReview(pluginId, review);
    return review;
  }

  async getReviewByPluginId(pluginId: string): Promise<ReviewItem | null> {
    return this.reviews.get(pluginId) || null;
  }
}

export const reviewService = new ReviewService();
