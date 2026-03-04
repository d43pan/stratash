import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(err: unknown): State {
    return { error: String(err) };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center h-full w-full">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 max-w-lg text-center">
            <h2 className="text-red-400 font-semibold mb-2">Something went wrong</h2>
            <pre className="text-red-300 text-xs text-left overflow-auto max-h-40 bg-black/30 rounded p-3">
              {this.state.error}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
