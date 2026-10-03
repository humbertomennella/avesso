// AVESSO runtime hotfixes
// Loaded before app.js through config.js. Keep this file small, defensive and removable.

const STORY_VIDEO_MIME_TYPES=new Set(['video/webm','video/mp4','video/quicktime']);

function baseMime(type=''){
  return String(type||'').split(';',1)[0].trim().toLowerCase();
}

// MediaRecorder commonly reports values such as
// "video/webm;codecs=vp8,opus". The story publisher and Storage bucket accept
// the base MIME (video/webm), so normalize only generated video File objects.
(function normalizeRecordedVideoFiles(){
  const NativeFile=globalThis.File;
  if(typeof NativeFile!=='function'||globalThis.__avessoVideoFileMimeFix)return;
  try{
    const PatchedFile=new Proxy(NativeFile,{
      construct(target,args){
        const [bits,name,options]=args;
        const next=options?{...options}:{};
        const raw=String(next.type||'');
        const normalized=baseMime(raw);
        if(raw.includes(';')&&STORY_VIDEO_MIME_TYPES.has(normalized))next.type=normalized;
        return Reflect.construct(target,[bits,name,next],target);
      }
    });
    globalThis.File=PatchedFile;
    globalThis.__avessoVideoFileMimeFix=true;
  }catch(error){
    console.warn('AVESSO: não foi possível instalar normalização de MIME de vídeo',error);
  }
})();

// mobile-ux.js chama este helper em alguns atalhos. Uma versão anterior deixou
// a referência sem implementação e gerava ReferenceError no Samsung Internet.
if(typeof globalThis.dismissBaseMoreSheet!=='function'){
  globalThis.dismissBaseMoreSheet=function dismissBaseMoreSheet(){
    const sheet=document.querySelector('#avesso-mobile-more-sheet');
    if(!sheet)return;
    sheet.classList.remove('open');
    document.body.classList.remove('mobile-more-open');
    window.setTimeout(()=>sheet.classList.add('hidden'),180);
  };
}
