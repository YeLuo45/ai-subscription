/**
 * Feed Category Service
 * Business logic for feed categorization and tag recommendation
 */

import { analyzeFeedCategory, type CategoryAnalysisResult } from './feed-analyzer';
import { recommendTags, type ArticleForTagging } from './tag-recommender';
import * as storage from './storage';
import type { FeedCategory, TagRecommendation, TagLibrary } from './types';

// ============================================================
// Feed Category Service
// ============================================================

export class FeedCategoryService {
  /**
   * Analyze a feed and save its category classification
   */
  async analyzeFeed(
    feedUrl: string,
    feedTitle: string,
    recentTitles: string[],
    feedId: string
  ): Promise<FeedCategory> {
    const analysis = await analyzeFeedCategory(feedUrl, feedTitle, recentTitles);

    const feedCategory: FeedCategory = {
      id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      feedId,
      feedUrl,
      feedTitle,
      categories: analysis.categories,
      confidence: analysis.confidence,
      analyzedAt: Date.now(),
    };

    await storage.saveFeedCategory(feedCategory);
    return feedCategory;
  }

  /**
   * Get category for a specific feed
   */
  async getFeedCategory(feedId: string): Promise<FeedCategory | null> {
    return storage.getFeedCategory(feedId);
  }

  /**
   * Get all feed categories
   */
  async getAllFeedCategories(): Promise<FeedCategory[]> {
    return storage.getAllFeedCategories();
  }

  /**
   * Recommend tags for an article
   */
  async recommendTags(
    article: { id: string; title: string; content: string; feedId: string }
  ): Promise<TagRecommendation[]> {
    // Get feed categories for context
    const feedCategory = await storage.getFeedCategory(article.feedId);
    const feedCategories = feedCategory?.categories || [];

    const articleForTagging: ArticleForTagging = {
      title: article.title,
      content: article.content,
      feedCategories,
    };

    const tags = await recommendTags(articleForTagging);

    // Save recommendation
    await storage.saveTagRecommendation({
      articleId: article.id,
      feedId: article.feedId,
      tags,
      createdAt: Date.now(),
    });

    // Update tag library
    for (const tag of tags) {
      await this.ensureTagInLibrary(tag.tag, feedCategories[0]);
    }

    return tags;
  }

  /**
   * Apply approved tags to an article
   */
  async applyTags(articleId: string, tags: string[]): Promise<void> {
    // This would integrate with the existing tag system
    // For now, just update the tag library counts
    for (const tagName of tags) {
      const existing = await storage.findTagLibraryByName(tagName);
      if (existing) {
        await storage.incrementTagArticleCount(existing.id, 1);
      }
    }
  }

  /**
   * Get the tag library
   */
  async getTagLibrary(): Promise<TagLibrary[]> {
    return storage.getTagLibrary();
  }

  /**
   * Ensure a tag exists in the library
   */
  private async ensureTagInLibrary(tagName: string, category?: string): Promise<TagLibrary> {
    const existing = await storage.findTagLibraryByName(tagName);

    if (existing) {
      return existing;
    }

    const newTag: TagLibrary = {
      id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: tagName,
      alias: [],
      category,
      articleCount: 0,
    };

    await storage.saveTagLibrary(newTag);
    return newTag;
  }

  /**
   * Merge source tag into target tag
   */
  async mergeTags(sourceTag: string, targetTag: string): Promise<void> {
    const sourceLibrary = await storage.findTagLibraryByName(sourceTag);
    const targetLibrary = await storage.findTagLibraryByName(targetTag);

    if (!targetLibrary) {
      // Rename source to target
      if (sourceLibrary) {
        await storage.updateTagLibrary(sourceLibrary.id, { name: targetTag });
      }
      return;
    }

    // Transfer article count
    if (sourceLibrary) {
      await storage.updateTagLibrary(targetLibrary.id, {
        articleCount: targetLibrary.articleCount + sourceLibrary.articleCount,
        alias: [...targetLibrary.alias, sourceTag],
      });

      // Delete source
      await storage.deleteTagLibrary(sourceLibrary.id);
    }
  }

  /**
   * Add alias to a tag
   */
  async addTagAlias(tagId: string, alias: string): Promise<void> {
    const tag = await storage.getTagLibraryById(tagId);
    if (tag && !tag.alias.includes(alias)) {
      await storage.updateTagLibrary(tagId, { alias: [...tag.alias, alias] });
    }
  }

  /**
   * Update tag category
   */
  async updateTagCategory(tagId: string, category: string): Promise<void> {
    await storage.updateTagLibrary(tagId, { category });
  }
}

// Singleton instance
let serviceInstance: FeedCategoryService | null = null;

export function getFeedCategoryService(): FeedCategoryService {
  if (!serviceInstance) {
    serviceInstance = new FeedCategoryService();
  }
  return serviceInstance;
}
