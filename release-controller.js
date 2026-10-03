/* AVESSO Release Controller 2026-10-03
   Detecta novas versões do Service Worker, avisa o usuário e reinicia a
   interface automaticamente quando não há trabalho local em andamento. */

const RELEASE_CONTROLLER_VERSION='20261003-release1';
const UPDATE_CHECK_MS=60_000;
const AUTO_RESTART_SECONDS=5;
const RETRY_WHILE_BUSY_MS=1_250;

let updatePending=false;
let countdownTimer=null;
let retryTimer=null;
let audioContext=null;
let audioArmed=false;
let registration=null;
let hadController=Boolean(navigator.serviceWorker?.controller);

function q(selector,root=document){return root.querySelector(selector);}
function qa(selector,root=document){return [...root.querySelectorAll(selector)];}

function ensureReleaseStyles(){
  if(q('link[data-avesso-release-controller]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`release-controller.css?v=${RELEASE_CONTROLLER_VERSION}`,import.meta.url).href;
  link.dataset.avessoReleaseController=RELEASE_CONTROLLER_VERSION;
  document.head.appendChild(link);
}

function ensureUpdateIndicator(){
  let node=q('#avesso-release-indicator');
  if(node)return node;
  node=document.createElement('section');
  node.id='avesso-release-indicator';
  node.className='avesso-release-indicator';
  node.setAttribute('role','status');
  node.setAttribute('aria-live','assertive');
  node.setAttribute('aria-atomic','true');
  node.innerHTML=`
    <span class="avesso-release-icon" aria-hidden="true">↻</span>
    <span class="avesso-release-copy">
      <b>NOVA VERSÃO // AVESSO</b>
      <small data-release-status>preparando reinício automático...</small>
    </span>
    <button type="button" data-release-restart-now>reiniciar agora</button>`;
  q('[data-release-restart-now]',node).addEventListener('click',()=>restartNow());
  document.body.appendChild(node);
  return node;
}

function setIndicatorStatus(message,mode='ready'){
  const node=ensureUpdateIndicator();
  node.dataset.mode=mode;
  q('[data-release-status]',node).textContent=message;
}

function armUpdateSound(){
  if(audioArmed)return;
  const unlock=()=>{
    audioArmed=true;
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(AudioCtx){
        audioContext=audioContext||new AudioCtx();
        audioContext.resume?.().catch(()=>{});
      }
    }catch{}
    document.removeEventListener('pointerdown',unlock,true);
    document.removeEventListener('keydown',unlock,true);
  };
  document.addEventListener('pointerdown',unlock,true);
  document.addEventListener('keydown',unlock,true);
}

function playUpdateSound(){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;
    audioContext=audioContext||new AudioCtx();
    audioContext.resume?.().catch(()=>{});
    const now=audioContext.currentTime;
    [659.25,880].forEach((frequency,index)=>{
      const oscillator=audioContext.createOscillator();
      const gain=audioContext.createGain();
      const start=now+(index*.16);
      oscillator.type='square';
      oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.055,start+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,start+.11);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start+.12);
    });
  }catch{}
  try{navigator.vibrate?.([70,45,90]);}catch{}
}

function showSystemNotification(){
  try{
    if(!document.hidden||!('Notification' in window)||Notification.permission!=='granted')return;
    const notification=new Notification('AVESSO // nova versão pronta',{
      body:'O sistema será reiniciado automaticamente para aplicar a atualização.',
      icon:new URL('assets/avesso-app-icon.svg',import.meta.url).href,
      tag:'avesso-release-update',
      silent:true
    });
    window.setTimeout(()=>notification.close(),7000);
  }catch{}
}

function inputHasValue(selector){
  const field=q(selector);
  return Boolean(field&&String(field.value||'').trim());
}

function fileHasValue(selector){
  const field=q(selector);
  return Boolean(field?.files?.length);
}

function hasUnsavedWork(){
  if(q('[aria-busy="true"]'))return true;
  if(q('#story-camera-panel:not(.hidden)'))return true;

  const active=document.activeElement;
  if(active&&(
    active.matches?.('textarea,input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])')||
    active.isContentEditable
  )){
    const value='value' in active?String(active.value||''):String(active.textContent||'');
    if(value.trim())return true;
  }

  if([
    '#post-body',
    '#dm-input',
    '#story-body'
  ].some(inputHasValue))return true;

  if([
    '#post-image',
    '#post-gif-file',
    '#dm-file-input',
    '#story-image'
  ].some(fileHasValue))return true;

  const blockingDialog=qa('dialog[open]').find(dialog=>
    !dialog.matches('#story-view-dialog,.avesso-discovery-dialog')
  );
  return Boolean(blockingDialog);
}

function clearRestartTimers(){
  if(countdownTimer){window.clearInterval(countdownTimer);countdownTimer=null;}
  if(retryTimer){window.clearTimeout(retryTimer);retryTimer=null;}
}

function restartNow(){
  clearRestartTimers();
  try{
    sessionStorage.setItem('avesso.release.last-restart',`${RELEASE_CONTROLLER_VERSION}:${Date.now()}`);
  }catch{}
  setIndicatorStatus('reiniciando sistema...', 'restarting');
  document.documentElement.classList.add('avesso-system-restarting');
  window.setTimeout(()=>location.reload(),180);
}

function scheduleAutomaticRestart(){
  clearRestartTimers();
  if(!updatePending)return;

  if(hasUnsavedWork()){
    setIndicatorStatus('atualização pronta // aguardando você terminar o que está fazendo','waiting');
    retryTimer=window.setTimeout(scheduleAutomaticRestart,RETRY_WHILE_BUSY_MS);
    return;
  }

  let remaining=AUTO_RESTART_SECONDS;
  setIndicatorStatus(`reinício automático em ${remaining}s`, 'countdown');
  countdownTimer=window.setInterval(()=>{
    if(hasUnsavedWork()){
      clearRestartTimers();
      scheduleAutomaticRestart();
      return;
    }
    remaining-=1;
    if(remaining<=0){
      restartNow();
      return;
    }
    setIndicatorStatus(`reinício automático em ${remaining}s`, 'countdown');
  },1000);
}

function handleUpdateReady(){
  if(updatePending)return;
  updatePending=true;
  document.body.classList.add('avesso-release-pending');
  document.documentElement.dataset.avessoUpdate='ready';
  ensureUpdateIndicator().classList.add('show');
  playUpdateSound();
  showSystemNotification();
  scheduleAutomaticRestart();
}

function bindReleaseEvents(){
  window.addEventListener('avesso:update-ready',handleUpdateReady);
  navigator.serviceWorker?.addEventListener('controllerchange',()=>{
    if(hadController)handleUpdateReady();
    hadController=true;
  });
}

async function ensureWorkerRegistration(){
  if(!('serviceWorker' in navigator))return null;
  try{
    const scope=new URL('./',import.meta.url).pathname;
    registration=await navigator.serviceWorker.getRegistration(scope);
    if(!registration){
      registration=await navigator.serviceWorker.register(
        new URL('sw.js',import.meta.url).href,
        {scope,updateViaCache:'none'}
      );
    }
    await registration.update().catch(()=>{});
    return registration;
  }catch{return null;}
}

async function checkForUpdates(){
  if(!navigator.onLine||document.visibilityState==='hidden')return;
  const current=registration||await ensureWorkerRegistration();
  if(!current)return;
  try{await current.update();}catch{}
}

function startUpdateWatch(){
  ensureWorkerRegistration();
  window.setInterval(checkForUpdates,UPDATE_CHECK_MS);
  window.addEventListener('online',checkForUpdates,{passive:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')checkForUpdates();
  });
}

function boot(){
  ensureReleaseStyles();
  armUpdateSound();
  bindReleaseEvents();
  startUpdateWatch();
  document.documentElement.dataset.avessoReleaseController=RELEASE_CONTROLLER_VERSION;
}

boot();
