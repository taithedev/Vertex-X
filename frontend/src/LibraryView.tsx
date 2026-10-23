import { useState } from 'react';
import { Files, Search, FolderOpen, RefreshCw, Plus, FileCode2, ArrowUpRight } from 'lucide-react';
import type { ScriptFile } from './bridge';
export function LibraryView({ files, snippets, onOpen, onSnippet, onImport, onFolder, onSave, onRefresh }: {
 files: ScriptFile[]; snippets: { name: string; category: string; description: string; code: string; file: string }[];
 onOpen: (name: string) => void; onSnippet: (name: string, code: string) => void; onImport: () => void; onFolder: () => void; onSave: () => void; onRefresh: () => void;
}) {
 const [query, setQuery] = useState(''); const [sort, setSort] = useState('name');
 const search = query.trim().toLowerCase();
 const saved = files.filter(f => f.name.toLowerCase().includes(search)).sort((a,b) => sort === 'size' ? b.size - a.size : sort === 'recent' ? (b.modified || '').localeCompare(a.modified || '') : a.name.localeCompare(b.name));
 const starters = snippets.filter(s => (s.name + s.category + s.description).toLowerCase().includes(search));
 return <div className="page-content library-page"><div className="page-intro"><span className="eyebrow">YOUR COLLECTION</span><h1>Everything starts<br/>with a good script.</h1><p>Your saved files and ready-to-run Lua starters, in one place.</p></div>
  <div className="library-toolbar"><label className="library-search"><Search size={16}/><input aria-label="Search script library" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search scripts and starters..."/></label><select aria-label="Sort scripts" value={sort} onChange={e => setSort(e.target.value)}><option value="name">Name A–Z</option><option value="recent">Recently edited</option><option value="size">Largest first</option></select><button className="secondary" onClick={onImport}><FolderOpen size={14}/>Import / open</button><button className="primary" onClick={onSave}><Plus size={14}/>Save current script</button></div>
  <div className="section-heading"><h2><Files size={16}/>Saved scripts <span className="count">{saved.length}</span></h2><div><button className="text-button" onClick={onRefresh}><RefreshCw size={12}/>Refresh library</button><button className="text-button" onClick={onFolder}>Open folder<ArrowUpRight size={12}/></button></div></div>
  <div className="saved-list">{saved.map(file => <button key={file.name} onClick={() => onOpen(file.name)}><FileCode2 size={17}/><strong>{file.name}</strong><span>{(file.size / 1024).toFixed(1)} KB</span><ArrowUpRight size={14}/></button>)}{!saved.length && <div className="page-empty"><FolderOpen size={28}/><h3>{search ? 'No matching scripts' : 'Your collection starts here.'}</h3><p>{search ? 'Try another search, or open a starter below.' : 'Use Save current script to keep a named copy in your library.'}</p></div>}</div>
  <div className="section-heading"><h2>Starter snippets</h2><span>{starters.length} ready to edit</span></div><div className="snippet-grid">{starters.map((item,index) => <button key={item.name} className="snippet-card" onClick={() => onSnippet(item.file,item.code)}><div className="snippet-icon"><FileCode2 size={19}/><span>0{index+1}</span></div><small>{item.category}</small><h3>{item.name}<ArrowUpRight size={16}/></h3><p>{item.description}</p><div className="snippet-bottom"><span>Cloud Lua</span><span>Open in editor</span></div></button>)}</div>
 </div>;
}
