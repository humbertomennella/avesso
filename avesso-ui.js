const UI_VERSION='20261003-ui2';
const POSTER_THEME_VERSION='20261003-rockstar1';

function ensureUiStylesheet(key,file,version=UI_VERSION){
  let link=document.querySelector(`link[data-avesso-ui="${key}"]`);
  if(!link){
    link=document.createElement('link');
    link.rel='stylesheet';
    link.dataset.avessoUi=key;
  }
  const href=new URL(`${file}?v=${version}`,import.meta.url).href;
  if(link.href!==href)link.href=href;
  document.head.appendChild(link);
  return link;
}

ensureUiStylesheet('base','avesso-ui.css');

function activatePosterRockstarTheme(){
  ensureUiStylesheet('poster-rockstar','poster-rockstar.css',POSTER_THEME_VERSION);
  document.documentElement.dataset.avessoTheme='poster-rockstar';
}

queueMicrotask(activatePosterRockstarTheme);
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',activatePosterRockstarTheme,{once:true});
}else{
  activatePosterRockstarTheme();
}

document.documentElement.dataset.avessoUi=UI_VERSION;
