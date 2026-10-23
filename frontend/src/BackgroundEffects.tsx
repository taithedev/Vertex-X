import { useEffect, useRef } from 'react';
import type { Preferences } from './bridge';
// Animation and pointer data stay outside React state to avoid editor re-renders.
export function BackgroundEffects({ preferences: p }: { preferences: Preferences }) {
 const canvas = useRef<HTMLCanvasElement>(null);
 useEffect(() => {
  const element = canvas.current;
  if (!element) return;
  const ctx = element.getContext('2d');
  if (!ctx) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let width = 1, height = 1, frame = 0, last = 0;
  let pointer = { x: -1000, y: -1000 };
  let points: { x: number; y: number; life: number }[] = [];
  const dots = Array.from({ length: 55 }, (_, i) => ({ x: ((i * 73 + 17) % 997) / 997, y: ((i * 137 + 43) % 991) / 991, r: 0.7 + (i % 3) * 0.5 }));
  const color = getComputedStyle(element.parentElement!).getPropertyValue('--accent').trim() || '#b89af8';
  function resize() { width = innerWidth; height = innerHeight; const scale = Math.min(devicePixelRatio || 1, 1.5); element!.width = width * scale; element!.height = height * scale; ctx!.setTransform(scale, 0, 0, scale, 0, 0); }
  function move(e: PointerEvent) { pointer = { x: e.clientX, y: e.clientY }; if (p.mouseEffect === 'trail') points = [...points.slice(-28), { ...pointer, life: 1 }]; }
  function click(e: PointerEvent) { if (p.mouseEffect === 'ripple') points = [...points.slice(-8), { x: e.clientX, y: e.clientY, life: 1 }]; }
  function draw(now: number) {
   frame = 0;
   if (document.hidden || !p.motionEnabled || media.matches || p.effectIntensity === 0 || (p.backgroundEffect === 'off' && p.mouseEffect === 'off')) { ctx!.clearRect(0, 0, width, height); return; }
   frame = requestAnimationFrame(draw);
   if (now - last < 32) return;
   last = now;
   const t = now / 1000, c = ctx!;
   c.clearRect(0, 0, width, height);
   c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 1;
   const intensity = p.effectIntensity / 100;
   if (p.backgroundEffect === 'aurora') {
    for (let i = 0; i < 3; i++) { const x = width * (.2 + i * .3) + Math.sin(t * .13 + i) * 140, y = height * (.3 + i * .2) + Math.cos(t * .17 + i) * 100; const radius = Math.max(width, height) * .55; const gradient = c.createRadialGradient(x, y, 0, x, y, radius); gradient.addColorStop(0, color); gradient.addColorStop(1, 'transparent'); c.globalAlpha = intensity * .25; c.fillStyle = gradient; c.fillRect(0, 0, width, height); }
   } else if (p.backgroundEffect === 'particles' || p.backgroundEffect === 'stars') {
    for (let i = 0; i < dots.length; i++) { const d = dots[i]; c.globalAlpha = intensity * (p.backgroundEffect === 'stars' ? .25 + .6 * (1 + Math.sin(t + i)) / 2 : .6); const x = (d.x * width + t * (p.backgroundEffect === 'stars' ? 2 : 9)) % width; const y = (d.y * height + Math.sin(t * .3 + i) * 14 + height) % height; c.beginPath(); c.arc(x, y, d.r, 0, Math.PI * 2); c.fillStyle = color; c.fill(); }
   } else if (p.backgroundEffect === 'grid') {
    c.globalAlpha = intensity * .22;
    for (let x = (t * 6) % 48; x < width; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, height); c.stroke(); }
    for (let y = (t * 3) % 48; y < height; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(width, y); c.stroke(); }
   } else if (p.backgroundEffect === 'waves') {
    for (let i = 0; i < 10; i++) { c.globalAlpha = intensity * .3; c.beginPath(); for (let x = 0; x <= width; x += 12) { const y = height * .5 + Math.sin(x / 200 + t * .4 + i * .25) * (60 + i * 10) + i * 18; if (!x) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke(); }
   }
   if (p.mouseEffect === 'glow' && pointer.x >= 0) { const g = c.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 210); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); c.globalAlpha = intensity * .4; c.fillStyle = g; c.fillRect(0, 0, width, height); }
   points = points.filter(dot => dot.life > 0);
   for (const dot of points) { dot.life -= p.mouseEffect === 'ripple' ? .025 : .045; c.globalAlpha = Math.max(0, dot.life) * intensity * .7; c.beginPath(); c.arc(dot.x, dot.y, p.mouseEffect === 'ripple' ? (1 - dot.life) * 90 : 2 + dot.life * 5, 0, Math.PI * 2); if (p.mouseEffect === 'ripple') c.stroke(); else { c.fillStyle = color; c.fill(); } }
   c.globalAlpha = 1;
  }
  function start() { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }
  resize(); start();
  window.addEventListener('resize', resize); window.addEventListener('pointermove', move, { passive: true }); window.addEventListener('pointerdown', click, { passive: true }); document.addEventListener('visibilitychange', start); media.addEventListener('change', start);
  return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', click); document.removeEventListener('visibilitychange', start); media.removeEventListener('change', start); };
 }, [p.theme, p.accent, p.backgroundEffect, p.mouseEffect, p.effectIntensity, p.motionEnabled]);
 return <canvas ref={canvas} className="background-effects" aria-hidden="true" data-effect={p.backgroundEffect}/>;
}
