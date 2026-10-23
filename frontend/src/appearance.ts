import type { Preferences } from './bridge';
export const themes = ['graphite', 'oled', 'midnight', 'ocean', 'forest', 'rose', 'lavender', 'amber'] as const;
export const accents = ['violet', 'mint', 'ice', 'rose', 'amber', 'cyan', 'lime', 'white'] as const;
export const backgrounds = ['off', 'aurora', 'particles', 'grid', 'stars', 'waves'] as const;
export const mouseEffects = ['off', 'glow', 'trail', 'ripple'] as const;
export const defaultPreferences: Preferences = { fontSize: 14, wordWrap: false, autoUpdateEnabled: true, accent: 'violet', theme: 'graphite', backgroundEffect: 'aurora', mouseEffect: 'glow', effectIntensity: 35, motionEnabled: true, updateCheckMinutes: 15 };
export function normalizePreferences(value: Partial<Preferences>): Preferences {
 const p = { ...defaultPreferences, ...value };
 return { ...p, theme: themes.includes(p.theme as typeof themes[number]) ? p.theme : 'graphite',
  accent: accents.includes(p.accent as typeof accents[number]) ? p.accent : 'violet',
  backgroundEffect: backgrounds.includes(p.backgroundEffect as typeof backgrounds[number]) ? p.backgroundEffect : 'off',
  mouseEffect: mouseEffects.includes(p.mouseEffect as typeof mouseEffects[number]) ? p.mouseEffect : 'off',
  effectIntensity: Number.isFinite(p.effectIntensity) ? Math.max(0, Math.min(100, p.effectIntensity)) : 35 };
}
