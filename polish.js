// AVESSO polish layer 2026-10-03
// Camada pequena e deliberadamente isolada: corrige arestas de UX sem misturar
// regras de produto com o arquivo de configuração.

const POLISH_VERSION='20261003-polish7';
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];

function ensurePolishStyles(){
  if(q('link[data-avesso-polish]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`polish.css?v=${POLISH_VERSION}`,import.meta.url).href;
  link.dataset.avessoPolish=POLISH_VERSION;
  document.head.appendChild(link);
}

/*
 * AUTH_TAB_LEGACY_BRIDGE
 * app.js ainda possui duas chamadas legadas em que querySelector(...).forEach
 * é usado para as abas de autenticação. Em vez de poluir Element.prototype,
 * mantemos a compatibilidade SOMENTE no primeiro botão do conjunto. Quando o
 * seletor for consolidado para $$() no bundle principal, este bloco pode sair.
 */
function ensureAuthTabIterationContract(){
  const first=q('[data-auth-mode]');
  if(!first||typeof first.forEach==='function')return;
  Object.defineProperty(first,'forEach',{
    configurable:true,
    enumerable:false,
    writable:true,
    value(callback,thisArg){
      return qa('[data-auth-mode]').forEach(callback,thisArg);
    }
  });
}

function bindStoryDialogFeedback(){
  const dialog=q('#story-create-dialog');
  const message=q('#story-create-message');
  const toast=q('#toast');
  const publish=q('#story-publish');
  if(!dialog||!message||!toast)return;

  const mirrorToast=()=>{
    const open=dialog.open||dialog.hasAttribute('open');
    const text=String(toast.textContent||'').trim();
    if(open&&text)message.textContent=text;
  };

  const observer=new MutationObserver(mirrorToast);
  observer.observe(toast,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']});
  publish?.addEventListener('click',()=>{message.textContent='';},true);
  dialog.addEventListener('close',()=>{message.textContent='';});
}

function desiredAuthMode(trigger){
  const explicit=trigger?.dataset?.authOpen;
  if(explicit==='login'||explicit==='signup')return explicit;
  const label=String(trigger?.textContent||'').toLowerCase();
  if(/\bentrar\b/.test(label)&&!/(criar|cadastro|canto)/.test(label))return'login';
  return'signup';
}

function focusAuth(mode){
  requestAnimationFrame(()=>{
    const dialog=q('#auth-dialog');
    if(!dialog?.open&&!dialog?.hasAttribute('open'))return;
    const target=mode==='login'
      ? q('#auth-form input[name="email"]')
      : q('#auth-form input[name="display_name"]');
    target?.focus({preventScroll:true});
    q('.auth-panel',dialog)?.scrollTo?.({top:0,behavior:'instant'});
  });
}

function ensureAuthLegalLinks(){
  const panel=q('#auth-dialog .auth-panel');
  if(!panel||q('.auth-legal-links',panel))return;
  const legal=document.createElement('p');
  legal.className='auth-legal-links';
  legal.style.cssText='display:flex;flex-wrap:wrap;justify-content:center;gap:8px 14px;margin:12px 0 0;font:600 .52rem var(--mono);';
  legal.innerHTML='<a href="PRIVACIDADE.md" target="_blank" rel="noopener" style="color:var(--cyan)">privacidade</a><a href="TERMOS.md" target="_blank" rel="noopener" style="color:var(--cyan)">termos de uso</a>';
  panel.appendChild(legal);
}

function bindAuthIntent(){
  document.addEventListener('click',event=>{
    const trigger=event.target.closest?.('[data-open-auth]');
    if(trigger){
      const mode=desiredAuthMode(trigger);
      queueMicrotask(()=>{
        q(`[data-auth-mode="${mode}"]`)?.click();
        focusAuth(mode);
      });
      return;
    }

    const tab=event.target.closest?.('[data-auth-mode]');
    if(tab)focusAuth(tab.dataset.authMode);
  },true);

  const form=q('#auth-form');
  if(form){
    form.addEventListener('submit',()=>{
      form.setAttribute('aria-busy','true');
      const submit=q('#auth-submit',form);
      submit?.setAttribute('aria-disabled','true');
      window.setTimeout(()=>{
        if(!form.isConnected)return;
        form.removeAttribute('aria-busy');
        submit?.removeAttribute('aria-disabled');
      },15000);
    });
  }

  const dialog=q('#auth-dialog');
  dialog?.addEventListener('close',()=>{
    form?.removeAttribute('aria-busy');
    q('#auth-submit',form)?.removeAttribute('aria-disabled');
  });
}

function syncViewport(){
  const viewport=window.visualViewport;
  const height=Math.round(viewport?.height||window.innerHeight||0);
  if(height>0)document.documentElement.style.setProperty('--avesso-polish-vh',`${height}px`);
  document.documentElement.classList.toggle('avesso-short-viewport',height>0&&height<640);
}

function bindViewport(){
  let frame=0;
  const schedule=()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(syncViewport);
  };
  window.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener('scroll',schedule,{passive:true});
  syncViewport();
}

function bindReducedMotion(){
  const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  if(!media)return;
  const sync=()=>document.documentElement.classList.toggle('avesso-reduced-motion',media.matches);
  media.addEventListener?.('change',sync);
  sync();
}

function loadAccountCenter(){
  window.setTimeout(()=>{
    import(`./account-center.js?v=${POLISH_VERSION}`).catch(error=>console.error('account center boot',error));
  },0);
}

function boot(){
  ensurePolishStyles();
  ensureAuthTabIterationContract();
  ensureAuthLegalLinks();
  bindStoryDialogFeedback();
  bindAuthIntent();
  bindViewport();
  bindReducedMotion();
  loadAccountCenter();
  document.documentElement.dataset.avessoPolish=POLISH_VERSION;
}

boot();
