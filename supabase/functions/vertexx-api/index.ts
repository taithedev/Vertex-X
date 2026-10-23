
// Vertex X API. Account checks happen for every request. Secrets stay in Edge runtime.
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Enable only after runner integration and adversarial tests pass; old releases are unaffected.
const executionEnabled = true;
const cors = { "Access-Control-Allow-Origin": "https://vertexx.local", "Access-Control-Allow-Headers": "authorization,apikey,content-type", "Access-Control-Allow-Methods": "POST,OPTIONS" };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
function text(value: unknown, max: number, label: string, required = true) {
 if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error("Invalid " + label);
 return value.trim();
}
function uuid(value: unknown) { const id = text(value,36,"ID"); if (!/^[a-f0-9-]{36}$/i.test(id)) throw new Error("Invalid ID"); return id; }
async function rest(path: string, method = "GET", body?: unknown, token = secret, prefer = "return=representation") {
 const result = await fetch(url + "/rest/v1/" + path, { method, headers: { apikey: secret, Authorization: "Bearer " + token, "Content-Type": "application/json", Prefer: prefer }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
 const raw = await result.text(); let data: any = null;
 try { data = raw ? JSON.parse(raw) : null; } catch { throw new Error("Backend returned an invalid response"); }
 if (!result.ok) throw new Error(data?.message || "Backend request failed");
 return data;
}
const rpc = (name: string, body: unknown) => rest("rpc/" + name,"POST",body);
async function remoteJson(address: string, init: RequestInit = {}) {
 const r = await fetch(address, { ...init, signal: AbortSignal.timeout(10000), redirect: "error" });
 if (!r.ok) throw new Error("Roblox is temporarily unavailable (" + r.status + ")");
 return await r.json();
}
function avatar(value: unknown): string | null {
 if (value === null || value === "") return null;
 const data = text(value,140000,"avatar");
 const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data);
 if (!match) throw new Error("Choose a PNG, JPEG or WebP avatar");
 const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
 const valid = match[1] === "png" ? bytes[0]===137 && bytes[1]===80 && bytes[2]===78 && bytes[3]===71 :
 match[1] === "jpeg" ? bytes[0]===255 && bytes[1]===216 && bytes[2]===255 :
 String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP";
 if (!valid || bytes.length>100000) throw new Error("Invalid avatar or avatar too large");
 return data;
}
async function robloxAvatar(id: number) {
 try {
  const meta = await remoteJson("https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds="+id+"&size=150x150&format=Png&isCircular=false");
  const item = meta.data?.[0]; if(item?.state!=="Completed" || item.targetId!==id) return null;
  const address = new URL(item.imageUrl);
  if(address.protocol!=="https:" || address.port || address.username || address.password || !address.hostname.endsWith(".rbxcdn.com")) return null;
  const r=await fetch(address,{redirect:"error",signal:AbortSignal.timeout(8000)});
  if(!r.ok || r.headers.get("content-type")?.split(";")[0]!=="image/png") return null;
  const reader=r.body?.getReader(); if(!reader)return null;
  let bytes=new Uint8Array(0);
  while(true){const part=await reader.read();if(part.done)break;if(bytes.length+part.value.length>100000){await reader.cancel();return null;}const combined=new Uint8Array(bytes.length+part.value.length);combined.set(bytes);combined.set(part.value,bytes.length);bytes=combined;}
  let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);
  return avatar("data:image/png;base64,"+btoa(binary));
 } catch { return null; }
}
Deno.serve(async req => {
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method==="GET")return response({service:"vertexx-api",executionEnabled,version:"0.8.0"});
 if(req.method!=="POST")return response({error:"Method not allowed"},405);
 try {
  const bearer=req.headers.get("Authorization");
  if(!bearer?.startsWith("Bearer "))return response({error:"Sign in first"},401);
  const token=bearer.slice(7);
  const check=await fetch(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:bearer},signal:AbortSignal.timeout(10000)});
  if(!check.ok)return response({error:"Your session expired. Sign in again."},401);
  const user=await check.json(); const actor=uuid(user.id);
  if(!user.email_confirmed_at)return response({error:"Verify your email before using community features"},403);
  const raw=await req.text(); if(new TextEncoder().encode(raw).length>300000)return response({error:"Request too large"},413);
  const input=JSON.parse(raw); const action=text(input.action,40,"action"); const data=input.data||{};
  let username=user.user_metadata?.vertexx_username;
  if(typeof username!=="string" || !/^[A-Za-z0-9_]{3,20}$/.test(username))username="user_"+actor.replaceAll("-","").slice(0,12);
  await rpc("vertexx_bootstrap",{p_user:actor,p_username:username});
  const roles=await rest("vertexx_member_roles?user_id=eq."+actor+"&select=role,verified");
  const owner=roles[0]?.role==="owner";
  const requireOwner=()=>{if(!owner)throw new Error("Owner access required");};
  if(action==="snapshot"){
   const [members,wallet,settings,links,scripts,ledger,runs]=await Promise.all([
    rest("vertexx_members?user_id=eq."+actor),rest("vertexx_wallets?user_id=eq."+actor),
    rest("vertexx_cloud_preferences?user_id=eq."+actor),rest("vertexx_roblox_links?user_id=eq."+actor),
    rest("vertexx_scripts?select=id,author_id,title,description,visibility,updated_at&order=updated_at.desc&limit=100","GET",undefined,token),
    rest("vertexx_crystal_ledger?user_id=eq."+actor+"&order=created_at.desc&limit=20"),
    rest("vertexx_runs?user_id=eq."+actor+"&select=id,status,cost,created_at,finished_at,result&order=created_at.desc&limit=10")
   ]);
   const ids=[...new Set(scripts.map((s:any)=>s.author_id))];
   const authors=ids.length?await rest("vertexx_members?user_id=in.("+ids.join(",")+")&select=user_id,username,display_name,avatar_data_url"):[];
   const authorRoles=ids.length?await rest("vertexx_member_roles?user_id=in.("+ids.join(",")+")"):[];
   return response({member:members[0],role:roles[0],wallet:wallet[0],settings:settings[0]?.settings||{},roblox:links[0]||null,scripts,authors,authorRoles,ledger,runs,executionEnabled,runCost:owner?0:1});
  }
  if(action==="profile.save"){
   const update={display_name:text(data.displayName,48,"display name"),bio:text(data.bio,500,"bio",false),avatar_data_url:avatar(data.avatar),updated_at:new Date().toISOString()};
   return response(await rest("vertexx_members?user_id=eq."+actor,"PATCH",update));
  }
  if(action==="settings.save"){
   const settings={realtime:data.realtime!==false,confirmRun:data.confirmRun===true,compactLibrary:data.compactLibrary===true,preferRobloxAvatar:data.preferRobloxAvatar===true,defaultVisibility:data.defaultVisibility==="private"?"private":"public"};
   return response(await rest("vertexx_cloud_preferences?user_id=eq."+actor,"PATCH",{settings},token));
  }
  if(action==="scripts.upload"){
   const count=await rest("vertexx_scripts?author_id=eq."+actor+"&select=id&limit=1001");
   if(count.length>=(owner?1000:100))throw new Error("Your script upload limit is reached");
   const source=text(data.source,100000,"script");
   if(new TextEncoder().encode(source).length>100000)throw new Error("Script must be under 100 KB");
   return response(await rest("vertexx_scripts","POST",{author_id:actor,title:text(data.title,80,"title"),description:text(data.description,1000,"description",false),source,visibility:data.visibility==="private"?"private":"public"},token));
  }
  if(action==="scripts.open"){
   const rows=await rest("vertexx_scripts?id=eq."+uuid(data.id)+"&select=*","GET",undefined,token);
   if(!rows.length)throw new Error("Script is private, removed, or unavailable");
   return response(rows[0]);
  }
  if(action==="scripts.delete")return response(await rest("vertexx_scripts?id=eq."+uuid(data.id)+"&author_id=eq."+actor,"DELETE",undefined,token));
  if(action==="wallet.daily")return response({balance:await rpc("vertexx_daily_crystals",{p_user:actor})});
  if(action==="owner.members"){requireOwner();return response(await rest("vertexx_members?select=user_id,username,display_name&order=username&limit=100"));}
  if(action==="owner.verify"){requireOwner();return response(await rest("vertexx_member_roles?user_id=eq."+uuid(data.userId),"PATCH",{verified:data.verified===true}));}
  if(action==="owner.grant"){requireOwner();return response(await rpc("vertexx_owner_grant",{p_actor:actor,p_user:uuid(data.userId),p_amount:Number(data.amount)}));}
  if(action==="owner.moderate"){requireOwner();return response(await rest("vertexx_script_moderation?on_conflict=script_id","POST",{script_id:uuid(data.id),hidden:data.hidden===true,updated_by:actor,updated_at:new Date().toISOString()},secret,"resolution=merge-duplicates,return=representation"));}
  if(action==="roblox.begin"){
   const name=text(data.username,20,"Roblox username");if(!/^[A-Za-z0-9_]{3,20}$/.test(name))throw new Error("Invalid Roblox username");
   const previous=await rest("vertexx_roblox_challenges?user_id=eq."+actor);
   if(previous[0] && Date.parse(previous[0].expires_at)>Date.now()+570000)throw new Error("Wait 30 seconds before creating another link code");
   const result=await remoteJson("https://users.roblox.com/v1/usernames/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usernames:[name],excludeBannedUsers:true})});
   const found=result.data?.[0];if(!found?.id)throw new Error("Roblox username not found");
   const challenge={user_id:actor,roblox_id:found.id,username:found.name,code:"VertexX:"+crypto.randomUUID(),expires_at:new Date(Date.now()+600000).toISOString()};
   await rest("vertexx_roblox_challenges?on_conflict=user_id","POST",challenge,secret,"resolution=merge-duplicates,return=minimal");
   return response({username:challenge.username,code:challenge.code,expiresAt:challenge.expires_at});
  }
  if(action==="roblox.verify"){
   const rows=await rest("vertexx_roblox_challenges?user_id=eq."+actor);const challenge=rows[0];
   if(!challenge || Date.parse(challenge.expires_at)<Date.now())throw new Error("Create a new Roblox link code");
   const profile=await remoteJson("https://users.roblox.com/v1/users/"+challenge.roblox_id);
   if(!profile.description?.includes(challenge.code))throw new Error("The link code is not in this Roblox profile bio yet");
   const link={user_id:actor,roblox_id:challenge.roblox_id,username:profile.name,display_name:profile.displayName,avatar_data_url:await robloxAvatar(challenge.roblox_id),linked_at:new Date().toISOString(),method:"profile_bio_proof"};
   await rest("vertexx_roblox_links?on_conflict=user_id","POST",link,secret,"resolution=merge-duplicates,return=minimal");
   await rest("vertexx_roblox_challenges?user_id=eq."+actor,"DELETE");
   return response(link);
  }
  if(action==="roblox.unlink")return response(await rest("vertexx_roblox_links?user_id=eq."+actor,"DELETE"));
  if(action==="run.cancel")return response(await rpc("vertexx_cancel_run",{p_user:actor,p_id:uuid(data.runId)}));
  if(action==="run.execute"){
   if(!executionEnabled)return response({error:"Cloud execution is awaiting runner validation. No crystals were charged."},503);
   const source=text(data.source,100000,"script"), id=uuid(data.runId);
   const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(source)))).map(n=>n.toString(16).padStart(2,"0")).join("");
   const started=await rpc("vertexx_begin_run",{p_user:actor,p_id:id,p_hash:hash});
   if(started.status!=="pending")return response(started.result);
   const {runLua}=await import("./runner.ts");
   const result=runLua(source);
   try{
    const settled=await rpc("vertexx_finish_run",{p_user:actor,p_id:id,p_success:result.success,p_result:result});
    return response(settled.result);
   }catch{return response({error:"Run settlement outcome is unknown. Check recent runs before retrying."},503);}
  }
  return response({error:"Unknown command"},400);
 } catch(error) { return response({error:error instanceof Error?error.message:"Request failed"},400); }
});
