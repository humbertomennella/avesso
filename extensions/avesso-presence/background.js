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

function cleanBrowserTitle(value=""){
  return String(value||"")
    .replace(/\s*[-|]\s*(YouTube|YouTube Music|Spotify|SoundCloud|Deezer|TIDAL|Apple Music)\s*$/i,"")
    .replace(/\s*\|\s*Spotify\s*$/i,"")
    .trim();
}

function supportedSource(host=""){
  const h=host.replace(/^www\./,"").toLowerCase();
  if(h.endsWith("youtube.com")||h==="youtu.be")return h.includes("music.youtube")?"YouTube Music":"YouTube";
  if(h==="open.spotify.com")return"Spotify";
  if(h==="soundcloud.com")return"SoundCloud";
  if(h.endsWith("deezer.com"))return"Deezer";
  if(h==="listen.tidal.com")return"TIDAL";
  if(h==="music.apple.com")return"Apple Music";
  return"";
}

function tabFallbackPayload(tab){
  try{
    if(!tab?.audible)return null;
    const url=new URL(tab.url||"");
    const source=supportedSource(url.hostname);
    if(!source)return null;
    let raw=cleanBrowserTitle(tab.title||"");
    if(!raw||/^(youtube|youtube music|spotify|soundcloud|deezer|tidal|apple music)$/i.test(raw))return null;

    let title=raw,artist="";
    if(source==="Spotify"&&raw.includes(" • ")){
      const parts=raw.split(" • ").map(x=>x.trim()).filter(Boolean);
      title=parts[0]||raw;
      artist=parts[1]||"";
    }else if(source==="YouTube Music"&&raw.includes(" • ")){
      const parts=raw.split(" • ").map(x=>x.trim()).filter(Boolean);
      title=parts[0]||raw;
      artist=parts[1]||"";
    }else if(source==="YouTube"){
      const dash=raw.indexOf(" - ");
      if(dash>1&&dash<80){
        artist=raw.slice(0,dash).trim();
        title=raw.slice(dash+3).trim();
      }
    }
    return {
      title:title.slice(0,180),
      artist:artist.slice(0,180),
      source,
      url:String(tab.url||"").slice(0,1000),
      playing:true,
      updatedAt:Date.now(),
      fromTab:true
    };
  }catch{
    return null;
  }
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

async function currentNowPlaying(){
  const now=Date.now();
  for(const [tabId,payload] of states){
    if(!payload?.playing||now-payload.updatedAt>10000)states.delete(tabId);
  }

  try{
    const tabs=await api.tabs.query({});
    const candidates=[];
    for(const tab of tabs){
      const live=states.get(tab.id);
      const fallback=tabFallbackPayload(tab);

      if(fallback){
        // O título da aba é a melhor defesa contra SPAs que mantêm um nó antigo no player.
        // Para YouTube/YouTube Music ele vence quando há áudio real.
        if(fallback.source==="YouTube"||fallback.source==="YouTube Music"){
          candidates.push({...fallback,tab});
          continue;
        }
        if(live?.playing){
          candidates.push({...live,tab});
          continue;
        }
        candidates.push({...fallback,tab});
        continue;
      }

      if(live?.playing&&now-live.updatedAt<=10000){
        candidates.push({...live,tab});
      }
    }

    candidates.sort((a,b)=>{
      const audible=Number(Boolean(b.tab?.audible))-Number(Boolean(a.tab?.audible));
      if(audible)return audible;
      const active=Number(Boolean(b.tab?.active))-Number(Boolean(a.tab?.active));
      if(active)return active;
      return Number(b.updatedAt||0)-Number(a.updatedAt||0);
    });
    const chosen=candidates[0]||null;
    return chosen?{
      title:chosen.title,
      artist:chosen.artist||"",
      source:chosen.source||"",
      url:chosen.url||chosen.tab?.url||"",
      observedAt:now
    }:null;
  }catch{
    const chosen=[...states.values()].filter(x=>x.playing&&now-x.updatedAt<=10000).sort((a,b)=>b.updatedAt-a.updatedAt)[0];
    return chosen?{title:chosen.title,artist:chosen.artist,source:chosen.source,url:chosen.url,observedAt:now}:null;
  }
}

async function broadcastNowPlaying(force=false){
  const payload=await currentNowPlaying();
  const signature=JSON.stringify(payload?{
    title:payload.title,artist:payload.artist,source:payload.source,url:payload.url
  }:null);
  const now=Date.now();
  if(!force&&signature===lastNowPlayingSignature&&now-lastNowPlayingBroadcastAt<3500)return;
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
  if(message?.type==="AVESSO_BRIDGE_READY"||message?.type==="AVESSO_BRIDGE_POLL"){
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
  if("title" in changeInfo||"audible" in changeInfo||"url" in changeInfo||changeInfo.status==="complete"){
    broadcastNowPlaying(true);
  }
});

setInterval(()=>broadcastNowPlaying(),1800);
