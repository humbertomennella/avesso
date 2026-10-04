const UI_VERSION='20261003-ui3';

function ensureUiStylesheet(key,file){
  if(document.querySelector(`link[data-avesso-ui="${key}"]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`${file}?v=${UI_VERSION}`,import.meta.url).href;
  link.dataset.avessoUi=key;
  document.head.appendChild(link);
}

ensureUiStylesheet('base','avesso-ui.css');
ensureUiStylesheet('poster-rockstar','poster-rockstar.css');
document.documentElement.dataset.avessoUi=UI_VERSION;
document.documentElement.dataset.avessoTheme='poster-rockstar';
