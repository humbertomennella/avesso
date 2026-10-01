const api=globalThis.browser||globalThis.chrome;

function post(type,payload={}){
  window.postMessage({type,...payload},location.origin);
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

try{api.runtime.sendMessage({type:"AVESSO_BRIDGE_READY"});}catch{}

window.addEventListener("message",event=>{
  if(event.source!==window||event.origin!==location.origin)return;
  if(event.data?.type==="AVESSO_PRESENCE_REQUEST"){
    try{api.runtime.sendMessage({type:"AVESSO_BRIDGE_READY"});}catch{}
    return;
  }
  if(event.data?.type==="AVESSO_PRESENCE_CONFIG"){
    try{api.runtime.sendMessage({type:"AVESSO_CONTEXT_CONFIG",enabled:Boolean(event.data.shareContext)});}catch{}
  }
});
