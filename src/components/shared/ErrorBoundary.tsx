'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  section?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.section ? `:${this.props.section}` : ''}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Something went wrong{this.props.section ? ` in ${this.props.section}` : ''}.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-3 text-sm font-medium"
            style={{ color: 'var(--color-primary)' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
