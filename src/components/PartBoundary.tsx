import { Component, type ReactNode } from 'react';
import { isChunkLoadError, reloadGuard, type Outcome, type ReloadGuard } from '../core/chunkReload';

const online = () => typeof navigator === 'undefined' || navigator.onLine !== false;

type Phase = 'checking' | 'reloading' | 'button';
interface State { failed: boolean; error: unknown; phase: Phase; unreachable: boolean; busy: boolean }

/** Around each lazily loaded part: a part whose chunk failed to load never empties the app. When the
 * server serves a new build it reloads onto it (core/chunkReload.ts); otherwise one button stands in its
 * place, "Reload" when the server answers and "Try again" when it does not. Either reloads only once the
 * server answers, and only when tapped: a browser keeps a failed module for the life of the page, so
 * loading it again in place never works. Any other error is thrown on, as if this boundary were not there. */
export class PartBoundary extends Component<{ children: ReactNode; guard?: Pick<ReloadGuard, 'afterChunkFailure' | 'reloadWhenReachable' | 'onStalled'> }, State> {
  state: State = { failed: false, error: undefined, phase: 'checking', unreachable: false, busy: false };
  private live = true;
  private unsubscribe: (() => void) | null = null;

  static getDerivedStateFromError(error: unknown): Partial<State> { return { failed: true, error, phase: 'checking' }; }

  private get guard() { return this.props.guard ?? reloadGuard; }

  componentDidMount(): void { this.live = true; }

  componentDidCatch(error: unknown): void {
    if (!isChunkLoadError(error)) return;
    addEventListener('online', this.relabel);
    addEventListener('offline', this.relabel);
    void this.guard.afterChunkFailure().then(this.settle);
  }

  componentWillUnmount(): void {
    this.live = false;
    removeEventListener('online', this.relabel);
    removeEventListener('offline', this.relabel);
    this.unsubscribe?.();
  }

  private readonly settle = (outcome: Outcome): void => {
    if (!this.live) return;
    if (outcome === 'reloading') {
      // A reload that never happens (the network is gone though the phone says online) brings the button back.
      this.unsubscribe ??= this.guard.onStalled(() => { this.unsubscribe?.(); this.unsubscribe = null; if (this.live) this.setState({ phase: 'button', busy: false }); });
      this.setState({ phase: 'reloading' });
    } else this.setState({ phase: 'button', unreachable: outcome === 'unreachable', busy: false });
  };

  private readonly relabel = (event: Event): void => { if (this.live) this.setState({ unreachable: event.type === 'offline' }); };

  private readonly reload = (): void => {
    if (this.state.busy) return;
    this.setState({ busy: true });
    void this.guard.reloadWhenReachable().then(this.settle);
  };

  render(): ReactNode {
    const { failed, error, phase, unreachable, busy } = this.state;
    if (!failed) return this.props.children;
    if (!isChunkLoadError(error)) throw error;
    if (phase !== 'button') return null;
    return <button type="button" className="part-retry" disabled={busy} onClick={this.reload}>{unreachable || !online() ? 'Try again' : 'Reload'}</button>;
  }
}

/** Around the whole app: an error no part caught (a bug) leaves one button that reloads, never an empty
 * screen. The error is still reported as uncaught. */
export class AppBoundary extends Component<{ children: ReactNode; guard?: Pick<ReloadGuard, 'reloadWhenReachable'> }, { failed: boolean; busy: boolean }> {
  state = { failed: false, busy: false };

  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }

  componentDidCatch(error: unknown): void {
    if (typeof reportError === 'function') reportError(error);
    else setTimeout(() => { throw error; });
  }

  private readonly reload = (): void => {
    if (this.state.busy) return;
    this.setState({ busy: true });
    void (this.props.guard ?? reloadGuard).reloadWhenReachable().then(() => this.setState({ busy: false }));
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return <button type="button" className="part-retry" disabled={this.state.busy} onClick={this.reload}>Reload</button>;
  }
}
