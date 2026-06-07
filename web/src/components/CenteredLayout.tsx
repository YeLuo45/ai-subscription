/**
 * CenteredLayout - Symmetric Centered Layout Components
 *
 * Wraps content in a centered max-width container with sticky header/footer.
 */

import React from 'react';

interface CenteredLayoutProps {
  children: React.ReactNode;
  maxWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CenteredContainer: React.FC<CenteredLayoutProps> = ({
  children,
  maxWidth = 1200,
  className = '',
  style,
}) => (
  <div
    className={`app-centered-main ${className}`}
    style={style}
  >
    <div className="app-centered-content" style={{ maxWidth }}>
      {children}
    </div>
  </div>
);

interface CenteredSectionProps {
  children: React.ReactNode;
  title?: string;
  extra?: React.ReactNode;
  className?: string;
}

export const CenteredSection: React.FC<CenteredSectionProps> = ({
  children,
  title,
  extra,
  className = '',
}) => (
  <div className={`app-centered-section ${className}`}>
    {title && (
      <div className="app-centered-section-header">
        <h2 className="app-centered-section-title">{title}</h2>
        {extra}
      </div>
    )}
    {children}
  </div>
);

interface CenteredCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  bodyClassName?: string;
}

export const CenteredCard: React.FC<CenteredCardProps> = ({
  children,
  title,
  extra,
  onClick,
  className = '',
  bodyClassName = '',
}) => (
  <div
    className={`app-centered-card ${onClick ? 'clickable' : ''} ${className}`}
    onClick={onClick}
    style={onClick ? { cursor: 'pointer' } : undefined}
  >
    {title && (
      <div className="app-centered-card-header">
        <span>{title}</span>
        {extra}
      </div>
    )}
    <div className={`app-centered-card-body ${bodyClassName}`}>
      {children}
    </div>
  </div>
);

export const CenteredGrid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-centered-grid">{children}</div>
);

export const CenteredEmpty: React.FC<{ message?: string; description?: string }> = ({
  message = 'No data',
  description,
}) => (
  <div className="app-centered-empty">
    <div style={{ fontSize: 16, marginBottom: 8 }}>{message}</div>
    {description && <div style={{ fontSize: 13 }}>{description}</div>}
  </div>
);

export const CenteredForm: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-centered-form">{children}</div>
);

export const CenteredHeader: React.FC<{ brand: React.ReactNode; nav?: React.ReactNode; actions?: React.ReactNode }> = ({
  brand,
  nav,
  actions,
}) => (
  <header className="app-centered-header">
    <div className="app-centered-header-inner">
      <div className="app-centered-header-brand">{brand}</div>
      <div className="app-centered-header-nav">{nav}</div>
      <div className="app-centered-header-actions">{actions}</div>
    </div>
  </header>
);

export const CenteredToolbar: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-centered-toolbar">
    <div className="app-centered-toolbar-inner">{children}</div>
  </div>
);
