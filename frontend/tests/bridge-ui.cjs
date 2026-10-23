// Browser contract checks use a controlled host. They do not execute Windows WebView2.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const server = http.createServer((req, res) => {
 const file = path.resolve(root, '.' + (req.url === '/' ? '/index.html' : req.url.split('?')[0]));
 if (!file.startsWith(root + path.sep)) { res.statusCode = 403; res.end(); return; }
 try { res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html'); res.end(fs.readFileSync(file)); }
 catch { res.statusCode = 404; res.end(); }
});
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 let browser;
 try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  page.setDefaultTimeout(7000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
   class MockWebSocket {
    static OPEN=1; readyState=0;
    constructor(){setTimeout(()=>{this.readyState=1;this.onopen?.();},5);}
    send(raw){const m=JSON.parse(raw);setTimeout(()=>{this.onmessage?.({data:JSON.stringify({topic:m.topic,event:'phx_reply',payload:{status:'ok'}})});if(m.event==='phx_join')this.onmessage?.({data:JSON.stringify({topic:m.topic,event:'system',payload:{status:'ok',extension:'postgres_changes'}})});},5);}
    close(){this.readyState=3;this.onclose?.();}
   }
   window.WebSocket=MockWebSocket;
   const listeners = [];
   window.__host = { calls: [], replies: [], cancelSave: false, delayRun: false, pendingRun: null, library: [{ name: 'native.lua', size: 20, modified: '2026-10-01T00:00:00Z' }], savedLibrary: null, balance: 100, community: [], memberRole: 'member', cloudSettings: {realtime:true}, linked: null, customProfile: {} };
   window.__emit = message => listeners.forEach(listener => listener({ data: message }));
   window.chrome = { webview: { addEventListener: (_name, listener) => listeners.push(listener), postMessage: message => {
    const host = window.__host;
    host.calls.push(message);
    const reply = (result, error) => setTimeout(() => { host.replies.push({ method: message.method, result, error }); window.__emit({ id: message.id, ok: !error, result, error }); }, 5);
    const prefs = JSON.parse(localStorage.getItem('test.preferences') || 'null') || { fontSize: 14, wordWrap: false, autoUpdateEnabled: true, accent: 'violet' };
    const file = { id: '99999999-9999-4999-8999-999999999999', name: 'native.lua', content: "print('native-file')", baseline: "print('native-file')" };
    switch (message.method) {
     case 'app.ready': return reply({ version: '0.8.0', preferences: prefs, account: { signedIn: true, username: 'tester', userId: '11111111-1111-4111-8111-111111111111' }, library: host.library });
     case 'cloud.session': return reply({ url: 'https://wfqudstuncdldsvxqveu.supabase.co', publishableKey: 'test', accessToken: 'test-token', userId: '11111111-1111-4111-8111-111111111111', expiresAt: new Date(Date.now()+3600000).toISOString() });
     case 'cloud.request': {
      const {action,data}=message.payload;
      const member={user_id:'11111111-1111-4111-8111-111111111111',username:'tester',display_name:'Tester',bio:'Test biography',avatar_data_url:null,...host.customProfile};
      if(action==='snapshot')return reply({member,role:{role:host.memberRole,verified:true},wallet:{balance:host.balance},settings:host.cloudSettings,roblox:host.linked,scripts:host.community,authors:[member],authorRoles:[],ledger:[],runs:[],executionEnabled:true,runCost:1});
      if(action==='profile.save'){host.customProfile={display_name:data.displayName,bio:data.bio,avatar_data_url:data.avatar};return reply([host.customProfile]);}
      if(action==='settings.save'){host.cloudSettings=data;return reply([{settings:data}]);}
      if(action==='roblox.begin')return reply({username:'Roblox',code:'VertexX:test-proof',expiresAt:new Date(Date.now()+600000).toISOString()});
      if(action==='roblox.verify'){host.linked={roblox_id:1,username:'Roblox',display_name:'Roblox',method:'profile_bio_proof',avatar_data_url:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='};return reply(host.linked);}
      if(action==='roblox.unlink'){host.linked=null;return reply(null);}
      if(action==='owner.members')return reply([member]);
      if(action==='owner.grant'){host.balance+=data.amount;return reply(null);}
      if(action==='scripts.upload'){const script={id:crypto.randomUUID(),author_id:member.user_id,...data,updated_at:new Date().toISOString()};host.community.push(script);return reply([script]);}
      if(action==='scripts.open')return reply(host.community.find(s=>s.id===data.id));
      if(action==='scripts.delete'){host.community=host.community.filter(s=>s.id!==data.id);return reply([]);}
      if(action==='wallet.daily'){host.balance+=20;return reply({balance:host.balance});}
      return reply(null);
     }
     case 'files.list': return reply(host.library);
     case 'files.open': return reply([file]);
     case 'files.library': return reply(message.payload.name === host.savedLibrary?.name ? host.savedLibrary : file);
     case 'library.save': {
      if (host.library.some(f => f.name === message.payload.name)) return reply(null, 'A script with this name already exists.');
      host.savedLibrary = { id: '88888888-8888-4888-8888-888888888888', ...message.payload, saved: true };
      host.library.push({ name: message.payload.name, size: message.payload.content.length, modified: new Date().toISOString() });
      return reply(host.savedLibrary);
     }
     case 'files.save': if (host.cancelSave) { host.cancelSave = false; return reply(null); } return reply({ ...message.payload, name: message.payload.name, saved: true });
     case 'lua.run': if (host.delayRun) { window.__emit({ type: 'lua.output', data: { runId: message.payload.runId, text: 'streaming-before-stop' } }); host.pendingRun = () => reply(null, 'Execution stopped.'); return; } host.balance-=1; return reply({ output: 'bridge-output', elapsedMs: 3, truncated: false, charged: 1 });
     case 'lua.stop': host.pendingRun?.(); host.pendingRun = null; return reply(null);
     case 'settings.save': localStorage.setItem('test.preferences', JSON.stringify(message.payload)); return reply(message.payload);
     case 'auth.login': return reply({ message: 'Signed in as tester', account: { signedIn: true, username: 'tester', userId: '11111111-1111-4111-8111-111111111111' } });
     case 'auth.logout': return reply({ account: { signedIn: false } });
     case 'performance.gamebar':
     case 'performance.settings': return reply(null);
     case 'roblox.lookup': return reply({ id: 1, name: 'Roblox', displayName: 'Roblox', description: 'Public test biography', created: '2006-02-27T21:06:40Z', hasVerifiedBadge: true, avatarState: 'Completed', avatarDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=' });
     case 'updates.check': return reply({ version: '0.8.0', message: 'No complete published release is available yet.' });
     default: return reply(null);
    }
   } } };
  });
  const url = 'http://127.0.0.1:' + server.address().port;
  await page.goto(url);
  await page.getByRole('heading', { name: 'Code. Run. Create.' }).waitFor();
  await page.getByRole('button', {name:'Open crystal wallet'}).getByText('100',{exact:true}).waitFor();
  console.log('UI loaded');
  assert.equal(await page.locator('.preview-banner').count(), 0);
  await page.keyboard.press('Control+n');
  await page.getByRole('textbox', { name: 'Lua script editor' }).fill('print("bridge check")');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByText('Script saved to disk.').waitFor();
  assert.equal(await page.locator('.script-tab.active .dirty-dot').count(), 0);
  console.log('Save bridge passed');
  await page.keyboard.press('F5');
  await page.getByText('bridge-output', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => window.__host.calls.find(x => x.method === 'lua.run').payload.code), 'print("bridge check")');
  await page.evaluate(() => window.__host.delayRun = true);
  await page.getByRole('button', { name: 'Run script', exact: true }).click();
  await page.getByText('streaming-before-stop', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Stop script', exact: true }).click();
  await page.getByText('Execution stopped.', { exact: true }).waitFor();
  await page.evaluate(() => window.__host.delayRun = false);
  console.log('Run/stop bridge passed');
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('tab', { name: 'native.lua' }).waitFor();
  await page.getByRole('textbox', { name: 'Lua script editor' }).fill('print("unsaved")');
  await page.keyboard.press('Control+w');
  await page.getByRole('dialog', { name: 'Keep your changes?' }).waitFor();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  assert.equal(await page.getByRole('tab', { name: 'native.lua' }).count(), 1);
  await page.evaluate(() => window.__host.cancelSave = true);
  await page.keyboard.press('Control+w');
  await page.getByRole('dialog').getByRole('button', { name: 'Save script', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.__host.replies.some(x => x.method === 'files.save' && x.result === null));
  assert.equal(await page.getByRole('tab', { name: 'native.lua' }).count(), 1, 'Cancel Save As must retain the tab');
  await page.keyboard.press('Control+w');
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await page.getByRole('tab', { name: 'native.lua' }).waitFor({ state: 'hidden' });
  console.log('Close/cancel/discard passed');
  await page.getByRole('button', { name: 'Preferences', exact: true }).click();
  await page.getByRole('switch', { name: 'Word wrap' }).click();
  await page.getByRole('button', { name: 'mint accent' }).click();
  await page.getByRole('button', { name: 'Save preferences' }).click();
  await page.locator('.accent-mint').waitFor();
  assert.equal(await page.evaluate(() => window.__host.calls.find(x => x.method === 'settings.save').payload.wordWrap), true);
  console.log('Settings bridge passed');
  const themeColors = [];
  for (const theme of ['graphite','oled','midnight','ocean','forest','rose','lavender','amber']) {
   await page.getByRole('button', { name: theme + ' theme', exact: true }).click();
   assert(await page.locator('.app').evaluate((el, theme) => el.classList.contains('theme-' + theme), theme));
   themeColors.push(await page.locator('.app').evaluate(el => getComputedStyle(el).backgroundColor));
  }
  assert.equal(new Set(themeColors).size, 8, 'Each theme must change the workspace surface');
  await page.getByRole('button', { name: 'ocean theme', exact: true }).click();
  for (const effect of ['aurora','particles','grid','stars','waves']) {
   await page.getByLabel('Background effect', { exact: true }).selectOption(effect);
   assert.equal(await page.locator('canvas').getAttribute('data-effect'), effect);
   await page.waitForTimeout(90);
   assert(await page.locator('canvas').evaluate(el => el.getContext('2d').getImageData(0,0,el.width,el.height).data.some((v,i) => i % 4 === 3 && v > 0)), 'Background must draw pixels');

  }
  for (const effect of ['glow','trail','ripple']) {
   await page.getByLabel('Mouse effect', { exact: true }).selectOption(effect);
   await page.mouse.move(900,90); await page.mouse.click(900,90);
  }
  await page.getByLabel('Mouse effect', { exact: true }).selectOption('glow');
  await page.getByLabel('Background effect', { exact: true }).selectOption('aurora');
  await page.getByRole('button', { name: 'cyan accent', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(90);
  assert.equal(await page.locator('canvas').isVisible(), false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('switch', { name: 'Animated effects', exact: true }).click();
  await page.waitForTimeout(90);
  assert(await page.locator('canvas').evaluate(el => !el.getContext('2d').getImageData(0,0,el.width,el.height).data.some((v,i) => i % 4 === 3 && v > 0)));
  await page.getByRole('switch', { name: 'Animated effects', exact: true }).click();
  await page.getByRole('button', { name: 'Save preferences', exact: true }).click();
  await page.waitForFunction(() => window.__host.calls.filter(x => x.method === 'settings.save').length === 2);
  await page.getByRole('button', { name: 'Create shortcut', exact: true }).click();
  await page.waitForFunction(() => window.__host.calls.some(x => x.method === 'app.shortcut'));
  await page.locator('.settings-page').evaluate(el => el.scrollTop = 0);
  await page.screenshot({ path: '/tmp/vertex070-settings.png' });
  console.log('Eight themes, five backgrounds, pointer effects and shortcut bridge passed');
  await page.getByRole('button', { name: 'Open account' }).click();
  await page.getByRole('button', {name:'Sign out',exact:true}).click();
  await page.getByLabel('Email address').fill('test@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign in to Vertex X' }).click();
  await page.getByRole('heading', { name: 'tester', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close dialog' }).click();
  console.log('Account bridge passed');
  await page.getByRole('button', { name: 'Roblox profiles', exact: false }).click();
  await page.getByLabel('Roblox username').fill('Roblox');
  await page.getByRole('button', { name: 'Find public profile', exact: true }).click();
  await page.getByRole('img', { name: 'Roblox Roblox avatar' }).waitFor();
  await page.getByText('Public test biography', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Open Game Bar', exact: true }).click();
  await page.getByRole('button', { name: 'Game Bar settings', exact: true }).click();
  assert.equal(await page.evaluate(() => window.__host.calls.filter(x => x.method === 'performance.gamebar').length), 1);
  assert.equal(await page.evaluate(() => window.__host.calls.filter(x => x.method === 'performance.settings').length), 1);
  await page.getByRole('button', { name: 'Close dialog' }).click();

  await page.keyboard.press('Control+n');
  const editor = page.getByRole('textbox', { name: 'Lua script editor' });
  await editor.fill('pri');
  await page.keyboard.press('Control+Space');
  await page.locator('.cm-tooltip-autocomplete').waitFor();
  await page.keyboard.press('Tab');
  assert.equal(await editor.textContent(), 'print');
  await page.keyboard.type('(');
  assert.equal(await editor.textContent(), 'print()');
  await page.keyboard.press('Escape');
  await editor.fill('if true then');
  await page.keyboard.press('End');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  assert.equal((await editor.locator('.cm-line').allTextContents()).join('\n'), 'if true then\n    ');
  await editor.fill('local value = 1');
  await editor.press('Home');
  await editor.press('Tab');
  assert.equal(await editor.textContent(), '    local value = 1');
  await editor.press('Shift+Tab');
  assert.equal(await editor.textContent(), 'local value = 1');
  await editor.fill('ifblock');
  await editor.press('Control+Space');
  await page.locator('.cm-tooltip-autocomplete').waitFor();
  await editor.press('Tab');
  await page.keyboard.type('true');
  await editor.press('Tab');
  await page.keyboard.type('print(1)');
  assert.match((await editor.locator('.cm-line').allTextContents()).join('\n'), /if true then\n +print\(1\)\nend/);
  await editor.fill('game:GetService("Players")');
  const previousRuns = await page.evaluate(() => window.__host.calls.filter(x => x.method === 'lua.run').length);
  await page.getByRole('button', { name: 'Run script', exact: true }).click();
  await page.getByRole('dialog', { name: 'Roblox profiles & FPS' }).waitFor();
  assert.equal(await page.evaluate(() => window.__host.calls.filter(x => x.method === 'lua.run').length), previousRuns);
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await page.keyboard.press('Control+w');
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  console.log('Roblox profile, Windows FPS launch commands, completion Tab, bracket pairs and Enter indentation checked');

  await page.getByRole('button', { name: 'Script library', exact: true }).click();
  await page.getByRole('button', { name: 'Save current script', exact: true }).click();
  await page.getByLabel('Script filename').fill('native.lua');
  await page.getByRole('button', { name: 'Save library copy', exact: true }).click();
  await page.getByRole('alert').getByText('A script with this name already exists.').waitFor();
  await page.getByLabel('Script filename').fill('my-library.lua');
  await page.getByRole('button', { name: 'Save library copy', exact: true }).click();
  await page.getByRole('tab', { name: 'my-library.lua', exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Lua script editor' }).fill('print("unsaved-library-edit")');
  await page.getByRole('button', { name: 'Script library', exact: true }).click();
  await page.getByLabel('Search script library').fill('my-library');
  assert.equal(await page.locator('.saved-list>button').count(), 1);
  await page.getByRole('button', { name: 'my-library.lua', exact: false }).last().click();
  assert.equal(await page.getByRole('textbox', { name: 'Lua script editor' }).textContent(), 'print("unsaved-library-edit")');
  const selectedTab = await page.getByRole('tab', { selected: true }).textContent();
  await page.keyboard.press('Control+Tab');
  assert.notEqual(await page.getByRole('tab', { selected: true }).textContent(), selectedTab);
  await page.keyboard.press('Control+Shift+Tab');
  assert.equal(await page.getByRole('tab', { selected: true }).textContent(), selectedTab);
  const selectedEditor = page.getByRole('textbox', { name: 'Lua script editor' });
  await selectedEditor.fill('print("selection-only")\nerror("must-not-run")');
  await selectedEditor.press('Control+Home');
  await selectedEditor.press('Shift+End');
  await selectedEditor.press('Control+Enter');
  await page.waitForFunction(() => window.__host.calls.some(x => x.method === 'lua.run' && x.payload.code === 'print("selection-only")'));
  await page.getByRole('button', { name: 'Run script', exact: true }).waitFor();
  await page.screenshot({ path: '/tmp/vertex070-editor.png' });
  await page.keyboard.press('Control+w');
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  console.log('Library save/collision/search, dirty-tab preservation, tab cycling and selection execution passed');

  await page.keyboard.press('Control+n');
  await page.getByRole('textbox', {name:'Lua script editor'}).fill('print("shared source")');
  await page.getByRole('button', {name:'Community',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.community-status')?.textContent.includes('Live'));
  await page.getByLabel('Script title',{exact:true}).fill('Community test');
  await page.getByLabel('Script description',{exact:true}).fill('Contract upload');
  await page.getByRole('button',{name:'Upload script',exact:true}).click();
  await page.getByRole('heading',{name:'Community test',exact:true}).waitFor();
  const runsBeforeInspect=await page.evaluate(()=>window.__host.calls.filter(c=>c.method==='lua.run').length);
  await page.getByRole('button',{name:'Inspect in editor',exact:true}).click();
  assert.equal(await page.getByRole('textbox',{name:'Lua script editor'}).textContent(),'print("shared source")');
  assert.equal(await page.evaluate(()=>window.__host.calls.filter(c=>c.method==='lua.run').length),runsBeforeInspect,'Inspect must never auto-execute uploaded source');
  await page.keyboard.press('Control+w');
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  await page.keyboard.press('Control+w');
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();
  await page.getByRole('button',{name:'Community',exact:true}).click();
  await page.getByRole('button',{name:'Delete',exact:true}).click();
  await page.getByRole('button',{name:'Confirm delete',exact:true}).click();
  await page.getByRole('heading',{name:'Community test',exact:true}).waitFor({state:'hidden'});
  await page.getByRole('button',{name:'profile',exact:true}).click();
  await page.getByLabel('Display name',{exact:true}).fill('Updated tester');
  await page.getByLabel('Bio',{exact:true}).fill('Updated bio');
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await page.getByRole('heading',{name:'Updated tester',exact:true}).waitFor();
  await page.getByLabel('Roblox username',{exact:true}).fill('Roblox');
  await page.getByRole('button',{name:'Create link code',exact:true}).click();
  await page.getByText('VertexX:test-proof',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Verify Roblox link',exact:true}).click();
  await page.getByRole('img',{name:'Your Roblox avatar',exact:true}).waitFor();
  await page.getByRole('button',{name:'settings',exact:true}).click();
  await page.getByRole('switch',{name:'Live community updates',exact:true}).click();
  await page.getByRole('button',{name:'Save account preferences',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.community-status')?.textContent.includes('Live updates paused'));
  await page.getByRole('switch',{name:'Live community updates',exact:true}).click();
  await page.getByRole('button',{name:'Save account preferences',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.community-status')?.textContent.includes('Live'));
  await page.getByRole('button',{name:'crystals',exact:true}).click();
  const credits=await page.evaluate(()=>window.__host.balance);
  await page.getByRole('button',{name:'Claim daily crystals',exact:true}).click();
  await page.waitForFunction(n=>window.__host.balance===n+20,credits);
  await page.evaluate(()=>window.__host.memberRole='owner');
  await page.getByRole('button',{name:'Refresh',exact:true}).click();
  await page.getByRole('button',{name:'owner',exact:true}).click();
  await page.getByRole('button',{name:'Load members',exact:true}).click();
  await page.getByLabel('Member',{exact:true}).selectOption('11111111-1111-4111-8111-111111111111');
  await page.getByRole('button',{name:'Verify member',exact:true}).click();
  await page.waitForFunction(()=>window.__host.calls.some(c=>c.method==='cloud.request'&&c.payload.action==='owner.verify'));
  await page.getByRole('button',{name:'Editor',exact:false}).first().click();
  console.log('PASS: community source inspection, upload/delete, profile, Roblox proof UI, live toggle, daily claim and owner commands.');
  await page.getByRole('button', { name: 'Updates', exact: true }).click();
  await page.getByRole('button', { name: 'Check for updates' }).click();
  await page.getByText('No complete published release is available yet.').waitFor();
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Search commands' }).fill('native.lua');
  await page.getByRole('button', { name: 'native.lua FILE' }).click();
  await page.getByRole('tab', { name: 'native.lua' }).waitFor();
  await page.getByRole('textbox', { name: 'Lua script editor' }).fill('print("recovered")');
  await page.waitForTimeout(350);
  await page.reload();
  assert(await page.locator('.app.theme-ocean.accent-cyan').count() === 1, 'Appearance should load from saved preferences');
  await page.getByRole('tab', { name: 'native.lua' }).click();
  assert.equal(await page.getByRole('textbox', { name: 'Lua script editor' }).textContent(), 'print("recovered")');
  await page.evaluate(() => window.__emit({ type: 'request-close' }));
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await page.waitForFunction(() => window.__host.calls.some(x => x.method === 'app.cancelClose'));
  await page.evaluate(() => window.__emit({ type: 'request-close' }));
  await page.getByRole('dialog').getByRole('button', { name: 'Save script', exact: true }).click();
  await page.waitForFunction(() => window.__host.calls.some(x => x.method === 'app.close'));
  assert.deepEqual(errors, [], 'Renderer must not have uncaught errors');
  // Check the compact layout at the native minimum window size.
  await page.setViewportSize({ width: 850, height: 570 });
  assert(await page.getByRole('button', { name: 'Run script', exact: true }).isVisible());
  console.log('PASS: editor changes, save, run/stop bridge, native open, close cancellation/discard, cancelled Save As, settings, account form/logout, update status, command search, recovery, exit handshake, compact layout; no renderer errors.');
 } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
