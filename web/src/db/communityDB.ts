/**
 * IndexedDB Database Layer for Community Features
 * Tables: community_profiles, community_follows, community_comments
 */

import type { LocalUserProfile, Follow, Comment } from '../types/community';

const DB_NAME = 'ai-subscription-community';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Local user profile table
      if (!db.objectStoreNames.contains('profiles')) {
        const store = db.createObjectStore('profiles', { keyPath: 'id' });
        store.createIndex('username', 'username', { unique: true });
      }

      // Follows table
      if (!db.objectStoreNames.contains('follows')) {
        const store = db.createObjectStore('follows', { keyPath: 'id' });
        store.createIndex('followerId', 'followerId', { unique: false });
        store.createIndex('followingId', 'followingId', { unique: false });
        store.createIndex('follower_following', ['followerId', 'followingId'], { unique: true });
      }

      // Comments table
      if (!db.objectStoreNames.contains('comments')) {
        const store = db.createObjectStore('comments', { keyPath: 'id' });
        store.createIndex('listId', 'listId', { unique: false });
        store.createIndex('userId', 'userId', { unique: false });
      }

      // Public lists sharing table
      if (!db.objectStoreNames.contains('shared_lists')) {
        const store = db.createObjectStore('shared_lists', { keyPath: 'id' });
        store.createIndex('authorId', 'authorId', { unique: false });
        store.createIndex('visibility', 'visibility', { unique: false });
      }
    };
  });
}

function tx(storeName: string, mode: IDBTransactionMode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// Local Profile Operations
// ============================================================

export async function getLocalProfile(): Promise<LocalUserProfile | null> {
  const { store } = await tx('profiles');
  const all = await promisifyRequest<LocalUserProfile[]>(store.getAll());
  return all.length > 0 ? all[0] : null;
}

export async function saveLocalProfile(profile: LocalUserProfile): Promise<void> {
  const { store } = await tx('profiles', 'readwrite');
  await promisifyRequest(store.put(profile));
}

export async function updateLocalProfile(updates: Partial<LocalUserProfile>): Promise<LocalUserProfile | null> {
  const current = await getLocalProfile();
  if (!current) return null;
  
  const updated = { ...current, ...updates };
  await saveLocalProfile(updated);
  return updated;
}

export async function getProfileByUsername(username: string): Promise<LocalUserProfile | null> {
  const { store } = await tx('profiles');
  const index = store.index('username');
  return promisifyRequest<LocalUserProfile | undefined>(index.get(username)) || null;
}

// ============================================================
// Follow Operations
// ============================================================

export async function followUser(followerId: string, followingId: string): Promise<Follow> {
  const { store } = await tx('follows', 'readwrite');
  const follow: Follow = {
    id: `follow_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    followerId,
    followingId,
    createdAt: Date.now(),
  };
  await promisifyRequest(store.put(follow));
  return follow;
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { store } = await tx('follows', 'readwrite');
  const index = store.index('follower_following');
  const result = await promisifyRequest<Follow | undefined>(index.get([followerId, followingId]));
  if (result) {
    store.delete(result.id);
  }
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { store } = await tx('follows');
  const index = store.index('follower_following');
  const result = await promisifyRequest<Follow | undefined>(index.get([followerId, followingId]));
  return !!result;
}

export async function getFollowers(userId: string): Promise<Follow[]> {
  const { store } = await tx('follows');
  const index = store.index('followingId');
  return promisifyRequest<Follow[]>(index.getAll(userId));
}

export async function getFollowing(userId: string): Promise<Follow[]> {
  const { store } = await tx('follows');
  const index = store.index('followerId');
  return promisifyRequest<Follow[]>(index.getAll(userId));
}

export async function getFollowerCount(userId: string): Promise<number> {
  const followers = await getFollowers(userId);
  return followers.length;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const following = await getFollowing(userId);
  return following.length;
}

// ============================================================
// Comment Operations
// ============================================================

export async function addComment(listId: string, userId: string, content: string): Promise<Comment> {
  const { store } = await tx('comments', 'readwrite');
  const comment: Comment = {
    id: `comment_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    listId,
    userId,
    content,
    createdAt: Date.now(),
  };
  await promisifyRequest(store.put(comment));
  return comment;
}

export async function deleteComment(commentId: string): Promise<void> {
  const { store } = await tx('comments', 'readwrite');
  await promisifyRequest(store.delete(commentId));
}

export async function getCommentsByListId(listId: string): Promise<Comment[]> {
  const { store } = await tx('comments');
  const index = store.index('listId');
  const comments = await promisifyRequest<Comment[]>(index.getAll(listId));
  return comments.sort((a, b) => a.createdAt - b.createdAt);
}

export async function getCommentsByUserId(userId: string): Promise<Comment[]> {
  const { store } = await tx('comments');
  const index = store.index('userId');
  return promisifyRequest<Comment[]>(index.getAll(userId));
}