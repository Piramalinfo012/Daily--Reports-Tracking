import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button, Card } from "./ui";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-rose-500/30 bg-rose-500/5 p-6 mt-8">
          <div className="flex items-center gap-3 text-rose-400 mb-4">
            <AlertCircle size={24} />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
          </div>
          <p className="text-sm text-mist-300 mb-6 font-mono bg-ink-950 p-4 rounded-lg overflow-x-auto">
            {this.state.error?.message || "Unknown error occurred"}
          </p>
          <Button variant="secondary" onClick={() => window.location.reload()} icon={<RefreshCw size={16} />}>
            Reload Page
          </Button>
        </Card>
      );
    }
    return this.props.children;
  }
}
