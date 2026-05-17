/**
 * Community Types - Types for community features
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: number;
  publicListCount: number;
  followerCount: number;
  followingCount: number;
}

export interface PublicListWithAuthor extends PublicList {
  author: UserProfile;
}

export interface PublicList {
  id: string;
  name: string;
  description: string;
  feedIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface PublicListItem {
  id: string;
  listId: string;
  articleId: string;
  addedAt: number;
}

export interface RSSItem {
  title: string;
  link: string;
  description: string;
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

export interface Comment {
  id: string;
  listId: string;
  userId: string;
  content: string;
  createdAt: number;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: number;
}

// Local user profile (stored in IndexedDB)
export interface LocalUserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  createdAt: number;
}

export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createLocalUserProfile(params: {
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
}): LocalUserProfile {
  return {
    id: generateUserId(),
    username: params.username,
    displayName: params.displayName,
    avatar: params.avatar,
    bio: params.bio,
    createdAt: Date.now(),
  };
}