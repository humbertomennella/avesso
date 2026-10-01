const api=globalThis.browser||globalThis.chrome;
const states=new Map();

function validPayload(payload){
  if(!payload||!payload.title)return null;
  return {
    title:String(payload.title).slice(0,180),
    artist:String(payload.artist||'').slice(0,180),
    source:String(payload.source||'').slice(0,80),
    url:String(payload.url||'').slice(0,1000),
    playing:Boolean(payload.playing),
    updatedAt:Date.now()
  };
}

async function broadcast(){
  let candidates=[...states.entries()].map(([tabId,p])=>({tabId,...p})).filter(x=>x.playing&&Date.now()-x.updatedAt<15000);
  if(candidates.length){
    try{
      const tabs=await api.tabs.query({});
      const map=new Map(tabs.map(t=>[t.id,t]));
      candidates=candidates.filter(x=>map.has(x.tabId));
      candidates.sort((a,b)=>{
        const ta=map.get(a.tabId),tb=map.get(b.tabId);
        if(Boolean(tb?.active)!==Boolean(ta?.active))return Number(Boolean(tb?.active))-Number(Boolean(ta?.active));
        if(Boolean(tb?.audible)!==Boolean(ta?.audible))return Number(Boolean(tb?.audible))-Number(Boolean(ta?.audible));
        return b.updatedAt-a.updatedAt;
      });
    }catch{}
  }
  const chosen=candidates[0]||null;
  const payload=chosen?{title:chosen.title,artist:chosen.artist,source:chosen.source,url:chosen.url}:null;
  let avesso=[];
  try{avesso=await api.tabs.query({url:"https://humbertomennella.github.io/avesso/*"});}catch{}
  for(const tab of avesso){
    try{await api.tabs.sendMessage(tab.id,{type:"AVESSO_NOW_PLAYING",payload});}catch{}
  }
}

api.runtime.onMessage.addListener((message,sender)=>{
  if(message?.type==="AVESSO_SOURCE_STATE"&&sender.tab?.id!=null){
    const payload=validPayload(message.payload);
    if(payload)states.set(sender.tab.id,payload);
    else states.delete(sender.tab.id);
    broadcast();
  }
  if(message?.type==="AVESSO_BRIDGE_READY")broadcast();
});

api.tabs.onRemoved.addListener(tabId=>{states.delete(tabId);broadcast();});
api.tabs.onUpdated.addListener((tabId,changeInfo)=>{
  if(changeInfo.url){states.delete(tabId);broadcast();}
});
