const api=globalThis.browser||globalThis.chrome;
const version=api.runtime?.getManifest?.().version||"";

function post(type,payload={}){
  window.postMessage({type,...payload},location.origin);
}
function poll(){
  try{api.runtime.sendMessage({type:"AVESSO_BRIDGE_POLL"});}catch{}
}

api.runtime.onMessage.addListener(message=>{
  if(message?.type==="AVESSO_NOW_PLAYING"){
    post("AVESSO_NOW_PLAYING",{payload:message.payload||null});
    return;
  }
  if(message?.type==="AVESSO_CONTEXT_EVENT"){
    post("AVESSO_CONTEXT_EVENT",{event:message.event||"browser_tab_changed",context:message.context||null});
  }
});

post("AVESSO_PRESENCE_HELLO",{version});
try{api.runtime.sendMessage({type:"AVESSO_BRIDGE_READY"});}catch{}
setInterval(poll,1500);

window.addEventListener("message",event=>{
  if(event.source!==window||event.origin!==location.origin)return;
  if(event.data?.type==="AVESSO_PRESENCE_REQUEST"){
    post("AVESSO_PRESENCE_HELLO",{version});
    poll();
    return;
  }
  if(event.data?.type==="AVESSO_PRESENCE_CONFIG"){
    try{api.runtime.sendMessage({type:"AVESSO_CONTEXT_CONFIG",enabled:Boolean(event.data.shareContext)});}catch{}
  }
});
