// AVESSO Economia v1.1 // heartbeat shadow
// Este módulo NÃO recebe, calcula nem altera saldo. Ele apenas sinaliza atividade
// recente para o RPC autenticado; toda medição e recompensa ficam no servidor.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const ACTIVE_WINDOW_MS=120000;
const HEARTBEAT_MS=60000;
const PROJECT_REF=new URL(SUPABASE_URL).hostname.split('.')[0];
const AUTH_STORAGE_KEY=`sb-${PROJECT_REF}-auth-token`;
let lastActiveAt=0;
let timer=null;
let inFlight=false;

function markActive(){
  if(document.visibilityState==='visible')lastActiveAt=Date.now();
}

function currentAccessToken(){
  try{
    const raw=localStorage.getItem(AUTH_STORAGE_KEY);
    if(!raw)return'';
    const parsed=JSON.parse(raw);
    return String(parsed?.access_token||parsed?.currentSession?.access_token||parsed?.session?.access_token||'');
  }catch{return'';}
}

async function sendEconomyHeartbeat(){
  if(inFlight||!navigator.onLine||document.visibilityState!=='visible')return;
  if(!lastActiveAt||Date.now()-lastActiveAt>ACTIVE_WINDOW_MS)return;
  const token=currentAccessToken();
  if(!token)return;
  inFlight=true;
  try{
    const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/avesso_economy_heartbeat`,{
      method:'POST',
      headers:{
        apikey:SUPABASE_PUBLISHABLE_KEY,
        authorization:`Bearer ${token}`,
        'content-type':'application/json'
      },
      body:'{}',
      keepalive:true
    });
    if(!response.ok&&response.status!==401&&response.status!==403){
      console.debug('AVESSO economia shadow: heartbeat ignorado',response.status);
    }
  }catch(error){
    // Economia shadow nunca deve interferir na experiência principal.
    console.debug('AVESSO economia shadow indisponível',error?.message||error);
  }finally{
    inFlight=false;
  }
}

['pointerdown','keydown','touchstart','wheel'].forEach(type=>
  document.addEventListener(type,markActive,{passive:true,capture:true})
);
window.addEventListener('focus',markActive,{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible')markActive();
});

markActive();
timer=setInterval(sendEconomyHeartbeat,HEARTBEAT_MS);
setTimeout(sendEconomyHeartbeat,15000);
window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);},{once:true});
