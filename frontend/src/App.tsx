import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Code2, FolderOpen, Settings2, UserRound, ArrowUpRight, Search, Plus, Play, Square, Save, FileCode2, X, ChevronRight, ChevronDown, Terminal, RotateCw, Check, CheckCircle2, CircleAlert, ArrowDownToLine, Sparkles, Command, Copy, ExternalLink, Files, LogOut, Layers, Keyboard, PanelLeftClose, PanelLeftOpen, RefreshCw } from 'lucide-react';
import { Editor } from './Editor';
import { AppearanceSettings } from './AppearanceSettings';
import { BackgroundEffects } from './BackgroundEffects';
import { LibraryView } from './LibraryView';
import { defaultPreferences, normalizePreferences } from './appearance';
import { type RobloxProfile } from './roblox';
import { native, subscribe, isNative, type Preferences, type Account, type ScriptFile, type UpdateState, type Document } from './bridge';

const VERSION = '0.7.0';
const welcome = `-- Welcome to your new workspace.\n-- Create something worth running.\n\nlocal vertex = {\n    name = "Vertex X",\n    version = "0.7.0",\n    workspace = "local"\n}\n\nlocal function greet(name)\n    return string.format("Hello from %s!", name)\nend\n\nprint(greet(vertex.name))\nprint("Your next idea starts here.")\n\n-- Press F5 to run this script.\n-- Your scripts execute locally in the Lua runtime.\n`;
const snippets = [
 { name: 'Hello, world', category: 'Getting started', description: 'Start with a simple message.', code: "-- Your first Lua script\nprint('Hello from Vertex X!')\n", file: 'hello-world.lua' },
 { name: 'Functions', category: 'Fundamentals', description: 'Write a reusable greeting function.', code: "local function greet(name)\n    return 'Hello, ' .. name\nend\n\nprint(greet('Tai'))\n", file: 'functions.lua' },
 { name: 'Tables & loops', category: 'Collections', description: 'Explore lists, keys, and iteration.', code: "local languages = { 'Lua', 'C#', 'TypeScript' }\n\nfor index, language in ipairs(languages) do\n    print(index .. '. ' .. language)\nend\n", file: 'tables.lua' },
 { name: 'String toolkit', category: 'Utilities', description: 'Trim and split text using Lua patterns.', code: "local text = '  vertex x  '\nprint(text:match('^%s*(.-)%s*$'))\nfor word in text:gmatch('%S+') do print(word) end\n", file: 'strings.lua' },
 { name: 'Safe errors', category: 'Execution', description: 'Handle a failing function with pcall.', code: "local ok, result = pcall(function()\n    error('An example error')\nend)\nprint(ok, result)\n", file: 'safe-errors.lua' },
 { name: 'A little animation', category: 'Creative', description: 'Generate a pattern in your console.', code: "for row = 1, 12 do\n    print(string.rep(' ', 12 - row) .. string.rep('* ', row))\nend\n", file: 'pattern.lua' },
];
const defaultPrefs = defaultPreferences;
type View = 'editor' | 'library' | 'settings' | 'updates';
type Log = { kind: 'info' | 'success' | 'error' | 'output'; text: string; time: string };
type Confirm = { name: string; resolve: (choice: 'save' | 'discard' | 'cancel') => void };
function initialDocuments(): Document[] {
 try { const cached = JSON.parse(localStorage.getItem('vertexx.workspace.v1') || 'null');
  if (Array.isArray(cached) && cached.length && cached.length <= 20 && new Set(cached.map(d => d.id)).size === cached.length && cached.every(d => typeof d.id === 'string' && /^[a-f0-9-]{36}$/i.test(d.id) && typeof d.name === 'string' && d.name.length < 256 && typeof d.content === 'string' && d.content.length <= 1_000_000 && typeof d.baseline === 'string' && d.baseline.length <= 1_000_000)) return cached;
 } catch { /* Start with a new workspace if recovery data is damaged. */ }
 return [{ id: crypto.randomUUID(), name: 'welcome.lua', content: welcome, baseline: welcome }];
}
function Logo({ small = false }: { small?: boolean }) { return <div className={'logo ' + (small ? 'small' : '')}><svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 7h7l5 11 5-11h5L17 27 5 7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="m13 7 5 11" stroke="currentColor" strokeWidth="2"/></svg></div>; }
function Modal({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose?: () => void; children: ReactNode }) {
 const box = useRef<HTMLDivElement>(null);
 useEffect(() => { const previous = document.activeElement as HTMLElement; (box.current?.querySelector<HTMLElement>('[data-autofocus]') || box.current?.querySelector<HTMLElement>('input,select') || box.current?.querySelector<HTMLElement>('button'))?.focus(); return () => previous?.focus(); }, []);
 return <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}><div ref={box} className="modal" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onKeyDown={e => {
  if (e.key === 'Escape' && onClose) { e.stopPropagation(); onClose(); }
  if (e.key === 'Tab') { const items = box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,[tabindex="0"]'); if (!items?.length) return; const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
 }}><div className="modal-heading"><div><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{onClose && <button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18}/></button>}</div>{children}</div></div>;
}
export default function App() {
 const [documents, setDocuments] = useState<Document[]>(initialDocuments);
 const [activeId, setActiveId] = useState(() => documents[0].id);
 const [view, setView] = useState<View>('editor');
 const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
 const [draftPrefs, setDraftPrefs] = useState<Preferences>(defaultPrefs);
 const [account, setAccount] = useState<Account>({ signedIn: false });
 const [files, setFiles] = useState<ScriptFile[]>([]);
 const [version, setVersion] = useState(VERSION);
 const [updates, setUpdates] = useState<UpdateState>({ version: VERSION, message: 'Check for the latest published version.' });
 const [logs, setLogs] = useState<Log[]>([]);
 const [running, setRunning] = useState(false);
 const [status, setStatus] = useState('Ready when you are');
 const [filter, setFilter] = useState('');
 const [commandQuery, setCommandQuery] = useState('');
 const [sidebar, setSidebar] = useState(true);
 const [consoleExpanded, setConsoleExpanded] = useState(false);
 const [consoleTab, setConsoleTab] = useState<'console' | 'shortcuts'>('console');
 const [cursor, setCursor] = useState({ line: 1, col: 1 });
 const [modal, setModal] = useState<'account' | 'roblox' | 'commands' | 'library-save' | null>(null);
 const [confirm, setConfirm] = useState<Confirm | null>(null);
 const [libraryName, setLibraryName] = useState('');
 const [libraryError, setLibraryError] = useState('');
 const runId = useRef<string | null>(null);
 const selectionRef = useRef('');
 const [selectionSize, setSelectionSize] = useState(0);
 const [busy, setBusy] = useState(false);
 const [checking, setChecking] = useState(false);
 const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
 const [authMessage, setAuthMessage] = useState('');
 const [roblox, setRoblox] = useState<RobloxProfile | null>(null);
 const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
 const docsRef = useRef(documents); docsRef.current = documents;
 const currentRef = useRef(activeId); currentRef.current = activeId;
 const handlers = useRef({ exit: async () => {}, open: async () => {}, save: async (_as: boolean) => {}, run: async () => {}, close: async () => {}, new: () => {}, next: (_direction: number) => {}, stop: async () => {}, selection: async () => {} });
 const consoleEnd = useRef<HTMLDivElement>(null);
 const exitStarted = useRef(false);
 const recoveryError = useRef(false);
 const tabCloseBusy = useRef(false);
 const active = documents.find(d => d.id === activeId) || documents[0];
 function notify(text: string, error = false) { setToast({ text, error }); }
 function error(error: unknown) { notify(error instanceof Error ? error.message : 'Something went wrong.', true); }
 function persist(docs = docsRef.current) {
  try { localStorage.setItem('vertexx.workspace.v1', JSON.stringify(docs)); }
  catch { if (!recoveryError.current) { recoveryError.current = true; notify('Workspace recovery storage is full. Save your scripts to disk.', true); } }
 }
 useEffect(() => { const timer = setTimeout(() => persist(documents), 250); return () => clearTimeout(timer); }, [documents]);
 useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(null), 5000); return () => clearTimeout(timer); }, [toast]);
 useEffect(() => { consoleEnd.current?.scrollIntoView({ block: 'end' }); }, [logs]);
 useEffect(() => {
  if (isNative) native<{ version: string; preferences: Preferences; account: Account; library: ScriptFile[] }>('app.ready').then(data => { setVersion(data.version); setPrefs(normalizePreferences(data.preferences)); setDraftPrefs(normalizePreferences(data.preferences)); setAccount(data.account); setFiles(data.library); }).catch(error);
  const unsubscribe = subscribe(message => { if (message.type === 'request-close') void handlers.current.exit(); if (message.type === 'updates') setUpdates(message.data as UpdateState);
   if (message.type === 'lua.output') {
    const data = message.data as { runId: string; text: string };
    if (runId.current === data.runId && typeof data.text === 'string') setLogs(log => {
     const previous = log[log.length - 1];
     return previous?.kind === 'output' ? [...log.slice(0, -1), { ...previous, text: previous.text + data.text }] : [...log, { kind: 'output', text: data.text, time: new Date().toLocaleTimeString([], { hour12: false }) }];
    });
   } });
  const keyboard = (e: KeyboardEvent) => {
   const mod = e.ctrlKey || e.metaKey;
   if (document.querySelector('[role="dialog"]')) return;
   if (e.key === 'F5') { e.preventDefault(); if (e.shiftKey) void handlers.current.stop(); else void handlers.current.run(); }
   if (mod && e.key === 'Enter') { e.preventDefault(); void handlers.current.selection(); }
   if (e.ctrlKey && e.key === 'Tab') { e.preventDefault(); handlers.current.next(e.shiftKey ? -1 : 1); }
   if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); void handlers.current.save(e.shiftKey); }
   if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); void handlers.current.open(); }
   if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); handlers.current.new(); }
   if (mod && e.key.toLowerCase() === 'w') { e.preventDefault(); void handlers.current.close(); }
   if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandQuery(''); setModal('commands'); }
  };
  window.addEventListener('keydown', keyboard, true);
  return () => { unsubscribe(); window.removeEventListener('keydown', keyboard, true); };
 }, []);
 async function refresh() { try { setFiles(await native<ScriptFile[]>('files.list')); } catch (e) { error(e); } }
 function addDocument(name = 'untitled.lua', content = '') {
  if (docsRef.current.length >= 20) return notify('Close a tab before opening more. A workspace supports 20 tabs.', true);
  if (name === 'untitled.lua') { let number = 1; while (docsRef.current.some(d => d.name === name)) name = 'untitled-' + ++number + '.lua'; }
  const doc = { id: crypto.randomUUID(), name, content, baseline: '' };
  setDocuments(d => [...d, doc]); setActiveId(doc.id); setView('editor'); setCursor({ line: 1, col: 1 });
 }
 function importDocuments(incoming: Document[]) {
  setDocuments(existing => { const next = [...existing]; for (const item of incoming) if (!next.some(d => d.id === item.id) && next.length < 20) next.push({ ...item, baseline: item.content }); return next; });
  if (incoming.length) {
   const first = incoming[0];
   const existing = docsRef.current.find(d => d.id === first.id);
   if (!existing && docsRef.current.length >= 20) return notify('Close a tab before opening another script.', true);
   setActiveId(first.id); setView('editor'); setCursor({ line: 1, col: 1 });
  }
 }
 async function openFiles() { try { importDocuments(await native<Document[]>('files.open')); } catch (e) { error(e); } }
 async function openLibrary(name: string) { try { const doc = await native<Document>('files.library', { name }); importDocuments([doc]); } catch (e) { error(e); } }
 function beginLibrarySave() { setLibraryName(active.name === 'welcome.lua' || active.name === 'untitled.lua' ? 'my-script.lua' : active.name); setLibraryError(''); setModal('library-save'); }
 async function saveLibrary(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); setBusy(true); setLibraryError('');
  try {
   const doc = await native<Document>('library.save', { name: libraryName.trim(), content: active.content });
   importDocuments([doc]); await refresh(); setModal(null); notify('Saved to your script library.');
  } catch (e) { setLibraryError(e instanceof Error ? e.message : 'Could not save this script.'); }
  finally { setBusy(false); }
 }
 async function saveDocument(id: string, saveAs = false): Promise<boolean> {
  const doc = docsRef.current.find(d => d.id === id); if (!doc) return false;
  try { const saved = await native<Document | null>('files.save', { id, name: doc.name, content: doc.content, saveAs });
   if (!saved) return false;
   setDocuments(d => d.map(item => item.id === id ? { ...item, name: saved.name, baseline: saved.content, saved: true } : item));
   setStatus('Saved ' + saved.name); notify('Script saved to disk.'); await refresh(); return true;
  } catch (e) { error(e); return false; }
 }
 async function confirmDocument(doc: Document): Promise<'discard' | 'saved' | false> {
  if (doc.content === doc.baseline) return 'saved';
  setActiveId(doc.id); setView('editor');
  const choice = await new Promise<'save' | 'discard' | 'cancel'>(resolve => setConfirm({ name: doc.name, resolve }));
  setConfirm(null);
  if (choice === 'cancel') return false;
  if (choice === 'discard') return 'discard';
  return await saveDocument(doc.id) ? 'saved' : false;
 }
 async function closeTab(id: string) {
  if (confirm || exitStarted.current || tabCloseBusy.current) return;
  tabCloseBusy.current = true;
  try {
  const doc = docsRef.current.find(d => d.id === id); if (!doc || !await confirmDocument(doc)) return;
  const next = docsRef.current.filter(d => d.id !== id);
  if (!next.length) next.push({ id: crypto.randomUUID(), name: 'untitled.lua', content: '', baseline: '' });
  setDocuments(next); if (currentRef.current === id) setActiveId(next[Math.max(0, documents.findIndex(d => d.id === id) - 1)].id);
  } finally { tabCloseBusy.current = false; }
 }
 async function attemptExit() {
  if (exitStarted.current || tabCloseBusy.current) { await native('app.cancelClose').catch(error); return; } exitStarted.current = true; setModal(null);
  const discarded = new Set<string>();
  for (const doc of [...docsRef.current]) { const choice = await confirmDocument(doc); if (!choice) { exitStarted.current = false; await native('app.cancelClose').catch(error); return; } if (choice === 'discard') discarded.add(doc.id); }
  // Save decisions have already written to disk. Only discarded drafts are reset in recovery.
  persist(docsRef.current.map(d => discarded.has(d.id) ? { ...d, content: d.baseline } : d));
  void native('app.close').catch(e => { exitStarted.current = false; error(e); });
 }
 async function run(selectionOnly = false) {
  if (runId.current) return;
  const doc = docsRef.current.find(d => d.id === currentRef.current); if (!doc) return;
  const code = selectionOnly ? selectionRef.current : doc.content;
  if (!code.trim()) return notify(selectionOnly ? 'Select code in the editor first.' : 'Write some Lua before running.', true);
  if (doc.name.endsWith('.client.lua') || /\bgame\s*[:.]\s*GetService\b/.test(code)) {
   notify('This script needs the Roblox game runtime. For FPS without Studio, use Windows Game Bar below.');
   setModal('roblox');
   return;
  }
  const executionId = crypto.randomUUID(); runId.current = executionId;
  setView('editor'); setConsoleTab('console'); setConsoleExpanded(true); setRunning(true); setStatus('Running ' + doc.name);
  const time = new Date().toLocaleTimeString([], { hour12: false });
  setLogs([{ kind: 'info', text: 'Running ' + doc.name, time }]);
  try { const result = await native<{ output: string; elapsedMs: number; truncated: boolean }>('lua.run', { code, runId: executionId });
   runId.current = null;
   setLogs(log => [...log.filter(l => l.kind !== 'output'), ...(result.output ? [{ kind: 'output' as const, text: result.output.trimEnd(), time }] : []), { kind: 'success', text: `Finished in ${result.elapsedMs} ms${result.truncated ? ' · output limited to 100 KB' : ''}`, time }]);
   setStatus('Finished in ' + result.elapsedMs + ' ms');
  } catch (e) { runId.current = null; const text = e instanceof Error ? e.message : 'Execution failed.'; const output = (e as { output?: string })?.output; setLogs(log => [...log.filter(l => l.kind !== 'output'), ...(output ? [{ kind: 'output' as const, text: output.trimEnd(), time }] : []), { kind: 'error', text, time }]); setStatus('Execution stopped'); }
  finally { runId.current = null; setRunning(false); }
 }
 async function stop() { try { await native('lua.stop'); } catch (e) { error(e); } }
 async function checkUpdates() { setChecking(true); try { setUpdates(await native<UpdateState>('updates.check')); } catch (e) { error(e); } finally { setChecking(false); } }
 async function savePreferences() { setBusy(true); try { const next = isNative ? await native<Preferences>('settings.save', draftPrefs) : draftPrefs; setPrefs(next); notify('Preferences applied.'); } catch (e) { error(e); } finally { setBusy(false); } }
 async function authenticate(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); const data = new FormData(e.currentTarget); setBusy(true); setAuthMessage('');
  try { const result = await native<{ message: string; account: Account }>('auth.' + authMode, Object.fromEntries(data)); setAccount(result.account); setAuthMessage(result.message); }
  catch (e) { setAuthMessage(e instanceof Error ? e.message : 'Account request failed.'); }
  finally { setBusy(false); }
 }
 async function lookup(e: FormEvent<HTMLFormElement>) { e.preventDefault(); const username = new FormData(e.currentTarget).get('username'); setBusy(true); setRoblox(null); try { setRoblox(await native<RobloxProfile>('roblox.lookup', { username })); } catch (e) { error(e); } finally { setBusy(false); } }
 handlers.current = { exit: attemptExit, open: openFiles, save: async as => { await saveDocument(currentRef.current, as); }, run: () => run(), close: () => closeTab(currentRef.current), new: addDocument, stop, selection: () => run(true), next: direction => {
  const index = docsRef.current.findIndex(d => d.id === currentRef.current);
  setActiveId(docsRef.current[(index + direction + docsRef.current.length) % docsRef.current.length].id); setView('editor');
 } };
 const selectedFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
 const logErrors = logs.filter(l => l.kind === 'error').length;
 const commands = [
  { name: 'New script', shortcut: 'Ctrl N', action: () => addDocument() }, { name: 'Open script', shortcut: 'Ctrl O', action: () => void openFiles() },
  { name: 'Save script', shortcut: 'Ctrl S', action: () => void saveDocument(active.id) }, { name: 'Run script', shortcut: 'F5', action: () => void run() },
  { name: 'Script library', shortcut: '', action: () => setView('library') }, { name: 'Preferences', shortcut: '', action: () => { setDraftPrefs(prefs); setView('settings'); } },
  ...files.map(file => ({ name: file.name, shortcut: 'FILE', action: () => void openLibrary(file.name) })),
 ].filter(c => c.name.toLowerCase().includes(commandQuery.toLowerCase()));
 useEffect(() => {
  const selected = document.querySelector<HTMLElement>('.script-tab.active');
  selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  selectionRef.current = ''; setSelectionSize(0);
 }, [activeId]);
 const appearance = view === 'settings' ? draftPrefs : prefs;
 return <div className={'app theme-' + appearance.theme + ' accent-' + appearance.accent + (!appearance.motionEnabled ? ' motion-off' : '')}>
  <BackgroundEffects preferences={appearance}/>
  <header className="topbar"><div className="brand"><Logo/><span>Vertex<span className="brand-x"> X</span></span><span className="version">{version} <i>BETA</i></span></div><button className="command-trigger" onClick={() => { setCommandQuery(''); setModal('commands'); }}><Search size={14}/><span>Search files and commands</span><kbd>Ctrl K</kbd></button><div className="topbar-right"><span className="runtime-status"><i/> Local runtime</span><button className="avatar" aria-label="Open account" onClick={() => { setAuthMessage(''); setModal('account'); }}>{account.signedIn ? (account.username || 'V').slice(0, 1).toUpperCase() : <UserRound size={16}/>}</button></div></header>
  {!isNative && <div className="preview-banner"><CircleAlert size={13}/> Interface preview · File access, execution, accounts, and updates run in the installed Windows app.</div>}
  <div className="workspace">
   {sidebar && <aside className="sidebar"><div className="workspace-label">YOUR WORKSPACE <span>01</span></div><nav aria-label="Main navigation">
    <button className={view === 'editor' ? 'nav-item active' : 'nav-item'} onClick={() => setView('editor')}><Code2 size={17}/><span>Editor</span><kbd>F5</kbd></button>
    <button className={view === 'library' ? 'nav-item active' : 'nav-item'} onClick={() => setView('library')}><Layers size={17}/><span>Script library</span></button>
    <button className="nav-item" onClick={() => setModal('roblox')}><span className="roblox-icon"/><span>Roblox profiles</span><ArrowUpRight size={13}/></button>
   </nav><div className="sidebar-section"><div className="section-label"><span>EXPLORER</span><div><button title="Refresh scripts" aria-label="Refresh scripts" onClick={() => void refresh()}><RotateCw size={12}/></button><button title="New script" aria-label="New script" onClick={() => addDocument()}><Plus size={14}/></button></div></div><label className="file-search"><Search size={13}/><input aria-label="Filter saved scripts" placeholder="Filter scripts..." value={filter} onChange={e => setFilter(e.target.value)}/></label><div className="folder-label"><ChevronDown size={12}/><FolderOpen size={14}/> My scripts <span>{files.length}</span></div><div className="file-tree">{selectedFiles.map(file => <button key={file.name} className={active.name === file.name ? 'file-row selected' : 'file-row'} onClick={() => void openLibrary(file.name)}><FileCode2 size={14}/><span>{file.name}</span></button>)}{!selectedFiles.length && <div className="empty-files"><FileCode2 size={24}/><p>{files.length ? 'No matching scripts' : 'A home for your ideas.'}</p><span>{files.length ? 'Try a different filename.' : 'Save a script to see it here.'}</span></div>}</div></div><div className="sidebar-bottom"><div className="local-card"><div className="local-card-icon"><Terminal size={17}/></div><div><strong>Built for your next idea.</strong><span>Local Lua. Your workspace.</span></div><div className="card-line"/></div><button className={view === 'updates' ? 'nav-item active' : 'nav-item'} onClick={() => setView('updates')}><ArrowDownToLine size={16}/><span>Updates</span>{updates.pendingVersion && <span className="notification-dot"/>}</button><button className={view === 'settings' ? 'nav-item active' : 'nav-item'} onClick={() => { setDraftPrefs(prefs); setView('settings'); }}><Settings2 size={16}/><span>Preferences</span></button><div className="sidebar-foot"><Logo small/><span>VERTEX X</span><span>v{version}</span></div></div></aside>}
   <main className="main"><div className="page-heading"><div className="breadcrumb"><button className="icon-button" aria-label={sidebar ? 'Hide sidebar' : 'Show sidebar'} onClick={() => setSidebar(v => !v)}>{sidebar ? <PanelLeftClose size={16}/> : <PanelLeftOpen size={16}/>}</button><span>Workspace</span><ChevronRight size={12}/><strong>{view === 'editor' ? 'Script editor' : view === 'library' ? 'Script library' : view === 'settings' ? 'Preferences' : 'Updates'}</strong></div><div className="heading-note"><span className="tiny-dot"/> Your workspace, saved locally</div></div>
    <div className={view === 'editor' ? 'editor-layout' : 'editor-layout hidden'}>
     <section className="editor-panel" aria-label="Script workspace"><div className="editor-title"><div><span className="eyebrow">MAKE SOMETHING</span><h1>Code. Run. Create<span>.</span></h1></div><button className="secondary compact" onClick={() => setView('library')}><Sparkles size={14}/> Explore snippets <ArrowUpRight size={13}/></button></div><div className="tabbar" role="tablist" aria-label="Open scripts">{documents.map(doc => <div className={active.id === doc.id ? 'script-tab active' : 'script-tab'} key={doc.id}><button role="tab" tabIndex={active.id === doc.id ? 0 : -1} onKeyDown={e => {
 if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); handlers.current.next(e.key === 'ArrowRight' ? 1 : -1); }
 }} aria-selected={active.id === doc.id} aria-controls={'editor-' + doc.id} onClick={() => { setActiveId(doc.id); setCursor({ line: 1, col: 1 }); }}><FileCode2 size={13}/><span>{doc.name}</span>{doc.content !== doc.baseline && <i className="dirty-dot"/>}</button><button aria-label={'Close ' + doc.name} className="tab-close" onClick={() => void closeTab(doc.id)}><X size={12}/></button></div>)}<button className="new-tab" aria-label="New tab" onClick={() => addDocument()}><Plus size={16}/></button></div><div className="editor-breadcrumb"><FileCode2 size={12}/><span>{active.name}</span><ChevronRight size={11}/><span>Lua</span><span className="editor-language">LUA 5.2</span></div><div className="editors">{documents.map(doc => <div id={'editor-' + doc.id} role="tabpanel" aria-label={doc.name} key={doc.id} className={active.id === doc.id ? 'editor-container' : 'editor-container hidden'}><Editor active={view === 'editor' && active.id === doc.id} onSelection={text => { if (currentRef.current === doc.id) { selectionRef.current = text; setSelectionSize(text.length); } }} content={doc.content} fontSize={prefs.fontSize} wrap={prefs.wordWrap} onChange={content => setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, content } : d))} onCursor={(line, col) => { if (currentRef.current === doc.id) setCursor({ line, col }); }}/></div>)}</div><div className="editor-actions"><div className="action-group"><button className="secondary" onClick={() => void openFiles()}><FolderOpen size={14}/> Open</button><button className="secondary" onClick={() => void saveDocument(active.id)}><Save size={14}/> Save</button><button className="text-button" onClick={() => void saveDocument(active.id, true)}>Save as<ArrowUpRight size={12}/></button></div><div className="action-group"><span className="run-hint">{running ? '5 sec limit · Shift F5 to stop' : 'Local Lua · F5'}</span>{!running && <button className="text-button" disabled={!selectionSize} onClick={() => void run(true)}>Run selection</button>}{running ? <button className="primary stop" onClick={() => void stop()}><Square size={13} fill="currentColor"/> Stop script</button> : <button className="primary" onClick={() => void run()}><Play size={14} fill="currentColor"/> Run script</button>}</div></div></section>
     <section className={'console-panel ' + (!consoleExpanded ? 'collapsed' : '')} aria-label="Execution console"><div className="console-heading"><div className="console-tabs"><button className={consoleTab === 'console' ? 'active' : ''} onClick={() => { setConsoleTab('console'); setConsoleExpanded(true); }}><Terminal size={14}/>Console{logs.length > 0 && <span className="count">{logs.length}</span>}</button><button className={consoleTab === 'shortcuts' ? 'active' : ''} onClick={() => { setConsoleTab('shortcuts'); setConsoleExpanded(true); }}><Keyboard size={14}/>Shortcuts</button></div><div className="console-tools"><button className="icon-button" aria-label={consoleExpanded ? 'Collapse console' : 'Expand console'} onClick={() => setConsoleExpanded(v => !v)}><ChevronDown size={13} style={{ transform: consoleExpanded ? undefined : 'rotate(180deg)' }}/></button>{logErrors > 0 && <span className="error-count">{logErrors} error</span>}<button className="icon-button" aria-label="Copy console output" title="Copy output" onClick={() => { void navigator.clipboard.writeText(logs.map(l => l.text).join('\n')).then(() => notify('Console output copied.')).catch(error); }}><Copy size={13}/></button><button className="text-button" onClick={() => setLogs([])}>Clear<X size={12}/></button></div></div>{consoleExpanded && (consoleTab === 'console' ? <div className="console-content" aria-live="polite">{!logs.length ? <div className="console-empty"><div className="console-symbol"><Terminal size={18}/></div><div><strong>Your output starts here</strong><span>Run a script to see messages, results, and errors.</span></div><kbd>F5</kbd></div> : logs.map((log, index) => <div key={index} className={'log-entry ' + log.kind}><time>{log.time}</time><span className="log-marker">{log.kind === 'success' ? <Check size={12}/> : log.kind === 'error' ? <X size={12}/> : <ChevronRight size={12}/>}</span><pre>{log.text}</pre></div>)}<div ref={consoleEnd}/></div> : <div className="shortcuts">{[['Run script', 'F5'], ['Open file', 'Ctrl O'], ['Save', 'Ctrl S'], ['Save as', 'Ctrl Shift S'], ['New tab', 'Ctrl N'], ['Switch tabs', 'Ctrl Tab'], ['Run selection', 'Ctrl Enter'], ['Stop script', 'Shift F5'], ['Close tab', 'Ctrl W'], ['Find / replace', 'Ctrl F / H'], ['Commands', 'Ctrl K'], ['Suggestions', 'Ctrl Space'], ['Accept suggestion', 'Tab / Enter'], ['Indent / outdent', 'Tab / Shift Tab']].map(([label, key]) => <div key={label}><span>{label}</span><kbd>{key}</kbd></div>)}</div>)}</section>
    </div>
    {view === 'library' && <LibraryView files={files} snippets={snippets} onOpen={name => void openLibrary(name)} onSnippet={addDocument} onImport={() => void openFiles()} onSave={beginLibrarySave} onRefresh={() => void refresh()} onFolder={() => void native('files.folder').catch(error)}/>}
    {view === 'settings' && <div className="page-content settings-page"><div className="page-intro"><span className="eyebrow">MAKE IT YOURS</span><h1>Your space. Your rhythm.</h1><p>A few small details that make a workspace feel like home.</p></div><section className="settings-card"><h2><Code2 size={16}/>Editor</h2><div className="setting-row"><div><strong>Editor font size</strong><p>A little more room for every line.</p></div><div className="range-control"><input aria-label="Editor font size" type="range" min="10" max="24" step="1" value={draftPrefs.fontSize} onChange={e => setDraftPrefs(p => ({ ...p, fontSize: Number(e.target.value) }))}/><span>{draftPrefs.fontSize}px</span></div></div><div className="setting-row"><div><strong>Word wrap</strong><p>Keep long lines inside the editor.</p></div><button role="switch" aria-checked={draftPrefs.wordWrap} aria-label="Word wrap" className={'toggle ' + (draftPrefs.wordWrap ? 'on' : '')} onClick={() => setDraftPrefs(p => ({ ...p, wordWrap: !p.wordWrap }))}><i/></button></div></section><AppearanceSettings value={draftPrefs} onChange={setDraftPrefs}/><section className="settings-card"><h2><ExternalLink size={16}/>Desktop</h2><div className="setting-row"><div><strong>Desktop shortcut</strong><p>Setup creates Desktop and Start menu shortcuts. Restore your Desktop shortcut here.</p></div><button className="secondary" onClick={() => void native('app.shortcut').then(() => notify('Desktop shortcut created.')).catch(error)}>Create shortcut</button></div></section><section className="settings-card"><h2><ArrowDownToLine size={16}/>Updates</h2><div className="setting-row"><div><strong>Automatic updates</strong><p>Download verified releases. Install when you close Vertex X.</p></div><button role="switch" aria-checked={draftPrefs.autoUpdateEnabled} aria-label="Automatic updates" className={'toggle ' + (draftPrefs.autoUpdateEnabled ? 'on' : '')} onClick={() => setDraftPrefs(p => ({ ...p, autoUpdateEnabled: !p.autoUpdateEnabled }))}><i/></button></div></section><div className="settings-actions"><span>Previewing appearance. Save to keep changes.</span><button className="secondary" onClick={() => setDraftPrefs(prefs)}>Revert changes</button><button className="primary" disabled={busy} onClick={() => void savePreferences()}><Check size={15}/>{busy ? 'Saving...' : 'Save preferences'}</button></div></div>}
    {view === 'updates' && <div className="page-content update-page"><div className="page-intro"><span className="eyebrow">ALWAYS MOVING FORWARD</span><h1>A better workspace,<br/>one update at a time.</h1><p>Check the official release channel for the latest version.</p></div><section className="update-card"><div className="update-logo"><Logo/></div><div><span className="eyebrow">VERTEX X DESKTOP</span><h2>Version {version}<span className="beta-pill">BETA</span></h2><p>{checking ? 'Checking official GitHub releases…' : updates.message}</p></div><button className="primary" disabled={checking} onClick={() => void checkUpdates()}><RefreshCw size={15} className={checking ? 'spin' : ''}/>{checking ? 'Checking...' : 'Check for updates'}</button></section>{updates.pendingVersion && <div className="notice success"><CheckCircle2 size={18}/><div><strong>Version {updates.pendingVersion} is ready.</strong><p>Save your work and close Vertex X to install the verified update.</p></div></div>}<div className="release-info"><h2>Made for a smoother workflow.</h2><p>This release brings a new React workspace, syntax highlighting, recoverable tabs, a stoppable Lua runtime, and personal appearance settings.</p><div><span><CheckCircle2 size={14}/> SHA-256 verified downloads</span><span><CheckCircle2 size={14}/> Scripts and settings preserved</span></div><button className="secondary" onClick={() => void native('updates.page').catch(error)}>View GitHub releases<ExternalLink size={13}/></button></div></div>}
   </main>
  </div>
  <footer className="statusbar"><div><span className={'state-dot ' + (running ? 'running' : '')}/><span>{running ? 'Running script' : status}</span>{updates.pendingVersion && <button onClick={() => setView('updates')}>Update {updates.pendingVersion} ready<ArrowUpRight size={11}/></button>}</div><div><span>Ln {cursor.line}, Col {cursor.col}</span><span>UTF-8</span><span>Lua</span><span className="footer-native">{isNative ? 'Windows' : 'Preview'}</span></div></footer>
  {toast && <div className={'toast ' + (toast.error ? 'error' : '')} role="status">{toast.error ? <CircleAlert size={17}/> : <CheckCircle2 size={17}/>}<span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={14}/></button></div>}
  {confirm && <Modal title="Keep your changes?" subtitle={confirm.name + ' has unsaved edits.'} onClose={() => confirm.resolve('cancel')}><div className="confirm-copy">Save your script before closing, or keep editing.</div><div className="modal-actions"><button className="text-button danger" onClick={() => confirm.resolve('discard')}>Discard changes</button><div><button data-autofocus className="secondary" onClick={() => confirm.resolve('cancel')}>Keep editing</button><button className="primary" onClick={() => confirm.resolve('save')}><Save size={14}/> Save script</button></div></div></Modal>}
  {modal === 'account' && !confirm && <Modal title={account.signedIn ? 'Your account' : 'Welcome to Vertex X'} subtitle={account.signedIn ? 'Your workspace, with a familiar name.' : 'A place for your ideas. Sign in with your Zuzify account.'} onClose={busy ? undefined : () => setModal(null)}>{account.signedIn ? <div className="account-summary"><div className="large-avatar">{(account.username || 'V').slice(0, 1).toUpperCase()}</div><h3>{account.username || 'Vertex member'}</h3><span>Signed in</span><p>Scripts and workspace recovery are stored on this device. Account sessions end when you close the app.</p><button className="secondary" disabled={busy} onClick={async () => { setBusy(true); try { const result = await native<{ account: Account }>('auth.logout'); setAccount(result.account); setAuthMessage(''); } catch (e) { error(e); } finally { setBusy(false); } }}><LogOut size={14}/> Sign out</button></div> : <><div className="segmented"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthMessage(''); }}>Sign in</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthMessage(''); }}>Create account</button></div><form className="form" onSubmit={authenticate}>{authMode === 'signup' && <label>Username<input name="username" autoComplete="username" placeholder="your_username" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" required/></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required/></label><label>Password<input name="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="Enter your password" minLength={authMode === 'signup' ? 8 : 1} maxLength={1024} required/></label>{authMessage && <div className="form-message" role="status">{authMessage}</div>}<button className="primary full" type="submit" disabled={busy}>{busy ? 'Please wait...' : authMode === 'login' ? 'Sign in to Vertex X' : 'Create your account'}<ArrowUpRight size={15}/></button><p className="form-footnote">Your password is handled by Supabase Auth. It is never saved in your scripts or workspace recovery.</p></form></>}</Modal>}
  {modal === 'roblox' && !confirm && <Modal title="Roblox profiles & FPS" subtitle="Public avatars and Windows FPS tools." onClose={busy ? undefined : () => setModal(null)}>
   <form className="form" onSubmit={lookup}>
    <label>Roblox username<input name="username" placeholder="Username" defaultValue={roblox?.name || ''} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" required/></label>
    <button disabled={busy} type="submit" className="primary full"><Search size={15}/>{busy ? 'Looking up...' : 'Find public profile'}</button>
   </form>
   {roblox && <>
    <div className="profile-result">
     <div className="large-avatar profile-avatar"><UserRound size={24}/>{roblox.avatarDataUrl && <img src={roblox.avatarDataUrl} alt={roblox.displayName + ' Roblox avatar'} onError={e => { e.currentTarget.hidden = true; }}/>}</div>
     <div><h3>{roblox.displayName}{roblox.hasVerifiedBadge && <CheckCircle2 size={14} aria-label="Roblox verified badge"/>}</h3><span>@{roblox.name} · ID {roblox.id}</span></div>
     <button className="icon-button" aria-label="Open public Roblox profile" onClick={() => void native('roblox.open', { id: roblox.id }).catch(error)}><ExternalLink size={17}/></button>
    </div>
    <div className="profile-details">
     {roblox.created && !Number.isNaN(Date.parse(roblox.created)) && <span>Joined {new Date(roblox.created).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
     {roblox.description && <p>{roblox.description}</p>}
     {!roblox.avatarDataUrl && <small>{roblox.avatarState === 'Pending' ? 'Roblox is generating this avatar. Try again in a moment.' : roblox.avatarState === 'Blocked' ? 'This avatar is unavailable from Roblox.' : 'Avatar temporarily unavailable.'}</small>}
     {roblox.profileWarning && <small>{roblox.profileWarning}</small>}
    </div>
   </>}
   <section className="studio-tools">
    <h3><Terminal size={16}/> Windows FPS overlay</h3>
    <p>Use Xbox Game Bar while playing Roblox. No Studio setup is needed.</p>
    <ol><li>Open Roblox and join your game.</li><li>Press <strong>Win + G</strong>, then open <strong>Widgets → Performance</strong>.</li><li>Select <strong>FPS</strong> and pin the widget to keep it visible while playing.</li></ol>
    <div className="studio-tool-actions">
     <button className="primary" onClick={() => void native('performance.gamebar').catch(error)}><Terminal size={14}/> Open Game Bar</button>
     <button className="secondary" onClick={() => void native('performance.settings').catch(error)}><Settings2 size={14}/> Game Bar settings</button>
    </div>
    <small>If Windows asks for FPS access, follow its prompt and restart your PC. Game Bar must be installed and enabled. FPS is measured by Windows, not by the Vertex X Lua runner.</small>
   </section>
   <div className="profile-note">Public lookup is not a verified account link. Vertex X runs desktop Lua; Roblox APIs require the Roblox game runtime.</div>
  </Modal>}
  {modal === 'library-save' && !confirm && <Modal title="Save to script library" subtitle="Create a named copy in Documents / Vertex X / Scripts." onClose={busy ? undefined : () => setModal(null)}><form className="form" onSubmit={saveLibrary}><label>Script filename<input value={libraryName} onChange={e => setLibraryName(e.target.value)} required maxLength={180} placeholder="my-script.lua" data-autofocus/></label>{libraryError && <div className="form-message" role="alert">{libraryError}</div>}<button className="primary full" disabled={busy || documents.length >= 20} type="submit">{busy ? 'Saving...' : 'Save library copy'}</button>{documents.length >= 20 && <p className="form-footnote">Close a tab before saving a new library copy.</p>}</form></Modal>}
  {modal === 'commands' && !confirm && <Modal title="Find your next action" onClose={() => setModal(null)}><label className="command-input"><Search size={17}/><input aria-label="Search commands" placeholder="Type a command or filename..." value={commandQuery} onChange={e => setCommandQuery(e.target.value)}/></label><div className="command-results">{commands.map((cmd, i) => <button key={cmd.name + i} onClick={() => { setModal(null); cmd.action(); }}><Command size={15}/><span>{cmd.name}</span><kbd>{cmd.shortcut}</kbd></button>)}{!commands.length && <div className="no-commands">No matching files or commands.</div>}</div></Modal>}
 </div>;
}
