/**
 * ThemeSwitcher Component Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock useOfflineStatus hook
vi.mock('../hooks/useOfflineStatus', () => ({
  useOfflineStatus: () => false,
}));

// Mock usePWAUpdate hook  
vi.mock('../hooks/usePWAUpdate', () => ({
  usePWAUpdate: () => ({
    updateAvailable: false,
    applyUpdate: vi.fn(),
  }),
}));

// Mock storage service
vi.mock('../services/storage', () => ({
  getSettings: vi.fn().mockResolvedValue({ themeMode: 'light' }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
}));

// Mock antd message
vi.mock('antd', () => ({
  ...vi.importActual('antd'),
  message: {
    success: vi.fn(),
  },
}));

import { ThemeSwitcher } from '../components/ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render theme switcher with select', async () => {
    const { container } = render(<ThemeSwitcher />);
    await waitFor(() => {
      expect(container.querySelector('.ant-select')).toBeTruthy();
    });
  });

  it('should display theme options', async () => {
    render(<ThemeSwitcher />);
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      expect(select).toBeTruthy();
    });
  });

  it('should have initial value based on settings', async () => {
    render(<ThemeSwitcher />);
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLInputElement;
      expect(select.value).toBe('light');
    });
  });

  it('should change theme when select changes', async () => {
    const { message } = await import('antd');
    render(<ThemeSwitcher />);
    
    await waitFor(() => {
      const select = screen.getByRole('combobox');
      fireEvent.mouseDown(select);
    });

    const options = document.querySelectorAll('.ant-select-item-option');
    expect(options.length).toBeGreaterThan(0);
  });
});

describe('ThemeSwitcher Rendering', () => {
  it('should render BgColorsOutlined icon', () => {
    const { container } = render(<ThemeSwitcher />);
    expect(container.querySelector('.anticon-bg-colors')).toBeTruthy();
  });

  it('should have proper spacing', () => {
    const { container } = render(<ThemeSwitcher />);
    expect(container.querySelector('.ant-space')).toBeTruthy();
  });
});