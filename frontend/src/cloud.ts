import { useCallback, useEffect, useRef, useState } from 'react';
import { native, type Account } from './bridge';
export type Member = { user_id: string; username: string; display_name: string; bio?: string; avatar_data_url?: string | null };
export type CloudScript = { id: string; author_id: string; title: string; description: string; visibility: string; updated_at: string };
export type CloudSettings = { realtime: boolean; confirmRun: boolean; compactLibrary: boolean; preferRobloxAvatar: boolean; defaultVisibility: 'public' | 'private' };
export const defaultCloudSettings: CloudSettings = { realtime: true, confirmRun: false, compactLibrary: false, preferRobloxAvatar: false, defaultVisibility: 'public' };
export type CloudSnapshot = {
 member: Member; role: { role: string; verified: boolean }; wallet: { balance: number; daily_claimed_on?: string };
 settings: Partial<CloudSettings>; scripts: CloudScript[]; authors: Member[]; authorRoles: { user_id: string; role: string; verified: boolean }[];
 roblox: null | { roblox_id: number; username: string; display_name: string; avatar_data_url?: string; method: string };
 ledger: { id: number; amount: number; reason: string; created_at: string }[];
 runs: { id: string; status: string; cost: number; created_at: string; result?: { error?: string; charged?: number } }[];
 executionEnabled: boolean; runCost: number;
};
export const cloudRequest = <T = unknown>(action: string, data: unknown = {}) => native<T>('cloud.request', { action, data });
type Session = { url: string; publishableKey: string; accessToken: string; userId: string; expiresAt: string };
export function useCloud(account: Account) {
 const [snapshot,setSnapshot] = useState<CloudSnapshot | null>(null);
 const [status,setStatus] = useState('Sign in to connect');
 const [error,setError] = useState('');
 const loader = useRef<() => Promise<void>>(async()=>{});
 const refresh = useCallback(() => loader.current(),[]);
 useEffect(()=>{
  let alive=true, loading=false,again=false;
  loader.current=async()=>{
   if(!account.signedIn)return;
   if(loading){again=true;return;}loading=true;
   try{const next=await cloudRequest<CloudSnapshot>('snapshot');if(alive){setSnapshot(next);setError('');}}
   catch(e){if(alive)setError(e instanceof Error?e.message:'Cloud service unavailable');}
   finally{loading=false;if(again&&alive){again=false;void loader.current();}}
  };
  setSnapshot(null);setError('');
  if(account.signedIn)void loader.current();else setStatus('Sign in to connect');
  return ()=>{alive=false;loader.current=async()=>{};};
 },[account.signedIn,account.userId]);
 const realtimeEnabled=snapshot?.settings.realtime!==false;
 useEffect(()=>{
  if(!account.signedIn)return;
  let alive=true,socket:WebSocket|null=null,session:Session|null=null,retry=0,attempt=0,heartbeat=0,refreshTimer=0,debounce=0,watchdog=0,ref=0,lastHeartbeat=Date.now();
  const send=(topic:string,event:string,payload:unknown,join_ref?:string)=>socket?.readyState===WebSocket.OPEN&&socket.send(JSON.stringify({topic,event,payload,ref:String(++ref),join_ref}));
  async function connect(){
   try{
    setStatus(realtimeEnabled?'Connecting…':'Live updates paused');
    session=await native<Session>('cloud.session');if(!alive||!realtimeEnabled)return;
    socket=new WebSocket(session.url.replace('https:','wss:')+'/realtime/v1/websocket?apikey='+encodeURIComponent(session.publishableKey)+'&vsn=1.0.0');
    const topic='realtime:vertexx:'+session.userId,join='1';
    socket.onopen=()=>{
     ref=0; lastHeartbeat=Date.now();
     send(topic,'phx_join',{access_token:session!.accessToken,config:{broadcast:{self:false,ack:false},presence:{enabled:false},postgres_changes:[
      {event:'*',schema:'public',table:'vertexx_scripts'},
      {event:'*',schema:'public',table:'vertexx_script_moderation'},
      {event:'*',schema:'public',table:'vertexx_members'},
      {event:'*',schema:'public',table:'vertexx_member_roles'},
      {event:'*',schema:'public',table:'vertexx_wallets',filter:'user_id=eq.'+session!.userId},
      {event:'*',schema:'public',table:'vertexx_roblox_links',filter:'user_id=eq.'+session!.userId},
      {event:'*',schema:'public',table:'vertexx_cloud_preferences',filter:'user_id=eq.'+session!.userId}
     ]}},join);
     heartbeat=window.setInterval(()=>send('phoenix','heartbeat',{}),20000);
     watchdog=window.setInterval(()=>{if(Date.now()-lastHeartbeat>45000)socket?.close();},15000);
    };
    socket.onmessage=event=>{
     if(!alive)return;
     try{const msg=JSON.parse(event.data);
      if(msg.event==='phx_reply'){lastHeartbeat=Date.now();if(msg.topic===topic){if(msg.payload?.status==='ok'){setStatus('Subscribing…');void refresh();}else socket?.close();}}
      if(msg.event==='system'){if(msg.payload?.status==='ok'){attempt=0;setStatus('Live');void refresh();}else if(msg.payload?.status==='error')socket?.close();}
      if(msg.event==='postgres_changes'){clearTimeout(debounce);debounce=window.setTimeout(()=>void refresh(),250);}
     }catch{/* Ignore malformed protocol messages. */}
    };
    socket.onerror=()=>socket?.close();
    socket.onclose=()=>{clearInterval(heartbeat);clearInterval(watchdog);if(alive){setStatus('Reconnecting…');retry=window.setTimeout(()=>void connect(),Math.min(30000,1000*2**Math.min(attempt++,5)));}};
   }catch(e){if(alive){setStatus('Offline · retrying');retry=window.setTimeout(()=>void connect(),15000);}}
  }
  void connect();
  refreshTimer=window.setInterval(async()=>{
   if(!alive||!realtimeEnabled||!session)return;
   void refresh();
   try{const next=await native<Session>('cloud.session');if(!alive)return;if(next.accessToken!==session.accessToken){session=next;send('realtime:vertexx:'+next.userId,'access_token',{access_token:next.accessToken},'1');}}
   catch{setStatus('Session needs sign-in');socket?.close();}
  },30000);
  return()=>{alive=false;clearTimeout(retry);clearTimeout(debounce);clearInterval(heartbeat);clearInterval(watchdog);clearInterval(refreshTimer);if(socket){socket.onclose=null;socket.close();}};
 },[account.signedIn,account.userId,realtimeEnabled,refresh]);
 return {snapshot,status,error,refresh};
}
