// AVESSO Story video compatibility layer
// Recupera vídeos de Story que ficam presos em metadata/stalled em alguns navegadores.

const tracked=new WeakSet();
const objectUrls=new WeakMap();

function inferredVideoType(url=''){
  const clean=String(url).split('?')[0].toLowerCase();
  if(clean.endsWith('.mp4'))return'video/mp4';
  if(clean.endsWith('.mov'))return'video/quicktime';
  return'video/webm';
}

async function recoverVideo(video){
  if(!video||video.dataset.avessoMediaRecovering==='1')return;
  const original=video.currentSrc||video.src;
  if(!original||original.startsWith('blob:'))return;
  video.dataset.avessoMediaRecovering='1';
  try{
    const response=await fetch(original,{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const bytes=await response.arrayBuffer();
    if(!bytes.byteLength)throw new Error('empty video');
    const declared=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    const type=declared.startsWith('video/')?declared:inferredVideoType(original);
    const blob=new Blob([bytes],{type});
    const url=URL.createObjectURL(blob);
    const old=objectUrls.get(video);
    if(old)URL.revokeObjectURL(old);
    objectUrls.set(video,url);
    const time=Number.isFinite(video.currentTime)?video.currentTime:0;
    video.src=url;
    video.load();
    video.addEventListener('loadedmetadata',()=>{
      if(time>0&&Number.isFinite(video.duration))video.currentTime=Math.min(time,Math.max(0,video.duration-.05));
    },{once:true});
    video.dataset.avessoMediaRecovered='1';
  }catch(error){
    video.dataset.avessoMediaRecoveryFailed='1';
    console.warn('AVESSO: recuperação do vídeo do Story falhou',error);
  }finally{
    delete video.dataset.avessoMediaRecovering;
  }
}

function enhanceVideo(video){
  if(!video||tracked.has(video))return;
  tracked.add(video);
  // Alguns builds do Firefox não refletem apenas o atributo HTML em
  // HTMLVideoElement.playsInline. Mantemos atributo + propriedade para que
  // o comportamento seja determinístico em desktop e mobile.
  video.playsInline=true;
  video.setAttribute('playsinline','');
  video.controls=true;
  video.setAttribute('controls','');
  video.preload='auto';
  video.controlsList?.remove?.('nodownload');

  let watchdog=0;
  const arm=()=>{
    clearTimeout(watchdog);
    watchdog=window.setTimeout(()=>{
      if(video.isConnected&&video.readyState<2)recoverVideo(video);
    },2600);
  };
  video.addEventListener('loadstart',arm);
  video.addEventListener('stalled',()=>recoverVideo(video));
  video.addEventListener('error',()=>recoverVideo(video));
  video.addEventListener('canplay',()=>clearTimeout(watchdog));
  video.addEventListener('playing',()=>clearTimeout(watchdog));
  arm();
}

function scan(root=document){
  root.querySelectorAll?.('.story-video').forEach(enhanceVideo);
}

const observer=new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(!(node instanceof Element))continue;
      if(node.matches?.('.story-video'))enhanceVideo(node);
      scan(node);
    }
    for(const node of record.removedNodes){
      if(!(node instanceof Element))continue;
      const videos=node.matches?.('.story-video')?[node]:[...node.querySelectorAll?.('.story-video')||[]];
      for(const video of videos){
        const url=objectUrls.get(video);
        if(url){URL.revokeObjectURL(url);objectUrls.delete(video);}
      }
    }
  }
});

observer.observe(document.documentElement,{childList:true,subtree:true});
scan();
globalThis.__avessoStoryPlaybackCompat=true;
