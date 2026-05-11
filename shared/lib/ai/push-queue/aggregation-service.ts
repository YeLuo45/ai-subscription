/**
 * Aggregation Service
 * Manages aggregated push notifications lifecycle
 */

import type { AggregatedPush, CreateAggregationParams, StorageAdapter } from './types';

export class AggregationService {
  constructor(private storage: StorageAdapter) {}

  async createAggregation(params: CreateAggregationParams): Promise<AggregatedPush> {
    const now = Date.now();
    const push: Omit<AggregatedPush, 'id'> = {
      title: params.title,
      summary: params.summary,
      articleIds: params.articleIds,
      scheduledAt: params.scheduledAt,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
    };
    return this.storage.create(push as AggregatedPush);
  }

  async getPending(before: number = Date.now()): Promise<AggregatedPush[]> {
    return this.storage.getPending(before);
  }

  async cancel(id: string): Promise<void> {
    const push = await this.storage.get(id);
    if (!push) throw new Error(`Push not found: ${id}`);
    await this.storage.update({
      ...push,
      status: 'cancelled',
      updatedAt: Date.now(),
    });
  }

  async reschedule(id: string, newTime: number): Promise<void> {
    const push = await this.storage.get(id);
    if (!push) throw new Error(`Push not found: ${id}`);
    if (push.status !== 'pending') {
      throw new Error(`Cannot reschedule non-pending push: ${id} (status: ${push.status})`);
    }
    await this.storage.update({
      ...push,
      scheduledAt: newTime,
      updatedAt: Date.now(),
    });
  }

  async markSent(id: string): Promise<void> {
    const push = await this.storage.get(id);
    if (!push) throw new Error(`Push not found: ${id}`);
    await this.storage.update({
      ...push,
      status: 'sent',
      updatedAt: Date.now(),
    });
  }

  async markError(id: string, retry: boolean = true): Promise<void> {
    const push = await this.storage.get(id);
    if (!push) throw new Error(`Push not found: ${id}`);
    await this.storage.update({
      ...push,
      status: retry ? 'pending' : 'error',
      retryCount: push.retryCount + 1,
      updatedAt: Date.now(),
    });
  }

  async get(id: string): Promise<AggregatedPush | undefined> {
    return this.storage.get(id);
  }

  async getAll(): Promise<AggregatedPush[]> {
    return this.storage.getAll();
  }

  async delete(id: string): Promise<void> {
    return this.storage.delete(id);
  }
}
