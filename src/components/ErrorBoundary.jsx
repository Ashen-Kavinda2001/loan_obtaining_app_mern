import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Catches a crash while drawing a page and shows a message with a Reload button instead of a blank
 * white screen. Saved data is not affected: a crash here only means the page could not be drawn.
 * `resetKey` (the current path) clears the error when the user opens another page from the sidebar.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null;
  }

  componentDidCatch(error, info) {
    console.error('Page crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="page-content">
        <div className="card" role="alert" style={{ maxWidth: 480, margin: '40px auto', textAlign: 'center', padding: 28 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <AlertTriangle size={24} color="#D97706" />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>This page could not be shown</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 18, lineHeight: 1.5 }}>
            Something went wrong while drawing this page. Your saved data is safe. Reload to try again,
            or open another page from the menu.
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            <RotateCcw size={14} /> Reload
          </button>
        </div>
      </div>
    );
  }
}
