/**
 * Plugin Registry Tests
 * Tests for PluginRegistry singleton
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginRegistry } from '../../../../shared/lib/event-bus/plugins/registry';
import { PluginManifest, HookEvent, PluginAPI } from '../../../../shared/lib/event-bus/plugins/types';

describe('PluginRegistry', () => {
  let registry: PluginRegistry;

  beforeEach(() => {
    PluginRegistry.resetInstance();
    registry = PluginRegistry.getInstance();
  });

  afterEach(() => {
    PluginRegistry.resetInstance();
  });

  const createPluginRegistration = (id: string, hooks: HookEvent[], enabled = true) => ({
    manifest: {
      id,
      name: `Test Plugin ${id}`,
      version: '1.0.0',
      description: `Test plugin ${id}`,
      hooks,
      enabled,
    } as PluginManifest,
    factory: (api: PluginAPI) => {
      // no-op factory for testing
    },
  });

  describe('register/unregister', () => {
    it('should register a plugin and list it', () => {
      const reg = createPluginRegistration('test-plugin-1', [HookEvent.SYNC_BEFORE, HookEvent.SYNC_AFTER]);
      registry.register(reg);
      
      const plugins = registry.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].manifest.id).toBe('test-plugin-1');
    });

    it('should not duplicate on duplicate register', () => {
      const reg = createPluginRegistration('test-plugin-dup', [HookEvent.SYNC_BEFORE]);
      registry.register(reg);
      registry.register(reg); // second register
      
      expect(registry.getPlugins()).toHaveLength(1);
    });
  });

  describe('enable/disable', () => {
    it('should enable a disabled plugin', () => {
      const reg = createPluginRegistration('test-plugin-enable', [HookEvent.SYNC_BEFORE], false);
      registry.register(reg);
      
      expect(registry.isEnabled('test-plugin-enable')).toBe(false);
      
      const result = registry.enable('test-plugin-enable');
      expect(result).toBe(true);
      expect(registry.isEnabled('test-plugin-enable')).toBe(true);
    });

    it('should disable an enabled plugin', () => {
      const reg = createPluginRegistration('test-plugin-disable', [HookEvent.SYNC_BEFORE], true);
      registry.register(reg);
      
      expect(registry.isEnabled('test-plugin-disable')).toBe(true);
      
      const result = registry.disable('test-plugin-disable');
      expect(result).toBe(true);
      expect(registry.isEnabled('test-plugin-disable')).toBe(false);
    });

    it('should return false for non-existent plugin', () => {
      const result = registry.enable('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('emit', () => {
    it('should call handler when emitting event', async () => {
      const reg = createPluginRegistration('test-plugin-emit', [HookEvent.SYNC_BEFORE], true);
      registry.register(reg);

      let called = false;
      reg.factory({
        registerHook: (event: HookEvent, handler) => {
          if (event === HookEvent.SYNC_BEFORE) {
            // Register the handler
            registry.emit(event, { event, timestamp: Date.now() });
          }
        },
        unregisterHook: () => {},
        emit: () => {},
        getConfig: () => ({}),
        setConfig: () => {},
      });

      // Direct test: subscribe handler and emit
      const handler = () => { called = true; };
      // Access internal handlers through a plugin that uses registerHook
      const testPlugin = createPluginRegistration('test-plugin-emit-handler', [HookEvent.SYNC_BEFORE], true);
      testPlugin.factory = (api) => {
        api.registerHook(HookEvent.SYNC_BEFORE, handler);
      };
      registry.register(testPlugin);
      
      await registry.emit(HookEvent.SYNC_BEFORE, { event: HookEvent.SYNC_BEFORE, timestamp: Date.now() });
      expect(called).toBe(true);
    });

    it('should not call disabled plugin handlers', async () => {
      const testPlugin = createPluginRegistration('test-plugin-disabled-emit', [HookEvent.SYNC_BEFORE], false);
      let called = false;
      testPlugin.factory = (api) => {
        api.registerHook(HookEvent.SYNC_BEFORE, () => { called = true; });
      };
      registry.register(testPlugin);
      
      registry.disable('test-plugin-disabled-emit');
      await registry.emit(HookEvent.SYNC_BEFORE, { event: HookEvent.SYNC_BEFORE, timestamp: Date.now() });
      expect(called).toBe(false);
    });

    it('should emit to multiple handlers', async () => {
      const testPlugin1 = createPluginRegistration('test-plugin-multi-1', [HookEvent.SYNC_BEFORE], true);
      const testPlugin2 = createPluginRegistration('test-plugin-multi-2', [HookEvent.SYNC_BEFORE], true);
      
      let callCount = 0;
      testPlugin1.factory = (api) => {
        api.registerHook(HookEvent.SYNC_BEFORE, () => { callCount++; });
      };
      testPlugin2.factory = (api) => {
        api.registerHook(HookEvent.SYNC_BEFORE, () => { callCount++; });
      };
      
      registry.register(testPlugin1);
      registry.register(testPlugin2);
      
      await registry.emit(HookEvent.SYNC_BEFORE, { event: HookEvent.SYNC_BEFORE, timestamp: Date.now() });
      expect(callCount).toBe(2);
    });
  });

  describe('getPlugins', () => {
    it('should return all registered plugins', () => {
      const reg1 = createPluginRegistration('get-plugins-1', [HookEvent.SYNC_BEFORE]);
      const reg2 = createPluginRegistration('get-plugins-2', [HookEvent.SYNC_AFTER]);
      
      registry.register(reg1);
      registry.register(reg2);
      
      const plugins = registry.getPlugins();
      expect(plugins).toHaveLength(2);
    });

    it('should return empty array when no plugins', () => {
      const plugins = registry.getPlugins();
      expect(plugins).toHaveLength(0);
    });
  });

  describe('getPlugin', () => {
    it('should return specific plugin by ID', () => {
      const reg = createPluginRegistration('get-plugin-specific', [HookEvent.SYNC_BEFORE]);
      registry.register(reg);
      
      const plugin = registry.getPlugin('get-plugin-specific');
      expect(plugin).toBeDefined();
      expect(plugin?.manifest.id).toBe('get-plugin-specific');
    });

    it('should return undefined for non-existent plugin', () => {
      const plugin = registry.getPlugin('non-existent');
      expect(plugin).toBeUndefined();
    });
  });

  describe('isEnabled', () => {
    it('should return true for enabled plugin', () => {
      const reg = createPluginRegistration('is-enabled-true', [HookEvent.SYNC_BEFORE], true);
      registry.register(reg);
      
      expect(registry.isEnabled('is-enabled-true')).toBe(true);
    });

    it('should return false for disabled plugin', () => {
      const reg = createPluginRegistration('is-enabled-false', [HookEvent.SYNC_BEFORE], false);
      registry.register(reg);
      
      expect(registry.isEnabled('is-enabled-false')).toBe(false);
    });

    it('should return false for non-existent plugin', () => {
      expect(registry.isEnabled('non-existent')).toBe(false);
    });
  });

  describe('getInstance', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = PluginRegistry.getInstance();
      const instance2 = PluginRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });
});