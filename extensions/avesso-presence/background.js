const api=globalThis.browser||globalThis.chrome;
const states=new Map();
const contextTabs=new Map();
let lastNowPlayingSignature="";
let lastNowPlayingBroadcastAt=0;

function validPayload(payload){
  if(!payload||!payload.title)return null;
  return {
    title:String(payload.title).trim().slice(0,180),
    artist:String(payload.artist||"").trim().slice(0,180),
    source:String(payload.source||"").trim().slice(0,80),
    url:String(payload.url||"").trim().slice(0,1000),
    playing:Boolean(payload.playing),
    updatedAt:Date.now()
  };
}

function safeContext(tab){
  try{
    const url=new URL(tab?.url||"");
    if(!["http:","https:"].includes(url.protocol))return null;
    const host=url.hostname.replace(/^www\./,"").toLowerCase();
    if(!host||host==="humbertomennella.github.io")return null;
    return {
      host:host.slice(0,120),
      title:String(tab?.title||host).trim().slice(0,180),
      audible:Boolean(tab?.audible),
      observedAt:Date.now()
    };
  }catch{
    return null;
  }
}

async function avessoTabs(){
  try{return await api.tabs.query({url:"https://humbertomennella.github.io/avesso/*"});}
  catch{return [];}
}

async function sendToAvesso(message,{contextOnly=false}={}){
  const tabs=await avessoTabs();
  for(const tab of tabs){
    if(contextOnly&&!contextTabs.get(tab.id))continue;
    try{await api.tabs.sendMessage(tab.id,message);}catch{}
  }
}

async function broadcastNowPlaying(force=false){
  const now=Date.now();
  for(const [tabId,payload] of states){
    if(!payload?.playing||now-payload.updatedAt>12000)states.delete(tabId);
  }

  let chosen=null;
  try{
    const tabs=await api.tabs.query({});
    const byId=new Map(tabs.map(tab=>[tab.id,tab]));
    const candidates=[...states.entries()]
      .map(([tabId,payload])=>({tabId,...payload,tab:byId.get(tabId)}))
      .filter(item=>item.tab&&item.playing&&now-item.updatedAt<=12000);

    candidates.sort((a,b)=>{
      const audible=Number(Boolean(b.tab?.audible))-Number(Boolean(a.tab?.audible));
      if(audible)return audible;
      const active=Number(Boolean(b.tab?.active))-Number(Boolean(a.tab?.active));
      if(active)return active;
      return b.updatedAt-a.updatedAt;
    });
    chosen=candidates[0]||null;
  }catch{}

  const payload=chosen?{
    title:chosen.title,
    artist:chosen.artist,
    source:chosen.source,
    url:chosen.url,
    observedAt:now
  }:null;
  const signature=JSON.stringify(payload?{
    title:payload.title,artist:payload.artist,source:payload.source,url:payload.url
  }:null);

  if(!force&&signature===lastNowPlayingSignature&&now-lastNowPlayingBroadcastAt<8000)return;
  lastNowPlayingSignature=signature;
  lastNowPlayingBroadcastAt=now;
  await sendToAvesso({type:"AVESSO_NOW_PLAYING",payload});
}

async function broadcastContext(tabId){
  if(![...contextTabs.values()].some(Boolean))return;
  let tab;
  try{tab=await api.tabs.get(tabId);}catch{return;}
  const context=safeContext(tab);
  if(!context)return;
  await sendToAvesso({type:"AVESSO_CONTEXT_EVENT",event:"browser_tab_changed",context},{contextOnly:true});
}

api.runtime.onMessage.addListener((message,sender)=>{
  if(message?.type==="AVESSO_SOURCE_STATE"&&sender.tab?.id!=null){
    const payload=validPayload(message.payload);
    if(payload)states.set(sender.tab.id,payload);
    else states.delete(sender.tab.id);
    broadcastNowPlaying();
    return;
  }
  if(message?.type==="AVESSO_BRIDGE_READY"){
    broadcastNowPlaying(true);
    return;
  }
  if(message?.type==="AVESSO_CONTEXT_CONFIG"&&sender.tab?.id!=null){
    contextTabs.set(sender.tab.id,Boolean(message.enabled));
  }
});

api.tabs.onActivated.addListener(({tabId})=>{
  broadcastNowPlaying(true);
  broadcastContext(tabId);
});

api.tabs.onRemoved.addListener(tabId=>{
  states.delete(tabId);
  contextTabs.delete(tabId);
  broadcastNowPlaying(true);
});

api.tabs.onUpdated.addListener((tabId,changeInfo)=>{
  if(changeInfo.url)states.delete(tabId);
  if("audible" in changeInfo||"url" in changeInfo||changeInfo.status==="complete")broadcastNowPlaying(true);
});

setInterval(()=>broadcastNowPlaying(),2500);
