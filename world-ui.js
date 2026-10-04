const WORLD_UI_VERSION='20261004-world1';

const SCENES={
  feed:{code:'◒ PARA CUIDAR',title:'A praça de recados que virou feed',subtitle:'Mais conversa, menos esteira. O que chega aqui deveria parecer encontrado, não servido por uma máquina.',district:'DISTRITO // SINAIS'},
  quiet:{code:'◌ SEM RESPOSTA',title:'O corredor onde ninguém respondeu ainda',subtitle:'As conversas esquecidas ficam visíveis sem virar ranking de vergonha pública.',district:'DISTRITO // ECO'},
  sent:{code:'↗ O QUE VOCÊ DEU',title:'Arquivo de coisas que você deixou por aí',subtitle:'O rastro do que você entregou para outras pessoas, sem troféu e sem placar.',district:'DISTRITO // ARQUIVO'},
  plaza:{code:'⌂ PRAÇA CENTRAL',title:'A cidade fala ao vivo',subtitle:'Um espaço público em tempo real com gente, ruído, NPC e aquela energia de chat aberto às três da manhã.',district:'DISTRITO // PRAÇA'},
  residents:{code:'⌁ HABITANTES',title:'A internet tem moradores',subtitle:'Personagens do AVESSO não ficam presos numa página institucional. Eles ocupam o lugar.',district:'DISTRITO // HABITANTES'},
  tower:{code:'♛ TORRE',title:'O marketing ganhou um castelo',subtitle:'O Rei do Engajamento publica avisos, eventos e decisões absolutamente essenciais para ninguém.',district:'DISTRITO // TORRE'},
  messages:{code:'↔ AMIGOS & CÚMPLICES',title:'O mensageiro que lembra quando conversar era uma atividade',subtitle:'Lista de contatos, presença, janelas e conversas com cheiro de MSN sem precisar instalar uma toolbar duvidosa.',district:'DISTRITO // COMMS'},
  profile:{code:'◎ SEU CANTO',title:'Seu espaço, não seu outdoor',subtitle:'Perfil como lugar habitável: música, recados, álbum, Stories e identidade sem parecer ficha de CRM.',district:'DISTRITO // CANTO'},
  public_profile:{code:'◎ CANTO ALHEIO',title:'Você entrou no espaço de outra pessoa',subtitle:'Visite sem transformar a existência alheia em catálogo de métricas.',district:'DISTRITO // VISITA'},
  admin:{code:'♛ DASHBOARD',title:'Sala de controle',subtitle:'Moderação, segurança e operação. Menos neon performático aqui, porque alguém precisa trabalhar.',district:'DISTRITO // CONTROLE'}
};

function stylesheet(){
  let link=document.querySelector('link[data-avesso-world-ui]');
  if(!link){
    link=document.createElement('link');
    link.rel='stylesheet';
    link.dataset.avessoWorldUi=WORLD_UI_VERSION;
  }
  const href=new URL(`world-ui.css?v=${WORLD_UI_VERSION}`,import.meta.url).href;
  if(link.href!==href)link.href=href;
  document.head.appendChild(link);
}

function activeScene(){
  const active=document.querySelector('.app-nav [data-app-tab].active');
  const tab=active?.dataset?.appTab||document.body.dataset.avessoScene||'feed';
  if(document.body.classList.contains('avesso-public-corner'))return 'public_profile';
  return SCENES[tab]?tab:'feed';
}

function create(tag,className,html=''){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(html)el.innerHTML=html;
  return el;
}

function ensureWorldChrome(){
  const app=document.querySelector('#app-view.app-shell');
  const nav=app?.querySelector(':scope > .app-nav')||app?.querySelector('.app-nav');
  const feed=app?.querySelector(':scope > .feed-column')||app?.querySelector('.feed-column');
  const aside=app?.querySelector(':scope > .app-aside')||app?.querySelector('.app-aside');
  if(!app||!nav||!feed||!aside)return false;

  // Restaura a hierarquia histórica caso uma execução anterior tenha deixado
  // wrappers experimentais no DOM. CSS legado usa seletores com filho direto.
  const legacyStage=app.querySelector(':scope > .world-stage');
  if(legacyStage&&legacyStage.contains(feed)){
    legacyStage.parentNode.insertBefore(feed,legacyStage);
    legacyStage.remove();
  }
  const legacyTower=app.querySelector(':scope > .world-tower-shell');
  if(legacyTower&&legacyTower.contains(aside)){
    legacyTower.parentNode.insertBefore(aside,legacyTower);
    legacyTower.remove();
  }

  if(!document.querySelector('#avesso-world-backdrop')){
    const bg=create('div','avesso-world-backdrop');
    bg.id='avesso-world-backdrop';
    bg.setAttribute('aria-hidden','true');
    bg.innerHTML='<i class="world-moon"></i><div class="world-horizon"><b></b><b></b><b></b><b></b><b></b><b></b><b></b></div><div class="world-wires"><i></i><i></i><i></i></div><div class="world-noise"></div>';
    document.body.appendChild(bg);
  }

  let top=app.querySelector(':scope > .world-topbar');
  if(!top){
    top=create('header','world-topbar',`<div class="world-topbar-brand"><span>AVESSO://MUNDO</span><b data-world-scene-code>◒ PARA CUIDAR</b></div><div class="world-signal"><i></i><span data-world-signal>rede estável o suficiente</span></div><div class="world-clock" aria-hidden="true"><span>LOCAL</span><b data-world-clock>--:--</b></div>`);
    app.prepend(top);
  }

  if(!aside.querySelector(':scope > .world-tower-sign')){
    aside.insertAdjacentHTML('afterbegin','<div class="world-tower-sign"><span>♛</span><b>TORRE DO ENGAJAMENTO</b><small>PROPAGANDA // AVISOS // DELÍRIOS</small></div>');
  }

  let intro=feed.querySelector(':scope > .world-scene-intro');
  if(!intro){
    intro=create('section','world-scene-intro');
    intro.innerHTML='<div class="world-scene-copy"><span data-world-district>DISTRITO // SINAIS</span><h2 data-world-title>A praça de recados que virou feed</h2><p data-world-subtitle>Mais conversa, menos esteira.</p></div><div class="world-scene-terminal"><span>SINAL</span><b data-world-terminal>ONLINE</b><i></i></div>';
    feed.prepend(intro);
  }

  const stories=feed.querySelector('#stories-zone');
  const composer=feed.querySelector('.composer');
  if(stories&&composer&&!feed.querySelector(':scope > .world-transmission-deck')){
    const deck=create('section','world-transmission-deck');
    stories.parentNode.insertBefore(deck,stories);
    const label=create('header','world-deck-label','<span>TRANSMISSÕES // AGORA</span><small>Stories e coisas que talvez desapareçam antes de você entender</small>');
    deck.append(label,stories,composer);
  }

  const status=feed.querySelector('#feed-status');
  const list=feed.querySelector('#feed-list');
  if(status&&list&&!feed.querySelector(':scope > .world-stream')){
    const stream=create('section','world-stream');
    status.parentNode.insertBefore(stream,status);
    stream.innerHTML='<header class="world-stream-head"><div><span>FLUXO // SEM ESTEIRA INFINITA</span><b data-world-stream-label>RECENTES</b></div><i aria-hidden="true"></i></header>';
    stream.append(status,list);
  }

  if(!app.querySelector(':scope > .world-mobile-dock-label')){
    const label=create('div','world-mobile-dock-label','<span>AVESSO</span><b data-world-mobile-scene>PARA CUIDAR</b>');
    app.appendChild(label);
  }

  return true;
}

function decorateSceneContent(scene){
  const list=document.querySelector('#feed-list');
  if(!list)return;
  list.dataset.worldScene=scene;
  const root=list.firstElementChild;
  if(root)root.dataset.worldDistrict=scene;

  if(scene==='plaza'){
    const plaza=list.querySelector('.plaza-world');
    if(plaza&&!plaza.querySelector('.world-place-marker'))plaza.insertAdjacentHTML('afterbegin','<div class="world-place-marker"><span>⌂</span><b>PRAÇA CENTRAL</b><small>CANAL PÚBLICO // GENTE REAL + NPC DUVIDOSO</small></div>');
  }
  if(scene==='profile'||scene==='public_profile'){
    const profile=list.querySelector('.profile-control,.public-profile');
    if(profile&&!profile.querySelector('.world-corner-plaque'))profile.insertAdjacentHTML('afterbegin','<div class="world-corner-plaque"><span>◎</span><b>ESTE É UM LUGAR, NÃO UM PERFIL</b><small>MÚSICA // ÁLBUM // RECADOS // STORIES</small></div>');
  }
  if(scene==='messages'&&!list.querySelector('.world-comms-plaque'))list.insertAdjacentHTML('afterbegin','<div class="world-comms-plaque"><span>↔</span><div><b>CENTRAL DE CÚMPLICES</b><small>PRESENÇA // MENSAGENS // JANELAS // BARULHOS DE MSN</small></div><i></i></div>');
  if(scene==='residents'&&!list.querySelector('.world-residents-plaque'))list.insertAdjacentHTML('afterbegin','<div class="world-residents-plaque"><span>⌁</span><div><b>HABITANTES DO AVESSO</b><small>eles estavam aqui antes desta página carregar. reconfortante.</small></div></div>');
  if(scene==='tower'&&!list.querySelector('.world-king-plaque'))list.insertAdjacentHTML('afterbegin','<div class="world-king-plaque"><span>♛</span><div><b>A TORRE ESTÁ TRANSMITINDO</b><small>o Rei do Engajamento garante que isto é estrategicamente indispensável.</small></div></div>');
}

function applyScene(scene=activeScene()){
  const meta=SCENES[scene]||SCENES.feed;
  document.body.dataset.avessoScene=scene;
  document.documentElement.dataset.avessoWorld=WORLD_UI_VERSION;
  document.querySelector('[data-world-scene-code]')?.replaceChildren(document.createTextNode(meta.code));
  document.querySelector('[data-world-title]')?.replaceChildren(document.createTextNode(meta.title));
  document.querySelector('[data-world-subtitle]')?.replaceChildren(document.createTextNode(meta.subtitle));
  document.querySelector('[data-world-district]')?.replaceChildren(document.createTextNode(meta.district));
  document.querySelector('[data-world-mobile-scene]')?.replaceChildren(document.createTextNode(meta.code.replace(/^[^ ]+\s*/,'')));
  document.querySelector('[data-world-stream-label]')?.replaceChildren(document.createTextNode(scene==='quiet'?'SEM RESPOSTA':scene==='sent'?'ENTREGUES':scene==='feed'?'RECENTES':'AMBIENTE'));
  const terminal=document.querySelector('[data-world-terminal]');
  if(terminal)terminal.textContent=['plaza','messages'].includes(scene)?'REALTIME':'ONLINE';
  decorateSceneContent(scene);
}

function updateClock(){
  const el=document.querySelector('[data-world-clock]');
  if(!el)return;
  el.textContent=new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());
}

let signalTimer=null;
function signal(message,mode='normal'){
  const el=document.querySelector('[data-world-signal]');
  if(!el)return;
  el.textContent=message;
  el.closest('.world-signal')?.setAttribute('data-mode',mode);
  clearTimeout(signalTimer);
  signalTimer=setTimeout(()=>{
    el.textContent='rede estável o suficiente';
    el.closest('.world-signal')?.removeAttribute('data-mode');
  },3600);
}

function installObservers(){
  const nav=document.querySelector('.app-nav');
  const list=document.querySelector('#feed-list');
  if(nav&&!nav.dataset.worldObserved){
    nav.dataset.worldObserved='1';
    nav.addEventListener('click',event=>{
      if(!event.target.closest('[data-app-tab]'))return;
      requestAnimationFrame(()=>requestAnimationFrame(()=>applyScene()));
    });
    new MutationObserver(()=>applyScene()).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  if(list&&!list.dataset.worldObserved){
    list.dataset.worldObserved='1';
    let frame=0;
    new MutationObserver(()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>decorateSceneContent(activeScene()));
    }).observe(list,{childList:true,subtree:true});
  }
  window.addEventListener('popstate',()=>requestAnimationFrame(()=>applyScene()));
  window.addEventListener('avesso:notification',event=>signal(event.detail?.title||'nova atividade no AVESSO','hot'));
  window.addEventListener('avesso:chat-opened',event=>signal(`canal aberto com ${event.detail?.displayName||'cúmplice'}`,'chat'));
  window.addEventListener('avesso:chat-closed',()=>signal('canal de conversa fechado','normal'));
  window.addEventListener('offline',()=>signal('sem rede. o mundo ficou local por alguns minutos.','offline'));
  window.addEventListener('online',()=>signal('conexão restaurada','normal'));
}

function boot(){
  stylesheet();
  if(!ensureWorldChrome())return;
  installObservers();
  updateClock();
  setInterval(updateClock,30000);
  applyScene();
  document.body.classList.add('avesso-world-ready');
}

stylesheet();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
