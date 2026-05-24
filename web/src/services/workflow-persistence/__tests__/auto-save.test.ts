/**
 * Auto-Save Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WorkflowCanvasData, SaveIndicatorState } from '../types';
import { AutoSaveManager, DEFAULT_DEBOUNCE_MS } from '../auto-save';

describe('auto-save', () => {
  describe('AutoSaveManager', () => {
    let manager: AutoSaveManager;

    beforeEach(() => {
      manager = new AutoSaveManager({ debounceMs: 300 });
    });

    describe('initial state', () => {
      it('should start in saved state', () => {
        expect(manager.getState()).toBe('saved');
      });

      it('should not be dirty initially', () => {
        expect(manager.isDirty('any_workflow')).toBe(false);
      });
    });

    describe('markDirty', () => {
      it('should mark workflow as dirty', () => {
        manager.markDirty('workflow_1');
        expect(manager.isDirty('workflow_1')).toBe(true);
      });

      it('should update state to unsaved', () => {
        manager.markDirty('workflow_1');
        expect(manager.getState()).toBe('unsaved');
      });
    });

    describe('markClean', () => {
      it('should mark workflow as clean', () => {
        manager.markDirty('workflow_1');
        manager.markClean('workflow_1');
        expect(manager.isDirty('workflow_1')).toBe(false);
      });

      it('should return to saved state when all workflows clean', () => {
        manager.markDirty('workflow_1');
        manager.markDirty('workflow_2');
        manager.markClean('workflow_1');
        expect(manager.getState()).toBe('unsaved');
        manager.markClean('workflow_2');
        expect(manager.getState()).toBe('saved');
      });
    });

    describe('subscribe', () => {
      it('should receive state change notifications', () => {
        const states: SaveIndicatorState[] = [];
        manager.subscribe(state => states.push(state));

        manager.markDirty('workflow_1');
        manager.markClean('workflow_1');

        expect(states).toContain('unsaved');
        expect(states).toContain('saved');
      });

      it('should return unsubscribe function', () => {
        let callCount = 0;
        const unsubscribe = manager.subscribe(() => callCount++);
        unsubscribe();
        manager.markDirty('workflow_1');
        expect(callCount).toBe(1);
      });
    });
  });

  describe('DEFAULT_DEBOUNCE_MS', () => {
    it('should be 300ms', () => {
      expect(DEFAULT_DEBOUNCE_MS).toBe(300);
    });
  });
});