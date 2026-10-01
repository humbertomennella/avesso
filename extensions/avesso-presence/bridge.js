const api=globalThis.browser||globalThis.chrome;
function post(payload){
  window.postMessage({type:"AVESSO_NOW_PLAYING",payload},location.origin);
}
api.runtime.onMessage.addListener(message=>{
  if(message?.type==="AVESSO_NOW_PLAYING")post(message.payload||null);
});
try{api.runtime.sendMessage({type:"AVESSO_BRIDGE_READY"});}catch{}
