
// Candidate server-side Lua runner. Intentionally gated off in index.ts pending runtime tests.
import fengari from "npm:fengari@0.1.5";
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=fengari;
export function runLua(source: string) {
 const L=lauxlib.luaL_newstate(), start=performance.now();let output="",truncated=false,instructions=0;
 function append(value:string){const remaining=100000-output.length;output+=value.slice(0,remaining);truncated ||=value.length>remaining;}
 try {
  // Do not open IO, OS, package, debug, interop or coroutine libraries.
  for(const [name,open] of [["_G",lualib.luaopen_base],["table",lualib.luaopen_table],["string",lualib.luaopen_string],["math",lualib.luaopen_math],["utf8",lualib.luaopen_utf8]]){
   lauxlib.luaL_requiref(L,to_luastring(name),open,1);lua.lua_pop(L,1);
  }
  for(const name of ["dofile","loadfile","load","collectgarbage","pcall","xpcall"]){lua.lua_pushnil(L);lua.lua_setglobal(L,to_luastring(name));}
  lua.lua_pushcfunction(L,(state:any)=>{const values=[];for(let i=1;i<=lua.lua_gettop(state);i++){values.push(to_jsstring(lauxlib.luaL_tolstring(state,i)));lua.lua_pop(state,1);}append(values.join("\t")+"\n");return 0;});
  lua.lua_setglobal(L,to_luastring("print"));
  lua.lua_sethook(L,()=>{instructions+=10000;if(instructions>1000000 || performance.now()-start>1000)throw new Error("Script exceeded the execution limit");},lua.LUA_MASKCOUNT,10000);
  const bytes=to_luastring(source);
  let status=lauxlib.luaL_loadbufferx(L,bytes,bytes.length,to_luastring("vertexx-script"),to_luastring("t"));
  if(status===lua.LUA_OK)status=lua.lua_pcall(L,0,lua.LUA_MULTRET,0);
  if(status!==lua.LUA_OK)return {success:false,error:lua.lua_tojsstring(L,-1)||"Script failed",output,elapsedMs:Math.round(performance.now()-start),truncated};
  return {success:true,output,elapsedMs:Math.round(performance.now()-start),truncated};
 } catch(error){return {success:false,error:error instanceof Error?error.message:"Execution failed",output,elapsedMs:Math.round(performance.now()-start),truncated};}
 finally{lua.lua_close(L);}
}
