import fs from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
if(process.argv.includes('--child')){
 let source=fs.readFileSync(new URL('../../functions/vertexx-api/runner.ts',import.meta.url),'utf8');
 source=source.replace('"npm:fengari@0.1.5"',JSON.stringify(new URL('./node_modules/fengari/src/fengari.js',import.meta.url).href));
 const {runLua}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
 const input=JSON.parse(fs.readFileSync(0,'utf8'));
 process.stdout.write(JSON.stringify(runLua(input)));
}else{
 function run(code){const r=spawnSync(process.execPath,['--disable-warning=ExperimentalWarning','--max-old-space-size=96',new URL(import.meta.url).pathname,'--child'],{input:JSON.stringify(code),encoding:'utf8',timeout:4000,maxBuffer:1500000});assert.equal(r.status,0,'Worker must terminate cleanly: '+(r.error?.message||r.stderr));return JSON.parse(r.stdout);}
 const good=run("print('hello',true); return 2+3");assert(good.success);assert.match(good.output,/hello\s+true/);assert.match(good.output,/Result: 5/);
 const protectedRun=run("local ok,err=pcall(function() error('expected') end); assert(not ok); print('caught'); local ok,v=pcall(function(a) return a+1 end,4);assert(ok and v==5); local ok,e=xpcall(function() error('bad') end,function(e)return 'handled' end);assert(not ok and e=='handled')");
 assert(protectedRun.success,protectedRun.error);
 for(const code of [
  'while true do end',
  'while true do pcall(function() while true do end end) end',
  "xpcall(function() error('x') end,function() while true do end end)",
  "print(setmetatable({},{__tostring=function() while true do end end}))",
  "local x='a';for i=1,30 do x=x..x end",
  "print(string.rep('a',1000000000))",
  "print(string.format('%100000000s','a'))",
  'function broken(',
  "return setmetatable({},{__tostring=function() while true do end end})",
  "\x1bLua"+'bad-bytecode',
  "print('before');error('failure')"
 ]){const result=run(code);assert.equal(result.success,false,code);assert(result.error);}
 const restricted=run("assert(os==nil and io==nil and debug==nil and package==nil and require==nil and load==nil and dofile==nil and fengari==nil and js==nil);print(string.format('%s %d','ok',42))");assert(restricted.success,restricted.error);
 const capped=run("for i=1,2000 do print(string.rep('x',100)) end");assert(capped.success,capped.error);assert(capped.truncated);assert(capped.output.length<=100000);
 const failed=run("print('kept');error('no')");assert.match(failed.output,/kept/);
 console.log('PASS: protected calls, output/returns, syntax/runtime errors, quota escape attempts, allocation guards, restricted globals and output cap.');
}
