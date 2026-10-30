import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface S {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, S> {
  state: S = { error: null };
  static getDerivedStateFromError(error: Error): S {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('UI error', error, info.componentStack);
  }
  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="container-app py-20">
        <div className="panel mx-auto max-w-lg p-6 text-center">
          <h1 className="text-xl">Something broke in the lab</h1>
          <p className="mt-2 text-sm text-slate-400">Your saved progress is stored locally and was not changed. Reloading usually fixes this.</p>
          <button type="button" className="btn btn-primary mt-5" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    );
  }
}
