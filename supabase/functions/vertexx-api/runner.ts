// Fresh VM per run. No filesystem, network, package loader, debug or JS interop.
import fengari from "npm:fengari@0.1.5";
const {lua,lauxlib,lualib,to_luastring,to_jsstring}=fengari;
export function runLua(source: string) {
 const L=lauxlib.luaL_newstate(), start=performance.now();
 let output="",truncated=false,instructions=0,aborted="";
 const MAX_STRING=262144, MAX_OUTPUT=100000;
 function fail(state:any,message:string){aborted=message;return lauxlib.luaL_error(state,to_luastring(message));}
 function check(state:any){
  instructions+=10;
  if(aborted)return fail(state,aborted);
  if(instructions>300000 || performance.now()-start>750)return fail(state,"Script exceeded the execution limit");
  let total=0;
  for(let i=1;i<=lua.lua_gettop(state);i++)if(lua.lua_type(state,i)===lua.LUA_TSTRING){const size=lua.lua_rawlen(state,i);total+=size;if(size>MAX_STRING||total>1048576)return fail(state,"Script exceeded the string memory limit");}
 }
 function append(value:string){const remaining=MAX_OUTPUT-output.length;output+=value.slice(0,remaining);truncated ||=value.length>remaining;}
 function stringify(state:any,index:number){const value=to_jsstring(lauxlib.luaL_tolstring(state,index));lua.lua_pop(state,1);return value;}
 try {
  if(new TextEncoder().encode(source).length>100000)throw new Error("Scripts must be under 100 KB");
  for(const [name,open] of [["_G",lualib.luaopen_base],["table",lualib.luaopen_table],["string",lualib.luaopen_string],["math",lualib.luaopen_math],["utf8",lualib.luaopen_utf8]]){
   lauxlib.luaL_requiref(L,to_luastring(name),open,1);lua.lua_pop(L,1);
  }
  for(const name of ["dofile","loadfile","load","collectgarbage"]){lua.lua_pushnil(L);lua.lua_setglobal(L,to_luastring(name));}
  // Every protected call propagates a host quota failure, so Lua cannot catch it.
  lua.lua_pushcfunction(L,(state:any)=>{
   const status=lua.lua_pcall(state,lua.lua_gettop(state)-1,lua.LUA_MULTRET,0);
   if(aborted)return fail(state,aborted);
   lua.lua_pushboolean(state,status===lua.LUA_OK);lua.lua_insert(state,1);return lua.lua_gettop(state);
  });lua.lua_setglobal(L,to_luastring("pcall"));
  lua.lua_pushcfunction(L,(state:any)=>{
   lauxlib.luaL_checktype(state,2,lua.LUA_TFUNCTION);
   lua.lua_pushvalue(state,2);const handler=lauxlib.luaL_ref(state,lua.LUA_REGISTRYINDEX);lua.lua_remove(state,2);
   try{
    let status=lua.lua_pcall(state,lua.lua_gettop(state)-1,lua.LUA_MULTRET,0);
    if(aborted)return fail(state,aborted);
    if(status!==lua.LUA_OK){
     lua.lua_rawgeti(state,lua.LUA_REGISTRYINDEX,handler);lua.lua_insert(state,1);
     const handled=lua.lua_pcall(state,1,1,0);
     if(aborted)return fail(state,aborted);
     if(handled!==lua.LUA_OK){lua.lua_settop(state,0);lua.lua_pushstring(state,to_luastring("error in error handling"));}
    }
    lua.lua_pushboolean(state,status===lua.LUA_OK);lua.lua_insert(state,1);return lua.lua_gettop(state);
   }finally{lauxlib.luaL_unref(state,lua.LUA_REGISTRYINDEX,handler);}
  });lua.lua_setglobal(L,to_luastring("xpcall"));
  // Bound bulk string allocation before native library functions allocate.
  lua.lua_getglobal(L,to_luastring("string"));
  for(const name of ["rep","format"]){
   lua.lua_getfield(L,-1,to_luastring(name));const original=lua.lua_tocfunction(L,-1);lua.lua_pop(L,1);
   lua.lua_pushcfunction(L,(state:any)=>{
    const input=lauxlib.luaL_checkstring(state,1);
    if(name==="rep"){
     const count=lauxlib.luaL_checkinteger(state,2),sep=lauxlib.luaL_optstring(state,3,to_luastring(""));
     if(Math.max(0,count)*(input.length+sep.length)>MAX_STRING)return fail(state,"Script exceeded the string memory limit");
    }else{
     const format=to_jsstring(input),widths=[...format.matchAll(/%[-+ #0]*(\d*)(?:\.(\d*))?[cdiouxXeEfgGqs%]/g)].flatMap((m:any)=>[m[1],m[2]].filter(Boolean));
     if(lua.lua_gettop(state)>100||widths.some((n:string)=>Number(n)>10000)||widths.reduce((a:number,n:string)=>a+Number(n),0)>MAX_STRING)return fail(state,"Format exceeds the memory limit");
     let total=0;for(let i=1;i<=lua.lua_gettop(state);i++)if(lua.lua_type(state,i)===lua.LUA_TSTRING)total+=lua.lua_rawlen(state,i);
     if(total>MAX_STRING)return fail(state,"Format exceeds the memory limit");
    }
    return original(state);
   });lua.lua_setfield(L,-2,to_luastring(name));
  }
  lua.lua_pop(L,1);
  lua.lua_pushcfunction(L,(state:any)=>{const values=[];for(let i=1;i<=lua.lua_gettop(state);i++)values.push(stringify(state,i));append(values.join("\t")+"\n");return 0;});
  lua.lua_setglobal(L,to_luastring("print"));
  lua.lua_sethook(L,check,lua.LUA_MASKCOUNT,10);
  const bytes=to_luastring(source);
  let status=lauxlib.luaL_loadbufferx(L,bytes,bytes.length,to_luastring("vertexx-script"),to_luastring("t"));
  if(status===lua.LUA_OK)status=lua.lua_pcall(L,0,lua.LUA_MULTRET,0);
  if(status!==lua.LUA_OK||aborted)return {success:false,error:aborted||lua.lua_tojsstring(L,-1)||"Script failed",output,elapsedMs:Math.round(performance.now()-start),truncated};
  const returns=[];for(let i=1;i<=lua.lua_gettop(L);i++)if(lua.lua_type(L,i)!==lua.LUA_TNIL)returns.push(stringify(L,i));
  if(returns.length)append("Result: "+returns.join("\t")+"\n");
  return {success:true,output,elapsedMs:Math.round(performance.now()-start),truncated};
 } catch(error){return {success:false,error:aborted||(error instanceof Error?error.message:"Execution failed"),output,elapsedMs:Math.round(performance.now()-start),truncated};}
 finally{lua.lua_close(L);}
}
