/**
 * Public List Types for RSS/Atom Feed Sharing
 */

export interface PublicList {
  id: string;
  name: string;
  description: string;
  feedIds: string[];       // Which feeds to include
  createdAt: number;
  updatedAt: number;
}

export interface PublicListItem {
  id: string;
  listId: string;
  articleId: string;
  addedAt: number;
}

// RSS/Atom item structure for output
export interface RSSItem {
  title: string;
  link: string;
  description: string;     // AI summary
  pubDate: string;
  author?: string;
  categories?: string[];
  guid?: string;
}

export interface FeedInfo {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export function generatePublicListId(): string {
  return `pl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createPublicList(params: {
  name: string;
  description: string;
  feedIds: string[];
}): PublicList {
  const now = Date.now();
  return {
    id: generatePublicListId(),
    name: params.name,
    description: params.description,
    feedIds: params.feedIds,
    createdAt: now,
    updatedAt: now,
  };
}
