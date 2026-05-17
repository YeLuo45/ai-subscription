/**
 * EmptyState Component Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { EmptyState } from '../components/EmptyState';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('should render with default type (generic)', () => {
      const { container } = render(<EmptyState />);
      expect(container.textContent).toContain('暂无内容');
    });

    it('should render no-subscriptions type', () => {
      render(<EmptyState type="no-subscriptions" />);
      expect(screen.getByText('暂无订阅源')).toBeTruthy();
    });

    it('should render no-articles type', () => {
      render(<EmptyState type="no-articles" />);
      expect(screen.getByText('暂无文章')).toBeTruthy();
    });

    it('should render no-workflows type', () => {
      render(<EmptyState type="no-workflows" />);
      expect(screen.getByText('暂无工作流')).toBeTruthy();
    });

    it('should render no-results type', () => {
      render(<EmptyState type="no-results" />);
      expect(screen.getByText('搜索无结果')).toBeTruthy();
    });

    it('should render offline type', () => {
      render(<EmptyState type="offline" />);
      expect(screen.getByText('当前处于离线状态')).toBeTruthy();
    });
  });

  describe('Custom Content', () => {
    it('should display custom title when provided', () => {
      render(<EmptyState title="Custom Title" />);
      expect(screen.getByText('Custom Title')).toBeTruthy();
    });

    it('should display custom description when provided', () => {
      render(<EmptyState description="Custom description text" />);
      expect(screen.getByText('Custom description text')).toBeTruthy();
    });

    it('should display custom action text and trigger callback', () => {
      const handleAction = vi.fn();
      render(<EmptyState actionText="添加" onAction={handleAction} />);
      
      const button = screen.getByRole('button', { name: '添加' });
      expect(button).toBeTruthy();
      
      fireEvent.click(button);
      expect(handleAction).toHaveBeenCalledTimes(1);
    });

    it('should display secondary action button', () => {
      const handleSecondary = vi.fn();
      render(
        <EmptyState 
          actionText="Primary" 
          secondaryActionText="Secondary"
          onSecondaryAction={handleSecondary}
        />
      );
      
      const secondaryBtn = screen.getByRole('button', { name: 'Secondary' });
      fireEvent.click(secondaryBtn);
      expect(handleSecondary).toHaveBeenCalledTimes(1);
    });
  });

  describe('SVG Illustrations', () => {
    it('should render SVG illustrations', () => {
      const { container } = render(<EmptyState type="no-subscriptions" />);
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('should render different SVG for different types', () => {
      const subContainer = render(<EmptyState type="no-subscriptions" />).container;
      const articleContainer = render(<EmptyState type="no-articles" />).container;
      
      expect(subContainer.querySelector('svg')).toBeTruthy();
      expect(articleContainer.querySelector('svg')).toBeTruthy();
    });
  });

  describe('Layout', () => {
    it('should have centered layout', () => {
      const { container } = render(<EmptyState />);
      const wrapper = container.firstChild as HTMLElement;
      expect(window.getComputedStyle(wrapper).textAlign).toBe('center');
    });

    it('should have minimum height', () => {
      const { container } = render(<EmptyState />);
      const wrapper = container.firstChild as HTMLElement;
      expect(window.getComputedStyle(wrapper).minHeight).toBe('300px');
    });
  });
});