'use client';

import React from 'react';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '2rem', textAlign: 'center', border: '1px solid #e0e0e0', borderRadius: '8px', margin: '2rem auto', maxWidth: '600px' }}>
          <h2 style={{ marginBottom: '1rem', color: '#dc2626' }}>Something went wrong</h2>
          {this.state.error && <p style={{ marginBottom: '1.5rem', color: '#666' }}>{this.state.error.message}</p>}
          <button onClick={this.handleReset} style={{ padding: '0.5rem 1rem', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' }}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
