const WORLD_UI_VERSION='20261004-world1';

const ZONES={
  feed:{code:'DISTRITO 01',title:'Para cuidar',subtitle:'O que chegou agora e merece atenção.',signal:'SINAL ABERTO'},
  quiet:{code:'DISTRITO 02',title:'Sem resposta',subtitle:'Vozes que ainda estão esperando alguém aparecer.',signal:'BAIXA ATENÇÃO'},
  sent:{code:'DISTRITO 03',title:'O que você deu',subtitle:'Seu rastro no outro lado da internet.',signal:'ARQUIVO VIVO'},
  plaza:{code:'PRAÇA CENTRAL',title:'Praça Central',subtitle:'Conversa pública em tempo real. Entre, fique, responda.',signal:'AGORA AO VIVO'},
  residents:{code:'HABITANTES',title:'Habitantes do Avesso',subtitle:'Nem tudo aqui é usuário. Algumas coisas moram no sistema.',signal:'PRESENÇAS DETECTADAS'},
  tower:{code:'TORRE',title:'Torre do Engajamento',subtitle:'O lugar de onde o Rei observa o absurdo das métricas.',signal:'TRANSMISSÃO INSTÁVEL'},
  messages:{code:'CONEXÕES',title:'Amigos & Cúmplices',subtitle:'Conversas privadas, presença e pequenos sinais de vida.',signal:'LINHA DIRETA'},
  profile:{code:'SEU CANTO',title:'Seu Canto',subtitle:'Seu pedaço da internet. Decore como se ninguém estivesse julgando.',signal:'ESPAÇO PESSOAL'},
  admin:{code:'BASTIDORES',title:'Dashboard',subtitle:'Ferramentas de administração do outro lado.',signal:'ACESSO ELEVADO'}
};

let refreshQueued=false;
let refreshing=false;
let observer=null;

function activeZone(){
  const active=document.querySelector('.app-nav [data-app-tab].active');
  return active?.dataset.appTab||document.body?.dataset.worldZone||'feed';
}

function ensureBackdrop(){
  if(!document.body||document.querySelector('.avesso-world-backdrop'))return;
  const el=document.createElement('div');
  el.className='avesso-world-backdrop';
  el.setAttribute('aria-hidden','true');
  el.innerHTML='<i></i><i></i><i></i><span>AVESSO://MUNDO_ATIVO</span>';
  document.body.prepend(el);
}

function ensureWorldBar(){
  const feed=document.querySelector('.feed-column');
  if(!feed)return null;
  let bar=feed.querySelector(':scope > .world-zone-bar');
  if(!bar){
    bar=document.createElement('section');
    bar.className='world-zone-bar';
    bar.setAttribute('aria-label','Localização atual no AVESSO');
    bar.innerHTML=`
      <div class="world-zone-copy">
        <span class="world-zone-code"></span>
        <strong class="world-zone-title"></strong>
        <small class="world-zone-subtitle"></small>
      </div>
      <div class="world-zone-telemetry" aria-hidden="true">
        <span><b class="world-zone-dot"></b><em class="world-zone-signal"></em></span>
        <span class="world-zone-clock">--:--</span>
      </div>`;
    feed.prepend(bar);
  }
  return bar;
}

function ensureWorldAside(){
  const aside=document.querySelector('.app-aside');
  if(!aside)return;
  let block=aside.querySelector('.world-broadcast');
  if(!block){
    block=document.createElement('section');
    block.className='aside-card world-broadcast';
    block.innerHTML=`
      <div class="world-broadcast-head"><span>TRANSMISSÃO LOCAL</span><b>●</b></div>
      <p class="world-broadcast-copy">A internet está acordada. Péssima notícia para quem queria paz.</p>
      <small>AVESSO://freq_90.26</small>`;
    aside.prepend(block);
  }
}

function decorateNav(){
  document.querySelectorAll('.app-nav [data-app-tab]').forEach((button,index)=>{
    const zone=ZONES[button.dataset.appTab];
    if(!zone)return;
    const expectedIndex=String(index+1).padStart(2,'0');
    if(button.dataset.worldIndex!==expectedIndex)button.dataset.worldIndex=expectedIndex;
    if(button.dataset.worldName!==zone.title)button.dataset.worldName=zone.title;
  });
}

function decorateContent(){
  document.querySelectorAll('.feed-list > *,.post-card,.post,.feed-item').forEach((card,index)=>{
    if(!card.classList.contains('world-content-card'))card.classList.add('world-content-card');
    if(!card.dataset.worldSerial)card.dataset.worldSerial=String(index+1).padStart(3,'0');
  });
  document.querySelectorAll('.story-view-card,.story-card').forEach(card=>{
    if(!card.classList.contains('world-story-frame'))card.classList.add('world-story-frame');
  });
  document.querySelectorAll('.chat-window,.direct-chat-window,.messages-window,.conversation-window').forEach(el=>{
    if(!el.classList.contains('world-chat-frame'))el.classList.add('world-chat-frame');
  });
  document.querySelectorAll('.profile-shell,.profile-page,.profile-hero,.corner-shell').forEach(el=>{
    if(!el.classList.contains('world-profile-frame'))el.classList.add('world-profile-frame');
  });
}

function updateZone(zoneName=activeZone()){
  if(!document.body)return;
  const zone=ZONES[zoneName]||ZONES.feed;
  if(document.body.dataset.worldZone!==zoneName)document.body.dataset.worldZone=zoneName;
  const bar=ensureWorldBar();
  if(bar){
    const code=bar.querySelector('.world-zone-code');
    const title=bar.querySelector('.world-zone-title');
    const subtitle=bar.querySelector('.world-zone-subtitle');
    const signal=bar.querySelector('.world-zone-signal');
    if(code&&code.textContent!==zone.code)code.textContent=zone.code;
    if(title&&title.textContent!==zone.title)title.textContent=zone.title;
    if(subtitle&&subtitle.textContent!==zone.subtitle)subtitle.textContent=zone.subtitle;
    if(signal&&signal.textContent!==zone.signal)signal.textContent=zone.signal;
  }
  document.querySelectorAll('.app-nav [data-app-tab]').forEach(button=>{
    const current=button.dataset.appTab===zoneName;
    if(current&&!button.hasAttribute('data-world-current'))button.setAttribute('data-world-current','');
    if(!current&&button.hasAttribute('data-world-current'))button.removeAttribute('data-world-current');
  });
}

function tickClock(){
  const clock=document.querySelector('.world-zone-clock');
  if(!clock)return;
  const now=new Date();
  const value=now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  if(clock.textContent!==value)clock.textContent=value;
}

function refreshWorld(){
  if(refreshing)return;
  refreshing=true;
  try{
    ensureWorldBar();
    ensureWorldAside();
    decorateNav();
    decorateContent();
    updateZone();
    tickClock();
  }finally{
    refreshing=false;
  }
}

function scheduleRefresh(){
  if(refreshQueued)return;
  refreshQueued=true;
  const run=()=>{
    refreshQueued=false;
    refreshWorld();
  };
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(run);
  else setTimeout(run,0);
}

function installWorldEvents(){
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('.app-nav [data-app-tab]');
    if(button)setTimeout(()=>updateZone(button.dataset.appTab),0);
  });
  window.addEventListener('hashchange',scheduleRefresh);
}

function bootWorld(){
  if(document.documentElement.dataset.avessoWorld===WORLD_UI_VERSION)return;
  document.documentElement.dataset.avessoWorld=WORLD_UI_VERSION;
  document.documentElement.classList.add('avesso-world-redesign');

  refreshWorld();
  installWorldEvents();
  setInterval(tickClock,30000);

  const target=document.querySelector('#app-view')||document.body;
  if(target&&typeof MutationObserver!=='undefined'){
    observer?.disconnect();
    observer=new MutationObserver(scheduleRefresh);
    observer.observe(target,{childList:true,subtree:true});
  }
}

function scheduleBoot(){
  setTimeout(bootWorld,0);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',scheduleBoot,{once:true});
}else{
  scheduleBoot();
}
