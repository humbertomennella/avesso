// AVESSO Story video compatibility layer 2026-10-03
// Mantém vídeos gravados/visualizados previsíveis entre Chromium, Firefox e WebKit.

(() => {
  'use strict';

  const enhanced=new WeakSet();
  const retryCount=new WeakMap();
  const nativeMediaRecorder=globalThis.MediaRecorder;

  // Quando o navegador realmente suporta MP4 via MediaRecorder, prefira-o para
  // novos Stories. WebM continua sendo usado onde MP4 não é suportado.
  if(nativeMediaRecorder?.isTypeSupported && !globalThis.__avessoStoryRecorderCompat){
    try{
      const original=nativeMediaRecorder.isTypeSupported.bind(nativeMediaRecorder);
      const mp4Supported=original('video/mp4');
      if(mp4Supported){
        nativeMediaRecorder.isTypeSupported=(type='')=>{
          const normalized=String(type).toLowerCase();
          if(normalized.startsWith('video/webm'))return false;
          return original(type);
        };
      }
      globalThis.__avessoStoryRecorderCompat=true;
      globalThis.__avessoStoryPrefersMp4=Boolean(mp4Supported);
    }catch{}
  }

  function statusFor(video){
    const stage=video.closest('.story-stage');
    if(!stage)return null;
    let status=stage.querySelector('.avesso-story-video-status');
    if(status)return status;
    status=document.createElement('div');
    status.className='avesso-story-video-status';
    status.setAttribute('role','status');
    status.setAttribute('aria-live','polite');
    stage.appendChild(status);
    return status;
  }

  function setStatus(video,text,{error=false,link=false,timeout=2600}={}){
    const status=statusFor(video);
    if(!status)return;
    status.classList.toggle('error',error);
    status.textContent=text;
    if(link&&video.currentSrc){
      const a=document.createElement('a');
      a.href=video.currentSrc;
      a.target='_blank';
      a.rel='noopener';
      a.textContent='abrir arquivo';
      status.appendChild(a);
    }
    status.classList.add('show');
    if(timeout>0)setTimeout(()=>{if(status&&!status.classList.contains('error'))status.classList.remove('show');},timeout);
  }

  async function attemptPlay(video){
    if(!video.isConnected||video.readyState<2)return;
    try{
      video.muted=false;
      await video.play();
      return;
    }catch(error){
      if(error?.name!=='NotAllowedError'&&error?.name!=='AbortError')return;
    }
    try{
      video.muted=true;
      await video.play();
      setStatus(video,'vídeo em reprodução // som bloqueado pelo navegador; use o alto-falante para ativar');
    }catch{}
  }

  function retryVideo(video,reason='erro de mídia'){
    const count=retryCount.get(video)||0;
    if(count>=2){
      setStatus(video,'vídeo indisponível neste navegador // tente abrir o arquivo diretamente',{error:true,link:true,timeout:0});
      return;
    }
    retryCount.set(video,count+1);
    setStatus(video,`vídeo demorou a responder // tentativa ${count+1}/2`);
    const src=video.currentSrc||video.src;
    setTimeout(()=>{
      if(!video.isConnected||!src)return;
      try{
        const currentTime=Number.isFinite(video.currentTime)?video.currentTime:0;
        video.pause();
        video.removeAttribute('src');
        video.load();
        video.src=src;
        video.preload='auto';
        video.load();
        video.addEventListener('loadedmetadata',()=>{
          if(currentTime>0&&Number.isFinite(video.duration)&&currentTime<video.duration){
            try{video.currentTime=currentTime;}catch{}
          }
        },{once:true});
      }catch{
        setStatus(video,`falha ao recarregar vídeo // ${reason}`,{error:true,link:true,timeout:0});
      }
    },350);
  }

  function enhance(video){
    if(!video||enhanced.has(video))return;
    enhanced.add(video);
    retryCount.set(video,0);

    video.preload='auto';
    video.controls=true;
    video.playsInline=true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');

    const watchdog=setTimeout(()=>{
      if(video.isConnected&&video.readyState<2)retryVideo(video,'timeout de carregamento');
    },4500);

    video.addEventListener('loadedmetadata',()=>{
      clearTimeout(watchdog);
      const status=statusFor(video);
      status?.classList.remove('show','error');
      attemptPlay(video);
    },{once:true});

    video.addEventListener('canplay',()=>{
      clearTimeout(watchdog);
      attemptPlay(video);
    },{once:true});

    video.addEventListener('error',()=>{
      clearTimeout(watchdog);
      const code=video.error?.code||0;
      const label={1:'reprodução interrompida',2:'erro de rede',3:'erro de decodificação',4:'formato não suportado'}[code]||'erro de mídia';
      retryVideo(video,label);
    });

    video.addEventListener('stalled',()=>{
      if(video.readyState<2)retryVideo(video,'conexão interrompida');
    });

    video.addEventListener('playing',()=>{
      retryCount.set(video,0);
      const status=statusFor(video);
      status?.classList.remove('show','error');
    });

    // O elemento já pode ter recebido metadata antes de o observer chegar.
    if(video.readyState>=2)attemptPlay(video);
    else {
      try{video.load();}catch{}
    }
  }

  function scan(root=document){
    root.querySelectorAll?.('.story-video').forEach(enhance);
  }

  const observer=new MutationObserver(records=>{
    for(const record of records){
      for(const node of record.addedNodes){
        if(!(node instanceof Element))continue;
        if(node.matches?.('.story-video'))enhance(node);
        scan(node);
      }
    }
  });

  const boot=()=>{
    scan();
    observer.observe(document.documentElement,{subtree:true,childList:true});
    document.documentElement.dataset.avessoStoryVideoFix='20261003-v2';
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
