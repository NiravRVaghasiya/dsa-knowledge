// Main-thread controller for the Pyodide worker.
//
// Responsibilities:
//  - lazily spawn the worker (only on first run)
//  - stream stdout/stderr back to the caller
//  - enforce an execution timeout
//  - terminate a runaway worker and transparently respawn a fresh one so the
//    next run starts from a clean interpreter state
//
// Note on security: this is browser-side educational execution, not a sandbox.
// Code runs with the same privileges as any page script (inside a worker).

export const DEFAULT_TIMEOUT_MS = 10_000;

export type RunHandlers = {
  onStdout?: (text: string) => void;
  onStderr?: (text: string) => void;
};

export type RunOutcome =
  | {status: 'ok'}
  | {status: 'error'; error: string}
  | {status: 'timeout'}
  | {status: 'cancelled'};

/** Messages the worker posts back to the main thread. */
type WorkerMessage =
  | {type: 'ready'}
  | {type: 'error'; message: string}
  | {type: 'stdout'; text: string}
  | {type: 'stderr'; text: string}
  | {type: 'result'; id: number; ok: boolean; error?: string};

type Pending = {
  id: number;
  resolve: (outcome: RunOutcome) => void;
  handlers: RunHandlers;
  timeout: ReturnType<typeof setTimeout>;
};

export class PyodideClient {
  private worker: Worker | null = null;
  private readyPromise: Promise<void> | null = null;
  private pending: Pending | null = null;
  private nextId = 1;
  private readonly timeoutMs: number;

  constructor(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.timeoutMs = timeoutMs;
  }

  /** True while a program is executing. */
  get isRunning(): boolean {
    return this.pending !== null;
  }

  private spawn(): Worker {
    // Bundlers (webpack 5, used by Docusaurus) understand this exact form and
    // emit the worker as a separate chunk.
    const worker = new Worker(new URL('./pyodide.worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerMessage>) =>
      this.handleMessage(event.data);
    worker.onerror = (event) => {
      const message =
        (event as ErrorEvent)?.message || 'Python worker crashed.';
      this.failPending({status: 'error', error: message});
    };
    this.worker = worker;
    return worker;
  }

  /** Load the runtime. Safe to call repeatedly; only the first call spawns. */
  ensureReady(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    const worker = this.worker ?? this.spawn();

    this.readyPromise = new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerMessage>) => {
        const data = event.data;
        if (data?.type === 'ready') {
          worker.removeEventListener('message', onMessage);
          resolve();
        } else if (data?.type === 'error') {
          worker.removeEventListener('message', onMessage);
          this.readyPromise = null;
          reject(new Error(data.message));
        }
      };
      worker.addEventListener('message', onMessage);
      worker.postMessage({type: 'init'});
    });

    return this.readyPromise;
  }

  private handleMessage(data: WorkerMessage) {
    if (!data || !this.pending) return;
    switch (data.type) {
      case 'stdout':
        this.pending.handlers.onStdout?.(data.text);
        break;
      case 'stderr':
        this.pending.handlers.onStderr?.(data.text);
        break;
      case 'result':
        if (data.id !== this.pending.id) return;
        this.finishPending(
          data.ok
            ? {status: 'ok'}
            : {status: 'error', error: data.error ?? 'Unknown error'},
        );
        break;
      default:
        break;
    }
  }

  private finishPending(outcome: RunOutcome) {
    if (!this.pending) return;
    clearTimeout(this.pending.timeout);
    const {resolve} = this.pending;
    this.pending = null;
    resolve(outcome);
  }

  private failPending(outcome: RunOutcome) {
    // A crash/timeout invalidates the interpreter: tear the worker down so the
    // next run starts fresh.
    this.hardReset();
    if (!this.pending) return;
    clearTimeout(this.pending.timeout);
    const {resolve} = this.pending;
    this.pending = null;
    resolve(outcome);
  }

  /** Execute code, streaming output through handlers. Resolves with outcome. */
  async run(code: string, handlers: RunHandlers = {}): Promise<RunOutcome> {
    if (this.pending) {
      return {status: 'error', error: 'Another program is already running.'};
    }
    await this.ensureReady();
    const worker = this.worker;
    if (!worker) return {status: 'error', error: 'Worker unavailable.'};

    const id = this.nextId++;
    return new Promise<RunOutcome>((resolve) => {
      const timeout = setTimeout(() => {
        this.failPending({status: 'timeout'});
      }, this.timeoutMs);
      this.pending = {id, resolve, handlers, timeout};
      worker.postMessage({type: 'run', id, code});
    });
  }

  /**
   * Terminate a running program. The worker is killed and respawned, so the
   * next run starts from a clean Python state.
   */
  cancel(): void {
    if (this.pending) {
      this.failPending({status: 'cancelled'});
    }
  }

  /** Kill the worker and reset all state. */
  hardReset(): void {
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.terminate();
      this.worker = null;
    }
    this.readyPromise = null;
  }

  /** Release all resources (call on unmount). */
  dispose(): void {
    if (this.pending) {
      clearTimeout(this.pending.timeout);
      this.pending.resolve({status: 'cancelled'});
      this.pending = null;
    }
    this.hardReset();
  }
}
