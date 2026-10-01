/* AVESSO mobile integration 2026-10-01 */
(() => {
  const MOBILE_QUERY = '(max-width: 820px)';
  const PRIMARY_TABS = new Set(['feed','plaza','messages','profile']);
  const root = document.documentElement;
  const media = window.matchMedia(MOBILE_QUERY);
  const isMobile = () => media.matches;

  let appNav = null;
  let navAnchor = null;
  let navObserver = null;
  let appObserver = null;
  let moreButton = null;
  let moreSheet = null;
  const unread = {messages:0,profile:0};

  function vibrate(ms=8){
    try{ navigator.vibrate?.(ms); }catch{}
  }

  function syncVisualViewport(){
    const vv = window.visualViewport;
    const height = vv?.height || window.innerHeight;
    root.style.setProperty('--avesso-visual-height', height + 'px');

    if(!isMobile()){
      root.classList.remove('avesso-keyboard-open');
      return;
    }

    const active = document.activeElement;
    const editing = !!active && /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    const viewportShrunk = vv ? vv.height < window.innerHeight * 0.78 : false;
    root.classList.toggle('avesso-keyboard-open', editing && viewportShrunk);
  }

  function ensureBadge(button,type){
    if(!button)return null;
    let badge=button.querySelector('.mobile-nav-badge');
    if(!badge){
      badge=document.createElement('i');
      badge.className='mobile-nav-badge hidden';
      badge.dataset.mobileBadge=type;
      button.appendChild(badge);
    }
    return badge;
  }

  function renderBadges(){
    const messageButton=appNav?.querySelector('[data-app-tab="messages"]');
    const profileButton=appNav?.querySelector('[data-app-tab="profile"]');
    const messageBadge=ensureBadge(messageButton,'messages');
    const profileBadge=ensureBadge(profileButton,'profile');
    if(messageBadge){
      messageBadge.textContent=unread.messages>9?'9+':String(unread.messages||'');
      messageBadge.classList.toggle('hidden',!unread.messages);
    }
    if(profileBadge){
      profileBadge.textContent=unread.profile>9?'9+':String(unread.profile||'');
      profileBadge.classList.toggle('hidden',!unread.profile);
    }
  }

  function clearBadgeForTab(tab){
    if(tab==='messages') unread.messages=0;
    if(tab==='profile') unread.profile=0;
    renderBadges();
  }

  function syncNotificationLabel(){
    const button=moreSheet?.querySelector('[data-mobile-notifications]');
    if(!button)return;
    let label='notificações indisponíveis';
    if('Notification' in window){
      label=Notification.permission==='granted'?'notificações do celular ativas'
        :Notification.permission==='denied'?'notificações bloqueadas pelo navegador'
        :'ativar notificações no celular';
    }
    button.querySelector('span').textContent=label;
    button.classList.toggle('active','Notification' in window&&Notification.permission==='granted');
  }

  function ensureMoreUi(){
    if(!appNav)return;

    if(!moreButton){
      moreButton=document.createElement('button');
      moreButton.type='button';
      moreButton.className='mobile-nav-more';
      moreButton.dataset.mobileMore='1';
      moreButton.innerHTML='<span>•••</span><b>mais</b><i class="mobile-nav-more-dot"></i>';
      appNav.appendChild(moreButton);
      moreButton.addEventListener('click',()=>{
        vibrate(10);
        toggleMoreSheet();
      });
    }

    if(!moreSheet){
      moreSheet=document.createElement('section');
      moreSheet.id='avesso-mobile-more-sheet';
      moreSheet.className='avesso-mobile-more-sheet hidden';
      moreSheet.innerHTML='<header><div><small>AVESSO // ATALHOS</small><b>mais lugares para se perder</b></div><button type="button" data-mobile-more-close aria-label="Fechar">×</button></header><div class="mobile-more-grid"></div><button type="button" class="mobile-notification-row" data-mobile-notifications><i>●</i><span>ativar notificações no celular</span></button>';
      document.body.appendChild(moreSheet);

      moreSheet.querySelector('[data-mobile-more-close]').addEventListener('click',()=>closeMoreSheet());
      moreSheet.querySelector('[data-mobile-notifications]').addEventListener('click',()=>{
        vibrate(12);
        window.dispatchEvent(new CustomEvent('avesso:request-notifications'));
      });
      moreSheet.addEventListener('click',e=>{
        if(e.target===moreSheet)closeMoreSheet();
      });
    }

    rebuildMoreSheet();
    syncNotificationLabel();
  }

  function rebuildMoreSheet(){
    if(!appNav||!moreSheet)return;
    const grid=moreSheet.querySelector('.mobile-more-grid');
    grid.innerHTML='';

    [...appNav.querySelectorAll('[data-app-tab]')].forEach(original=>{
      const tab=original.dataset.appTab;
      original.classList.toggle('mobile-primary-tab',PRIMARY_TABS.has(tab));
      original.classList.toggle('mobile-extra-tab',!PRIMARY_TABS.has(tab));
      if(PRIMARY_TABS.has(tab) || original.classList.contains('hidden'))return;

      const proxy=document.createElement('button');
      proxy.type='button';
      proxy.className='mobile-more-item';
      proxy.dataset.mobileProxy=tab;
      proxy.innerHTML='<span>'+original.innerHTML+'</span><i>›</i>';
      proxy.classList.toggle('active',original.classList.contains('active'));
      proxy.addEventListener('click',()=>{
        vibrate(10);
        original.click();
        closeMoreSheet();
      });
      grid.appendChild(proxy);
    });

    const activeExtra=[...appNav.querySelectorAll('.mobile-extra-tab.active')].find(x=>!x.classList.contains('hidden'));
    moreButton?.classList.toggle('active',Boolean(activeExtra));
    if(moreButton){
      const label=moreButton.querySelector('b');
      if(label)label.textContent=activeExtra?(activeExtra.textContent||'mais').replace(/^\S+\s*/,'').trim().slice(0,18)||'mais':'mais';
    }
  }

  function openMoreSheet(){
    if(!moreSheet)return;
    rebuildMoreSheet();
    syncNotificationLabel();
    moreSheet.classList.remove('hidden');
    requestAnimationFrame(()=>moreSheet.classList.add('open'));
    document.body.classList.add('mobile-more-open');
  }

  function closeMoreSheet(){
    if(!moreSheet)return;
    moreSheet.classList.remove('open');
    document.body.classList.remove('mobile-more-open');
    setTimeout(()=>moreSheet.classList.add('hidden'),180);
  }

  function toggleMoreSheet(){
    if(!moreSheet)return;
    moreSheet.classList.contains('hidden')||!moreSheet.classList.contains('open')?openMoreSheet():closeMoreSheet();
  }

  function syncAppVisibility(){
    if(!appNav) return;
    const app = document.querySelector('#app-view');
    const hidden=!!app?.classList.contains('hidden');
    appNav.classList.toggle('mobile-nav-suppressed', hidden);
    if(hidden)closeMoreSheet();
  }

  function mountMobileNav(){
    const original = appNav || document.querySelector('.app-nav nav');
    if(!original) return;
    appNav = original;

    if(!navAnchor && appNav.parentNode){
      navAnchor = document.createComment('avesso-mobile-nav-anchor');
      appNav.parentNode.insertBefore(navAnchor, appNav);
    }

    if(isMobile()){
      if(appNav.parentNode !== document.body) document.body.appendChild(appNav);
      appNav.classList.add('avesso-mobile-nav');
      ensureMoreUi();
      renderBadges();
      syncAppVisibility();
    }else{
      closeMoreSheet();
      moreButton?.remove();
      moreButton=null;
      moreSheet?.remove();
      moreSheet=null;
      appNav.classList.remove('avesso-mobile-nav','mobile-nav-suppressed');
      [...appNav.querySelectorAll('[data-app-tab]')].forEach(b=>b.classList.remove('mobile-primary-tab','mobile-extra-tab'));
      if(navAnchor?.parentNode && appNav.parentNode !== navAnchor.parentNode){
        navAnchor.parentNode.insertBefore(appNav, navAnchor.nextSibling);
      }
    }
  }

  function centerActiveNav(){
    if(!isMobile()) return;
    rebuildMoreSheet();
  }

  function bindNavObserver(){
    if(!appNav || navObserver) return;
    navObserver = new MutationObserver(mutations => {
      if(mutations.some(m => m.type === 'attributes' && m.attributeName === 'class')){
        centerActiveNav();
      }
    });
    navObserver.observe(appNav, {subtree:true, attributes:true, attributeFilter:['class']});
  }

  function bindAppObserver(){
    const app = document.querySelector('#app-view');
    if(!app || appObserver) return;
    appObserver = new MutationObserver(() => {
      syncAppVisibility();
      if(!app.classList.contains('hidden')) centerActiveNav();
    });
    appObserver.observe(app, {attributes:true, attributeFilter:['class']});
  }

  function syncMobileUi(){
    mountMobileNav();
    syncVisualViewport();
    syncAppVisibility();
    centerActiveNav();
  }

  document.addEventListener('click', event => {
    const tabButton=event.target.closest('[data-app-tab]');
    if(tabButton){
      vibrate(7);
      clearBadgeForTab(tabButton.dataset.appTab);
      setTimeout(() => centerActiveNav(), 0);
    }
  }, {passive:true});

  window.addEventListener('avesso:notification',event=>{
    const kind=event.detail?.kind||'interaction';
    if(kind==='message'||kind==='attention') unread.messages++;
    else unread.profile++;
    renderBadges();
    if(moreButton&&kind!=='message'&&kind!=='attention')moreButton.classList.add('has-notice');
  });

  window.addEventListener('avesso:notification-permission',syncNotificationLabel);

  document.addEventListener('focusin', syncVisualViewport);
  document.addEventListener('focusout', () => setTimeout(syncVisualViewport, 120));

  window.addEventListener('resize', syncMobileUi, {passive:true});
  media.addEventListener?.('change', syncMobileUi);
  window.visualViewport?.addEventListener('resize', syncVisualViewport, {passive:true});
  window.visualViewport?.addEventListener('scroll', syncVisualViewport, {passive:true});

  function boot(){
    mountMobileNav();
    bindNavObserver();
    bindAppObserver();
    syncMobileUi();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();
