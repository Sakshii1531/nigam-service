import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 text-2xl font-black">
                ⚠️
              </div>
              <div>
                <h1 className="text-xl font-black text-white">Application Error</h1>
                <p className="text-xs text-slate-400 font-medium mt-0.5">An unexpected error occurred in this view.</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-rose-300 overflow-x-auto max-h-48 leading-relaxed">
              <p className="font-bold text-rose-400 mb-1">{this.state.error?.toString()}</p>
              <pre className="text-[10px] text-slate-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all text-xs cursor-pointer shadow-lg shadow-blue-600/30"
              >
                Reload Page
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, errorInfo: null });
                  window.location.href = '/';
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 rounded-xl transition-all text-xs cursor-pointer"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
