const UI_VERSION='20261003-ui1';
if(!document.querySelector('link[data-avesso-ui]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`avesso-ui.css?v=${UI_VERSION}`,import.meta.url).href;
  link.dataset.avessoUi=UI_VERSION;
  document.head.appendChild(link);
}
document.documentElement.dataset.avessoUi=UI_VERSION;
