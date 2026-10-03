// AVESSO runtime hotfixes
// Loaded before app.js through config.js. Keep this file small, defensive and removable.

// MediaRecorder pode devolver "video/webm;codecs=vp8,opus". O bucket de Stories
// aceita o MIME base "video/webm". Normalizamos SOMENTE os arquivos gerados pelo
// gravador de Stories, antes que app.js valide e envie o arquivo ao Storage.
(function installStoryRecordedVideoMimeFix(){
  const NativeFile=globalThis.File;
  if(typeof NativeFile!=='function'||globalThis.__avessoStoryRecordedVideoMimeFix)return;

  const storyName=/^avesso-story-\d+\.(?:webm|mp4|mov)$/i;
  const allowedVideo=new Set(['video/webm','video/mp4','video/quicktime']);

  try{
    const PatchedFile=new Proxy(NativeFile,{
      construct(target,args,newTarget){
        const [bits,name,options]=args;
        const rawType=String(options?.type||'');
        const baseType=rawType.split(';',1)[0].trim().toLowerCase();
        const shouldNormalize=storyName.test(String(name||''))&&rawType.includes(';')&&allowedVideo.has(baseType);
        if(!shouldNormalize)return Reflect.construct(target,args,newTarget===PatchedFile?target:newTarget);
        const nextOptions={...(options||{}),type:baseType};
        return Reflect.construct(target,[bits,name,nextOptions],target);
      }
    });
    Object.defineProperty(globalThis,'File',{
      configurable:true,
      writable:true,
      value:PatchedFile
    });
    globalThis.__avessoStoryRecordedVideoMimeFix=true;
  }catch(error){
    console.warn('AVESSO: normalização do vídeo gravado indisponível',error);
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
