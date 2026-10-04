const UI_VERSION='20261003-ui2';
const POSTER_THEME_VERSION='20261003-rockstar1';
const ECONOMY_SHADOW_VERSION='20261004-shadow1';

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

// Reaplica a folha visual no fim do <head> depois que as demais camadas
// de compatibilidade carregarem. A lógica do produto continua intocada.
queueMicrotask(activatePosterRockstarTheme);
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',activatePosterRockstarTheme,{once:true});
}else{
  activatePosterRockstarTheme();
}

// Economia v1 em modo sombra. Falha silenciosa por projeto: nenhum recurso
// público da AVESSO depende deste módulo durante a fase de observação.
const economyShadowUrl=new URL(`economy-shadow.js?v=${ECONOMY_SHADOW_VERSION}`,import.meta.url).href;
import(economyShadowUrl).catch(error=>console.debug('AVESSO economy shadow não carregou',error?.message||error));

document.documentElement.dataset.avessoUi=UI_VERSION;
