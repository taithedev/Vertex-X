import { useEffect, useRef, useState, type ReactNode, type FormEvent } from 'react';
import { Code2, FolderOpen, Settings2, UserRound, ArrowUpRight, Search, Plus, Play, Square, Save, FileCode2, X, ChevronRight, ChevronDown, Terminal, RotateCw, Check, CheckCircle2, CircleAlert, ArrowDownToLine, Sparkles, Command, Copy, ExternalLink, Files, LogOut, Layers, Keyboard, PanelLeftClose, PanelLeftOpen, RefreshCw } from 'lucide-react';
import { Editor } from './Editor';
import { FPS_OVERLAY_SCRIPT, type RobloxProfile } from './roblox';
import { native, subscribe, isNative, type Preferences, type Account, type ScriptFile, type UpdateState, type Document } from './bridge';

const VERSION = '0.6.0';
const welcome = `-- Welcome to your new workspace.\n-- Create something worth running.\n\nlocal vertex = {\n    name = "Vertex X",\n    version = "0.6.0",\n    workspace = "local"\n}\n\nlocal function greet(name)\n    return string.format("Hello from %s!", name)\nend\n\nprint(greet(vertex.name))\nprint("Your next idea starts here.")\n\n-- Press F5 to run this script.\n-- Your scripts execute locally in the Lua runtime.\n`;
const snippets = [
 { name: 'Roblox FPS overlay', category: 'Roblox Studio · LocalScript', description: 'Measured in-game FPS and frame time. Install in StarterPlayerScripts.', code: FPS_OVERLAY_SCRIPT, file: 'VertexXFpsOverlay.client.lua' },
 { name: 'Hello, world', category: 'Getting started', description: 'Start with a simple message.', code: "-- Your first Lua script\nprint('Hello from Vertex X!')\n", file: 'hello-world.lua' },
 { name: 'Functions', category: 'Fundamentals', description: 'Write a reusable greeting function.', code: "local function greet(name)\n    return 'Hello, ' .. name\nend\n\nprint(greet('Tai'))\n", file: 'functions.lua' },
 { name: 'Tables & loops', category: 'Collections', description: 'Explore lists, keys, and iteration.', code: "local languages = { 'Lua', 'C#', 'TypeScript' }\n\nfor index, language in ipairs(languages) do\n    print(index .. '. ' .. language)\nend\n", file: 'tables.lua' },
 { name: 'A little animation', category: 'Creative', description: 'Generate a pattern in your console.', code: "for row = 1, 12 do\n    print(string.rep(' ', 12 - row) .. string.rep('* ', row))\nend\n", file: 'pattern.lua' },
];
const defaultPrefs: Preferences = { fontSize: 14, wordWrap: false, autoUpdateEnabled: true, accent: 'violet' };
type View = 'editor' | 'library' | 'settings' | 'updates';
type Log = { kind: 'info' | 'success' | 'error' | 'output'; text: string; time: string };
type Confirm = { name: string; resolve: (choice: 'save' | 'discard' | 'cancel') => void };
function initialDocuments(): Document[] {
 try { const cached = JSON.parse(localStorage.getItem('vertexx.workspace.v1') || 'null');
  if (Array.isArray(cached) && cached.length && cached.length <= 20 && cached.every(d => typeof d.id === 'string' && /^[a-f0-9-]{36}$/i.test(d.id) && typeof d.name === 'string' && d.name.length < 256 && typeof d.content === 'string' && d.content.length <= 1_000_000 && typeof d.baseline === 'string')) return cached;
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
 const [modal, setModal] = useState<'account' | 'roblox' | 'commands' | null>(null);
 const [confirm, setConfirm] = useState<Confirm | null>(null);
 const [busy, setBusy] = useState(false);
 const [checking, setChecking] = useState(false);
 const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
 const [authMessage, setAuthMessage] = useState('');
 const [roblox, setRoblox] = useState<RobloxProfile | null>(null);
 const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
 const docsRef = useRef(documents); docsRef.current = documents;
 const currentRef = useRef(activeId); currentRef.current = activeId;
 const handlers = useRef({ exit: async () => {}, open: async () => {}, save: async (_as: boolean) => {}, run: async () => {}, close: async () => {}, new: () => {} });
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
  if (isNative) native<{ version: string; preferences: Preferences; account: Account; library: ScriptFile[] }>('app.ready').then(data => { setVersion(data.version); setPrefs(data.preferences); setDraftPrefs(data.preferences); setAccount(data.account); setFiles(data.library); }).catch(error);
  const unsubscribe = subscribe(message => { if (message.type === 'request-close') void handlers.current.exit(); if (message.type === 'updates') setUpdates(message.data as UpdateState); });
  const keyboard = (e: KeyboardEvent) => {
   const mod = e.ctrlKey || e.metaKey;
   if (e.key === 'F5') { e.preventDefault(); void handlers.current.run(); }
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
  const doc = { id: crypto.randomUUID(), name, content, baseline: '' };
  setDocuments(d => [...d, doc]); setActiveId(doc.id); setView('editor'); setCursor({ line: 1, col: 1 });
 }
 function importDocuments(incoming: Document[]) {
  setDocuments(existing => { const next = [...existing]; for (const item of incoming) if (!next.some(d => d.id === item.id) && next.length < 20) next.push({ ...item, baseline: item.content }); return next; });
  if (incoming.length) { setActiveId(incoming[0].id); setView('editor'); }
 }
 async function openFiles() { try { importDocuments(await native<Document[]>('files.open')); } catch (e) { error(e); } }
 async function openLibrary(name: string) { try { const doc = await native<Document>('files.library', { name }); importDocuments([doc]); } catch (e) { error(e); } }
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
 async function run() {
  if (running) return;
  const doc = docsRef.current.find(d => d.id === currentRef.current); if (!doc) return;
  if (doc.name.endsWith('.client.lua') || /\bgame\s*[:.]\s*GetService\b/.test(doc.content)) {
   notify('This uses Roblox APIs. Paste it into a LocalScript in Roblox Studio and press Play there.');
   setModal('roblox');
   return;
  }
  setView('editor'); setConsoleTab('console'); setConsoleExpanded(true); setRunning(true); setStatus('Running ' + doc.name);
  const time = new Date().toLocaleTimeString([], { hour12: false });
  setLogs([{ kind: 'info', text: 'Running ' + doc.name, time }]);
  try { const result = await native<{ output: string; elapsedMs: number; truncated: boolean }>('lua.run', { code: doc.content });
   setLogs(log => [...log, ...(result.output ? [{ kind: 'output' as const, text: result.output.trimEnd(), time }] : []), { kind: 'success', text: `Finished in ${result.elapsedMs} ms${result.truncated ? ' · output limited to 100 KB' : ''}`, time }]);
   setStatus('Finished in ' + result.elapsedMs + ' ms');
  } catch (e) { const text = e instanceof Error ? e.message : 'Execution failed.'; const output = (e as { output?: string })?.output; setLogs(log => [...log, ...(output ? [{ kind: 'output' as const, text: output.trimEnd(), time }] : []), { kind: 'error', text, time }]); setStatus('Execution stopped'); }
  finally { setRunning(false); }
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
 handlers.current = { exit: attemptExit, open: openFiles, save: async as => { await saveDocument(currentRef.current, as); }, run, close: () => closeTab(currentRef.current), new: addDocument };
 const selectedFiles = files.filter(f => f.name.toLowerCase().includes(filter.toLowerCase()));
 const logErrors = logs.filter(l => l.kind === 'error').length;
 const commands = [
  { name: 'New script', shortcut: 'Ctrl N', action: () => addDocument() }, { name: 'Open script', shortcut: 'Ctrl O', action: () => void openFiles() },
  { name: 'Save script', shortcut: 'Ctrl S', action: () => void saveDocument(active.id) }, { name: 'Run script', shortcut: 'F5', action: () => void run() },
  { name: 'Script library', shortcut: '', action: () => setView('library') }, { name: 'Preferences', shortcut: '', action: () => { setDraftPrefs(prefs); setView('settings'); } },
  ...files.map(file => ({ name: file.name, shortcut: 'FILE', action: () => void openLibrary(file.name) })),
 ].filter(c => c.name.toLowerCase().includes(commandQuery.toLowerCase()));
 return <div className={'app accent-' + prefs.accent}>
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
     <section className="editor-panel" aria-label="Script workspace"><div className="editor-title"><div><span className="eyebrow">MAKE SOMETHING</span><h1>Code. Run. Create<span>.</span></h1></div><button className="secondary compact" onClick={() => setView('library')}><Sparkles size={14}/> Explore snippets <ArrowUpRight size={13}/></button></div><div className="tabbar" role="tablist" aria-label="Open scripts">{documents.map(doc => <div className={active.id === doc.id ? 'script-tab active' : 'script-tab'} key={doc.id}><button role="tab" aria-selected={active.id === doc.id} aria-controls={'editor-' + doc.id} onClick={() => { setActiveId(doc.id); setCursor({ line: 1, col: 1 }); }}><FileCode2 size={13}/><span>{doc.name}</span>{doc.content !== doc.baseline && <i className="dirty-dot"/>}</button><button aria-label={'Close ' + doc.name} className="tab-close" onClick={() => void closeTab(doc.id)}><X size={12}/></button></div>)}<button className="new-tab" aria-label="New tab" onClick={() => addDocument()}><Plus size={16}/></button></div><div className="editor-breadcrumb"><FileCode2 size={12}/><span>{active.name}</span><ChevronRight size={11}/><span>Lua</span><span className="editor-language">LUA 5.2</span></div><div className="editors">{documents.map(doc => <div id={'editor-' + doc.id} role="tabpanel" aria-label={doc.name} key={doc.id} className={active.id === doc.id ? 'editor-container' : 'editor-container hidden'}><Editor content={doc.content} fontSize={prefs.fontSize} wrap={prefs.wordWrap} onChange={content => setDocuments(docs => docs.map(d => d.id === doc.id ? { ...d, content } : d))} onCursor={(line, col) => { if (currentRef.current === doc.id) setCursor({ line, col }); }}/></div>)}</div><div className="editor-actions"><div className="action-group"><button className="secondary" onClick={() => void openFiles()}><FolderOpen size={14}/> Open</button><button className="secondary" onClick={() => void saveDocument(active.id)}><Save size={14}/> Save</button><button className="text-button" onClick={() => void saveDocument(active.id, true)}>Save as<ArrowUpRight size={12}/></button></div><div className="action-group"><span className="run-hint">{running ? '5 sec limit' : 'F5 to execute'}</span>{running ? <button className="primary stop" onClick={() => void stop()}><Square size={13} fill="currentColor"/> Stop script</button> : <button className="primary" onClick={() => void run()}><Play size={14} fill="currentColor"/> Run script</button>}</div></div></section>
     <section className={'console-panel ' + (!consoleExpanded ? 'collapsed' : '')} aria-label="Execution console"><div className="console-heading"><div className="console-tabs"><button className={consoleTab === 'console' ? 'active' : ''} onClick={() => { setConsoleTab('console'); setConsoleExpanded(true); }}><Terminal size={14}/>Console{logs.length > 0 && <span className="count">{logs.length}</span>}</button><button className={consoleTab === 'shortcuts' ? 'active' : ''} onClick={() => { setConsoleTab('shortcuts'); setConsoleExpanded(true); }}><Keyboard size={14}/>Shortcuts</button></div><div className="console-tools"><button className="icon-button" aria-label={consoleExpanded ? 'Collapse console' : 'Expand console'} onClick={() => setConsoleExpanded(v => !v)}><ChevronDown size={13} style={{ transform: consoleExpanded ? undefined : 'rotate(180deg)' }}/></button>{logErrors > 0 && <span className="error-count">{logErrors} error</span>}<button className="icon-button" aria-label="Copy console output" title="Copy output" onClick={() => { void navigator.clipboard.writeText(logs.map(l => l.text).join('\n')).then(() => notify('Console output copied.')).catch(error); }}><Copy size={13}/></button><button className="text-button" onClick={() => setLogs([])}>Clear<X size={12}/></button></div></div>{consoleExpanded && (consoleTab === 'console' ? <div className="console-content" aria-live="polite">{!logs.length ? <div className="console-empty"><div className="console-symbol"><Terminal size={18}/></div><div><strong>Your output starts here</strong><span>Run a script to see messages, results, and errors.</span></div><kbd>F5</kbd></div> : logs.map((log, index) => <div key={index} className={'log-entry ' + log.kind}><time>{log.time}</time><span className="log-marker">{log.kind === 'success' ? <Check size={12}/> : log.kind === 'error' ? <X size={12}/> : <ChevronRight size={12}/>}</span><pre>{log.text}</pre></div>)}<div ref={consoleEnd}/></div> : <div className="shortcuts">{[['Run script', 'F5'], ['Open file', 'Ctrl O'], ['Save', 'Ctrl S'], ['Save as', 'Ctrl Shift S'], ['New tab', 'Ctrl N'], ['Close tab', 'Ctrl W'], ['Find / replace', 'Ctrl F / H'], ['Commands', 'Ctrl K'], ['Suggestions', 'Ctrl Space'], ['Accept suggestion', 'Tab / Enter'], ['Indent / outdent', 'Tab / Shift Tab']].map(([label, key]) => <div key={label}><span>{label}</span><kbd>{key}</kbd></div>)}</div>)}</section>
    </div>
    {view === 'library' && <div className="page-content"><div className="page-intro"><span className="eyebrow">YOUR COLLECTION</span><h1>A little inspiration.<br/>A lot of possibility.</h1><p>Start with a snippet, or pick up where you left off.</p></div><div className="section-heading"><h2><Sparkles size={16}/>Starter snippets</h2><span>Ready to make your own</span></div><div className="snippet-grid">{snippets.map((item, index) => <button key={item.name} className="snippet-card" onClick={() => addDocument(item.file, item.code)}><div className="snippet-icon"><Code2 size={19}/><span>0{index + 1}</span></div><small>{item.category}</small><h3>{item.name}<ArrowUpRight size={16}/></h3><p>{item.description}</p><div className="snippet-bottom"><span>Lua</span><span>Open in editor <ChevronRight size={12}/></span></div></button>)}</div><div className="section-heading"><h2><Files size={16}/>Saved scripts<span className="count">{files.length}</span></h2><button className="text-button" onClick={() => void native('files.folder').catch(error)}>Open folder<ExternalLink size={12}/></button></div><div className="saved-list">{files.map(file => <button key={file.name} onClick={() => void openLibrary(file.name)}><FileCode2 size={17}/><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB</span><ArrowUpRight size={14}/></button>)}{!files.length && <div className="page-empty"><FolderOpen size={28}/><h3>Your library is a blank canvas.</h3><p>Save a script inside Documents / Vertex X / Scripts to find it here.</p><button className="secondary" onClick={() => void openFiles()}><FolderOpen size={14}/> Open a script</button></div>}</div></div>}
    {view === 'settings' && <div className="page-content settings-page"><div className="page-intro"><span className="eyebrow">MAKE IT YOURS</span><h1>Your space. Your rhythm.</h1><p>A few small details that make a workspace feel like home.</p></div><section className="settings-card"><h2><Code2 size={16}/>Editor</h2><div className="setting-row"><div><strong>Editor font size</strong><p>A little more room for every line.</p></div><div className="range-control"><input aria-label="Editor font size" type="range" min="10" max="24" step="1" value={draftPrefs.fontSize} onChange={e => setDraftPrefs(p => ({ ...p, fontSize: Number(e.target.value) }))}/><span>{draftPrefs.fontSize}px</span></div></div><div className="setting-row"><div><strong>Word wrap</strong><p>Keep long lines inside the editor.</p></div><button role="switch" aria-checked={draftPrefs.wordWrap} aria-label="Word wrap" className={'toggle ' + (draftPrefs.wordWrap ? 'on' : '')} onClick={() => setDraftPrefs(p => ({ ...p, wordWrap: !p.wordWrap }))}><i/></button></div></section><section className="settings-card"><h2><Sparkles size={16}/>Appearance</h2><div className="setting-row"><div><strong>Accent color</strong><p>A subtle signature throughout your workspace.</p></div><div className="swatches">{['violet', 'mint', 'ice'].map(color => <button aria-label={color + ' accent'} aria-pressed={draftPrefs.accent === color} key={color} className={'swatch ' + color} onClick={() => setDraftPrefs(p => ({ ...p, accent: color }))}>{draftPrefs.accent === color && <Check size={16}/>}</button>)}</div></div></section><section className="settings-card"><h2><ArrowDownToLine size={16}/>Updates</h2><div className="setting-row"><div><strong>Automatic updates</strong><p>Download verified releases. Install when you close Vertex X.</p></div><button role="switch" aria-checked={draftPrefs.autoUpdateEnabled} aria-label="Automatic updates" className={'toggle ' + (draftPrefs.autoUpdateEnabled ? 'on' : '')} onClick={() => setDraftPrefs(p => ({ ...p, autoUpdateEnabled: !p.autoUpdateEnabled }))}><i/></button></div></section><div className="settings-actions"><span>Changes apply when you save.</span><button className="primary" disabled={busy} onClick={() => void savePreferences()}><Check size={15}/>{busy ? 'Saving...' : 'Save preferences'}</button></div></div>}
    {view === 'updates' && <div className="page-content update-page"><div className="page-intro"><span className="eyebrow">ALWAYS MOVING FORWARD</span><h1>A better workspace,<br/>one update at a time.</h1><p>Check the official release channel for the latest version.</p></div><section className="update-card"><div className="update-logo"><Logo/></div><div><span className="eyebrow">VERTEX X DESKTOP</span><h2>Version {version}<span className="beta-pill">BETA</span></h2><p>{checking ? 'Checking official GitHub releases…' : updates.message}</p></div><button className="primary" disabled={checking} onClick={() => void checkUpdates()}><RefreshCw size={15} className={checking ? 'spin' : ''}/>{checking ? 'Checking...' : 'Check for updates'}</button></section>{updates.pendingVersion && <div className="notice success"><CheckCircle2 size={18}/><div><strong>Version {updates.pendingVersion} is ready.</strong><p>Save your work and close Vertex X to install the verified update.</p></div></div>}<div className="release-info"><h2>Made for a smoother workflow.</h2><p>This release brings a new React workspace, syntax highlighting, recoverable tabs, a stoppable Lua runtime, and personal appearance settings.</p><div><span><CheckCircle2 size={14}/> SHA-256 verified downloads</span><span><CheckCircle2 size={14}/> Scripts and settings preserved</span></div><button className="secondary" onClick={() => void native('updates.page').catch(error)}>View GitHub releases<ExternalLink size={13}/></button></div></div>}
   </main>
  </div>
  <footer className="statusbar"><div><span className={'state-dot ' + (running ? 'running' : '')}/><span>{running ? 'Running script' : status}</span>{updates.pendingVersion && <button onClick={() => setView('updates')}>Update {updates.pendingVersion} ready<ArrowUpRight size={11}/></button>}</div><div><span>Ln {cursor.line}, Col {cursor.col}</span><span>UTF-8</span><span>Lua</span><span className="footer-native">{isNative ? 'Windows' : 'Preview'}</span></div></footer>
  {toast && <div className={'toast ' + (toast.error ? 'error' : '')} role="status">{toast.error ? <CircleAlert size={17}/> : <CheckCircle2 size={17}/>}<span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={14}/></button></div>}
  {confirm && <Modal title="Keep your changes?" subtitle={confirm.name + ' has unsaved edits.'} onClose={() => confirm.resolve('cancel')}><div className="confirm-copy">Save your script before closing, or keep editing.</div><div className="modal-actions"><button className="text-button danger" onClick={() => confirm.resolve('discard')}>Discard changes</button><div><button data-autofocus className="secondary" onClick={() => confirm.resolve('cancel')}>Keep editing</button><button className="primary" onClick={() => confirm.resolve('save')}><Save size={14}/> Save script</button></div></div></Modal>}
  {modal === 'account' && !confirm && <Modal title={account.signedIn ? 'Your account' : 'Welcome to Vertex X'} subtitle={account.signedIn ? 'Your workspace, with a familiar name.' : 'A place for your ideas. Sign in with your Zuzify account.'} onClose={busy ? undefined : () => setModal(null)}>{account.signedIn ? <div className="account-summary"><div className="large-avatar">{(account.username || 'V').slice(0, 1).toUpperCase()}</div><h3>{account.username || 'Vertex member'}</h3><span>Signed in</span><p>Scripts and workspace recovery are stored on this device. Account sessions end when you close the app.</p><button className="secondary" disabled={busy} onClick={async () => { setBusy(true); try { const result = await native<{ account: Account }>('auth.logout'); setAccount(result.account); setAuthMessage(''); } catch (e) { error(e); } finally { setBusy(false); } }}><LogOut size={14}/> Sign out</button></div> : <><div className="segmented"><button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); setAuthMessage(''); }}>Sign in</button><button className={authMode === 'signup' ? 'active' : ''} onClick={() => { setAuthMode('signup'); setAuthMessage(''); }}>Create account</button></div><form className="form" onSubmit={authenticate}>{authMode === 'signup' && <label>Username<input name="username" autoComplete="username" placeholder="your_username" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" required/></label>}<label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required/></label><label>Password<input name="password" type="password" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} placeholder="Enter your password" minLength={authMode === 'signup' ? 8 : 1} maxLength={1024} required/></label>{authMessage && <div className="form-message" role="status">{authMessage}</div>}<button className="primary full" type="submit" disabled={busy}>{busy ? 'Please wait...' : authMode === 'login' ? 'Sign in to Vertex X' : 'Create your account'}<ArrowUpRight size={15}/></button><p className="form-footnote">Your password is handled by Supabase Auth. It is never saved in your scripts or workspace recovery.</p></form></>}</Modal>}
  {modal === 'roblox' && !confirm && <Modal title="Roblox profiles & Studio tools" subtitle="Public profiles and scripts for games you create." onClose={busy ? undefined : () => setModal(null)}>
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
    <h3><Terminal size={16}/> In-game FPS overlay</h3>
    <p>Measures each player's rendered FPS and frame time in your own Roblox game.</p>
    <ol><li>Open your game in Roblox Studio.</li><li>Create a <strong>LocalScript</strong> under <strong>StarterPlayer → StarterPlayerScripts</strong>.</li><li>Paste the overlay source, then press <strong>Play / F5 in Studio</strong>.</li></ol>
    <div className="studio-tool-actions">
     <button className="primary" onClick={() => { addDocument('VertexXFpsOverlay.client.lua', FPS_OVERLAY_SCRIPT); setModal(null); }}><Code2 size={14}/> Open FPS overlay</button>
     <button className="secondary" onClick={() => void navigator.clipboard.writeText(FPS_OVERLAY_SCRIPT).then(() => notify('FPS overlay copied. Paste it into a Studio LocalScript.')).catch(error)}><Copy size={14}/> Copy script</button>
    </div>
    <small>F8 or the in-game FPS button toggles the panel. It also works with touch.</small>
   </section>
   <div className="profile-note">Public lookup is not a verified account link. Roblox scripts run in Studio or a published game; Vertex X's Run button runs desktop Lua.</div>
  </Modal>}
  {modal === 'commands' && !confirm && <Modal title="Find your next action" onClose={() => setModal(null)}><label className="command-input"><Search size={17}/><input aria-label="Search commands" placeholder="Type a command or filename..." value={commandQuery} onChange={e => setCommandQuery(e.target.value)}/></label><div className="command-results">{commands.map((cmd, i) => <button key={cmd.name + i} onClick={() => { setModal(null); cmd.action(); }}><Command size={15}/><span>{cmd.name}</span><kbd>{cmd.shortcut}</kbd></button>)}{!commands.length && <div className="no-commands">No matching files or commands.</div>}</div></Modal>}
 </div>;
}
