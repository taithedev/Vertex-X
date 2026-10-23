export type Preferences = { fontSize: number; wordWrap: boolean; autoUpdateEnabled: boolean; accent: string; theme: string; backgroundEffect: string; mouseEffect: string; effectIntensity: number; motionEnabled: boolean; updateCheckMinutes: number };
export type Account = { signedIn: boolean; username?: string; userId?: string };
export type ScriptFile = { name: string; size: number; modified?: string };
export type UpdateState = { version: string; pendingVersion?: string; message: string; hasError?: boolean };
export type Document = { id: string; name: string; content: string; saved?: boolean; baseline: string };
type NativeMessage = { id?: string; ok?: boolean; result?: unknown; error?: string; output?: string; type?: string; data?: unknown };
type WebView = { postMessage: (value: unknown) => void; addEventListener: (name: string, listener: (event: MessageEvent<NativeMessage>) => void) => void };
declare global { interface Window { chrome?: { webview?: WebView } } }
const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const listeners = new Set<(message: NativeMessage) => void>();
export const isNative = Boolean(window.chrome?.webview);
window.chrome?.webview?.addEventListener('message', event => {
  const message = event.data;
  if (message.id && pending.has(message.id)) {
    const request = pending.get(message.id)!;
    clearTimeout(request.timer); pending.delete(message.id);
    if (message.ok) request.resolve(message.result); else { const error = new Error(message.error || 'The operation failed.') as Error & { output?: string }; error.output = message.output; request.reject(error); }
  } else for (const listener of listeners) listener(message);
});
export function native<T = unknown>(method: string, payload: unknown = {}): Promise<T> {
  if (!window.chrome?.webview) return Promise.reject(new Error('This action is available in the installed Windows application.'));
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('The application did not respond. Retry the action.')); }, method.startsWith('updates.') ? 8 * 60_000 : 120_000);
    pending.set(id, { resolve: value => resolve(value as T), reject, timer });
    window.chrome!.webview!.postMessage({ id, method, payload });
  });
}
export function subscribe(listener: (message: NativeMessage) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
