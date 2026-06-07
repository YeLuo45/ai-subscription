/**
 * CenteredLayout Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  CenteredContainer,
  CenteredSection,
  CenteredCard,
  CenteredEmpty,
  CenteredForm,
  CenteredGrid,
  CenteredHeader,
  CenteredToolbar,
} from '../CenteredLayout';

describe('CenteredContainer', () => {
  it('renders children', () => {
    render(<CenteredContainer><span>hello</span></CenteredContainer>);
    expect(screen.getByText('hello')).toBeTruthy();
  });

  it('applies maxWidth', () => {
    const { container } = render(<CenteredContainer maxWidth={800}><span>hi</span></CenteredContainer>);
    const inner = container.querySelector('.app-centered-content');
    expect((inner as HTMLElement).style.maxWidth).toBe('800px');
  });
});

describe('CenteredSection', () => {
  it('renders title', () => {
    render(<CenteredSection title="My Section">content</CenteredSection>);
    expect(screen.getByText('My Section')).toBeTruthy();
  });

  it('renders extra', () => {
    render(<CenteredSection title="x" extra={<span>extra</span>}>content</CenteredSection>);
    expect(screen.getByText('extra')).toBeTruthy();
  });
});

describe('CenteredCard', () => {
  it('renders title and children', () => {
    render(<CenteredCard title="Card Title">card body</CenteredCard>);
    expect(screen.getByText('Card Title')).toBeTruthy();
    expect(screen.getByText('card body')).toBeTruthy();
  });

  it('renders extra in header', () => {
    render(<CenteredCard title="x" extra={<span>extra-btn</span>}>body</CenteredCard>);
    expect(screen.getByText('extra-btn')).toBeTruthy();
  });
});

describe('CenteredEmpty', () => {
  it('renders default message', () => {
    render(<CenteredEmpty />);
    expect(screen.getByText('No data')).toBeTruthy();
  });

  it('renders custom message', () => {
    render(<CenteredEmpty message="No items" />);
    expect(screen.getByText('No items')).toBeTruthy();
  });

  it('renders description', () => {
    render(<CenteredEmpty message="x" description="more info" />);
    expect(screen.getByText('more info')).toBeTruthy();
  });
});

describe('CenteredForm', () => {
  it('renders children', () => {
    render(<CenteredForm><input /></CenteredForm>);
    expect(screen.getByRole('textbox')).toBeTruthy();
  });
});

describe('CenteredGrid', () => {
  it('renders multiple children', () => {
    render(
      <CenteredGrid>
        <div>a</div>
        <div>b</div>
        <div>c</div>
      </CenteredGrid>
    );
    expect(screen.getByText('a')).toBeTruthy();
    expect(screen.getByText('b')).toBeTruthy();
    expect(screen.getByText('c')).toBeTruthy();
  });
});

describe('CenteredHeader', () => {
  it('renders brand, nav, actions', () => {
    render(
      <CenteredHeader
        brand={<span>Brand</span>}
        nav={<span>Nav</span>}
        actions={<span>Act</span>}
      />
    );
    expect(screen.getByText('Brand')).toBeTruthy();
    expect(screen.getByText('Nav')).toBeTruthy();
    expect(screen.getByText('Act')).toBeTruthy();
  });
});

describe('CenteredToolbar', () => {
  it('renders children', () => {
    render(<CenteredToolbar><button>btn</button></CenteredToolbar>);
    expect(screen.getByText('btn')).toBeTruthy();
  });
});
