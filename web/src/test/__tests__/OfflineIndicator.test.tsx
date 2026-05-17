/**
 * OfflineIndicator Component Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

// Mock hooks
vi.mock('../hooks/useOfflineStatus', () => ({
  useOfflineStatus: vi.fn(),
}));

vi.mock('../hooks/usePWAUpdate', () => ({
  usePWAUpdate: vi.fn(),
}));

import { OfflineIndicator } from '../components/OfflineIndicator';
import { useOfflineStatus } from '../hooks/useOfflineStatus';
import { usePWAUpdate } from '../hooks/usePWAUpdate';

describe('OfflineIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Online State', () => {
    it('should return null when online with no update', () => {
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: false,
        applyUpdate: vi.fn(),
      });
      
      const { container } = render(<OfflineIndicator />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Offline State', () => {
    it('should display offline indicator when offline', () => {
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: false,
        applyUpdate: vi.fn(),
      });
      
      render(<OfflineIndicator />);
      expect(screen.getByText('离线模式 - 部分功能可能受限')).toBeTruthy();
    });

    it('should show WifiOutlined icon when offline', () => {
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: false,
        applyUpdate: vi.fn(),
      });
      
      const { container } = render(<OfflineIndicator />);
      expect(container.querySelector('.anticon-wifi')).toBeTruthy();
    });
  });

  describe('Update Available State', () => {
    it('should display update notification when update available', () => {
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: true,
        applyUpdate: vi.fn(),
      });
      
      render(<OfflineIndicator />);
      expect(screen.getByText('发现新版本，点击更新')).toBeTruthy();
    });

    it('should show CloudSyncOutlined icon for updates', () => {
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: true,
        applyUpdate: vi.fn(),
      });
      
      const { container } = render(<OfflineIndicator />);
      expect(container.querySelector('.anticon-cloud-sync')).toBeTruthy();
    });

    it('should call applyUpdate when clicked', () => {
      const applyUpdate = vi.fn();
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: true,
        applyUpdate,
      });
      
      const { getByRole } = render(<OfflineIndicator />);
      const indicator = getByRole('button');
      indicator.click();
      
      expect(applyUpdate).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible', () => {
      const applyUpdate = vi.fn();
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(false);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: true,
        applyUpdate,
      });
      
      const { getByRole } = render(<OfflineIndicator />);
      const indicator = getByRole('button');
      
      indicator.focus();
      expect(document.activeElement).toBe(indicator);
      
      // Simulate Enter key
      indicator.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(applyUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Positioning', () => {
    it('should be fixed positioned at bottom center', () => {
      (useOfflineStatus as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (usePWAUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
        updateAvailable: false,
        applyUpdate: vi.fn(),
      });
      
      const { container } = render(<OfflineIndicator />);
      const indicator = container.firstChild as HTMLElement;
      
      expect(window.getComputedStyle(indicator).position).toBe('fixed');
      expect(window.getComputedStyle(indicator).bottom).toBe('16px');
      expect(window.getComputedStyle(indicator).left).toBe('50%');
    });
  });
});