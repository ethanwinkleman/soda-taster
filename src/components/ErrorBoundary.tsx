import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-6">
          <div className="max-w-sm w-full text-center">
            <div className="mb-6">
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Something went wrong.
              </h1>
              <p className="font-sans text-sm text-gray-500 dark:text-gray-400">
                An unexpected error occurred. Reload the page to continue.
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 rounded-xl font-sans text-xs font-bold uppercase tracking-wider text-white bg-sky-600 dark:bg-sky-400 dark:text-gray-950 hover:bg-sky-700 dark:hover:bg-sky-300 transition-colors shadow-[0_4px_14px_-4px_rgba(255,61,120,0.35)]"
            >
              Reload
            </button>
            <details className="mt-6 text-left">
              <summary className="font-sans text-xs text-gray-400 dark:text-gray-600 cursor-pointer hover:text-gray-600 dark:hover:text-gray-400">
                Error details
              </summary>
              <pre className="mt-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-900 text-xs text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
                {this.state.error.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
