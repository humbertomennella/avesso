import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

// AVESSO // economia shadow
// Este módulo não altera UI, não exibe saldo e não decide recompensa.
// Ele apenas sinaliza presença recente; o banco mede o tempo e aplica as regras.

const HEARTBEAT_MS=60_000;
const LOCAL_ACTIVE_WINDOW_MS=120_000;
const economySupabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{
    persistSession:true,
    autoRefreshToken:false,
    detectSessionInUrl:false
  }
});

let lastLocalActivityAt=Date.now();
let heartbeatBusy=false;
let heartbeatErrorLogged=false;

function markEconomyActivity(){
  if(document.hidden)return;
  lastLocalActivityAt=Date.now();
}

function locallyQualified(){
  return !document.hidden
    && navigator.onLine
    && Date.now()-lastLocalActivityAt<=LOCAL_ACTIVE_WINDOW_MS;
}

async function sendShadowHeartbeat(){
  if(heartbeatBusy||!locallyQualified())return;
  heartbeatBusy=true;
  try{
    const {data:{session},error:sessionError}=await economySupabase.auth.getSession();
    if(sessionError||!session?.user?.id)return;

    const {error}=await economySupabase.rpc('avesso_economy_heartbeat');
    if(error&&!heartbeatErrorLogged){
      heartbeatErrorLogged=true;
      console.debug('AVESSO economy shadow heartbeat indisponível',error.message||error);
    }
  }catch(error){
    if(!heartbeatErrorLogged){
      heartbeatErrorLogged=true;
      console.debug('AVESSO economy shadow heartbeat falhou',error?.message||error);
    }
  }finally{
    heartbeatBusy=false;
  }
}

['pointerdown','keydown','touchstart','wheel','scroll','input'].forEach(type=>{
  document.addEventListener(type,markEconomyActivity,{passive:true,capture:true});
});
window.addEventListener('focus',markEconomyActivity,{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden){
    markEconomyActivity();
    sendShadowHeartbeat();
  }
});
window.addEventListener('online',()=>{
  markEconomyActivity();
  sendShadowHeartbeat();
});

// A primeira chamada cria/retoma a sessão no servidor. Recompensa só aparece
// após tempo realmente medido em chamadas posteriores.
setTimeout(sendShadowHeartbeat,8_000);
setInterval(sendShadowHeartbeat,HEARTBEAT_MS);
