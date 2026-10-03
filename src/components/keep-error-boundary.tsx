import { Component, type ReactNode } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

type Props = { children: ReactNode; onReset: () => void };

/** Visible fallback so a runtime failure never leaves a blank screen. */
export class KeepErrorBoundary extends Component<Props, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override componentDidCatch(error: unknown) { console.error(error); reportLovableError(error, { boundary: "keep_app" }); }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="app-shell flex min-h-dvh flex-col items-center justify-center px-8 text-center">
        <span className="brand mb-16">KEEP</span>
        <h1 className="display text-5xl">Something slipped.</h1>
        <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">Your draft is saved on this device. Try again or head back to your Keeps.</p>
        <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
          <button className="h-13 rounded-sm bg-primary text-sm font-medium text-primary-foreground" onClick={() => window.location.reload()}>Reload</button>
          <button className="h-13 rounded-sm border border-border text-sm" onClick={() => { this.setState({ failed: false }); this.props.onReset(); }}>Back to Home</button>
        </div>
      </main>
    );
  }
}
