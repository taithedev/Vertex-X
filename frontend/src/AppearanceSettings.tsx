import { Check, Sparkles, MousePointer2, Waves } from 'lucide-react';
import type { Preferences } from './bridge';
import { themes, accents, backgrounds, mouseEffects, defaultPreferences } from './appearance';
export function AppearanceSettings({ value, onChange }: { value: Preferences; onChange: (value: Preferences) => void }) {
 const set = (patch: Partial<Preferences>) => onChange({ ...value, ...patch });
 return <>
  <section className="settings-card"><h2><Sparkles size={16}/>Theme studio <span className="live-badge">Live preview</span></h2>
   <div className="theme-grid">{themes.map(theme => <button key={theme} className={'theme-card theme-' + theme} aria-label={theme + ' theme'} aria-pressed={value.theme === theme} onClick={() => set({ theme })}><span className="theme-preview"><i/><i/><i/></span><span>{theme}</span>{value.theme === theme && <Check size={14}/>}</button>)}</div>
   <div className="setting-row"><div><strong>Accent color</strong><p>Buttons, focus rings and your editor cursor.</p></div><div className="swatches">{accents.map(accent => <button key={accent} className={'swatch ' + accent} aria-label={accent + ' accent'} aria-pressed={value.accent === accent} onClick={() => set({ accent })}>{value.accent === accent && <Check size={14}/>}</button>)}</div></div>
  </section>
  <section className="settings-card"><h2><Waves size={16}/>Background & motion</h2>
   <div className="setting-row"><label htmlFor="background-effect"><strong>Background effect</strong><p>Five animated styles, or a clean static workspace.</p></label><select id="background-effect" aria-label="Background effect" value={value.backgroundEffect} onChange={e => set({ backgroundEffect: e.target.value })}>{backgrounds.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
   <div className="setting-row"><label htmlFor="mouse-effect"><strong><MousePointer2 size={12}/> Mouse effect</strong><p>Glow follows your pointer; ripple reacts to clicks.</p></label><select id="mouse-effect" aria-label="Mouse effect" value={value.mouseEffect} onChange={e => set({ mouseEffect: e.target.value })}>{mouseEffects.map(x => <option key={x} value={x}>{x}</option>)}</select></div>
   <div className="setting-row"><label htmlFor="effect-intensity"><strong>Effect intensity</strong><p>Keep it subtle, or make the background stand out.</p></label><div className="range-control"><input id="effect-intensity" aria-label="Effect intensity" type="range" min="0" max="100" value={value.effectIntensity} onChange={e => set({ effectIntensity: Number(e.target.value) })}/><span>{value.effectIntensity}%</span></div></div>
   <div className="setting-row"><div><strong>Animated effects</strong><p>Also respects Windows reduced-motion preferences. Pauses when hidden.</p></div><button role="switch" aria-label="Animated effects" aria-checked={value.motionEnabled} className={'toggle ' + (value.motionEnabled ? 'on' : '')} onClick={() => set({ motionEnabled: !value.motionEnabled })}><i/></button></div>
   <button className="text-button reset-appearance" onClick={() => set({ theme: defaultPreferences.theme, accent: defaultPreferences.accent, backgroundEffect: defaultPreferences.backgroundEffect, mouseEffect: defaultPreferences.mouseEffect, effectIntensity: defaultPreferences.effectIntensity, motionEnabled: true })}>Reset appearance</button>
  </section>
 </>;
}
