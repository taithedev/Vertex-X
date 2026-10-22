import { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, HighlightStyle, StreamLanguage } from '@codemirror/language';
import { search, searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { tags } from '@lezer/highlight';

const colors = HighlightStyle.define([
 { tag: tags.keyword, color: '#bf9cff' }, { tag: [tags.string, tags.special(tags.string)], color: '#a7d9b0' },
 { tag: tags.comment, color: '#656877', fontStyle: 'italic' }, { tag: tags.number, color: '#e3b989' },
 { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: '#a8c9fa' },
 { tag: tags.operator, color: '#c2c5d2' }, { tag: tags.bool, color: '#f0a8c3' },
]);
export function Editor({ content, wrap, fontSize, onChange, onCursor }: { content: string; wrap: boolean; fontSize: number; onChange: (text: string) => void; onCursor: (line: number, col: number) => void }) {
 const container = useRef<HTMLDivElement>(null);
 const view = useRef<EditorView | null>(null);
 const callbacks = useRef({ onChange, onCursor }); callbacks.current = { onChange, onCursor };
 const wrapping = useRef(new Compartment());
 useEffect(() => {
   const editor = new EditorView({ parent: container.current!, state: EditorState.create({ doc: content, extensions: [
    lineNumbers(), foldGutter(), highlightActiveLine(), highlightActiveLineGutter(), history(), drawSelection(), rectangularSelection(),
    indentOnInput(), bracketMatching(), search({ top: true }), highlightSelectionMatches(), StreamLanguage.define(lua), syntaxHighlighting(colors),
    keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]), EditorState.tabSize.of(4),
    wrapping.current.of(wrap ? EditorView.lineWrapping : []),
    EditorView.theme({ '&': { height: '100%', background: 'transparent', color: '#dbdce7' }, '.cm-content': { fontFamily: 'Consolas, "Cascadia Code", monospace', padding: '20px 0', caretColor: '#c1a7ff' }, '.cm-line': { padding: '0 22px 0 12px' }, '.cm-gutters': { background: 'transparent', color: '#4f5261', border: 'none', padding: '0 8px 0 12px' }, '.cm-activeLine': { background: '#ffffff03' }, '.cm-activeLineGutter': { background: 'transparent', color: '#a6a3b5' }, '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { background: '#a581ef30' }, '.cm-cursor': { borderLeftColor: '#c5b1f7' }, '.cm-scroller': { overflow: 'auto', lineHeight: '1.85' }, '.cm-searchMatch': { backgroundColor: '#8b6bba44', outline: '1px solid #9e83bc' }, '.cm-panels': { background: '#1b1b23', color: '#d8d4e6', borderColor: '#33333f' } }, { dark: true }),
    EditorView.updateListener.of(update => {
      if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
      if (update.selectionSet || update.docChanged) { const pos = update.state.selection.main.head; const line = update.state.doc.lineAt(pos); callbacks.current.onCursor(line.number, pos - line.from + 1); }
    }),
    EditorView.contentAttributes.of({ 'aria-label': 'Lua script editor', spellcheck: 'false' }),
   ] }) });
   view.current = editor;
   return () => { editor.destroy(); view.current = null; };
 }, []);
 useEffect(() => { const editor = view.current; if (editor && editor.state.doc.toString() !== content) editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: content } }); }, [content]);
 useEffect(() => { view.current?.dispatch({ effects: wrapping.current.reconfigure(wrap ? EditorView.lineWrapping : []) }); }, [wrap]);
 return <div ref={container} className="code-editor" style={{ fontSize }} />;
}
