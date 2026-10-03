// AVESSO runtime hotfixes
// Loaded before app.js through config.js. Keep this file small, defensive and removable.

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
