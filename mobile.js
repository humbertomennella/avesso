/* AVESSO mobile integration 2026-10-01
   Interface própria para celular: navegação, composer, notificações,
   gestos, PWA e adaptação à viewport. */
(() => {
  const MOBILE_QUERY='(max-width: 820px)';
  const PRIMARY_TABS=new Set(['feed','plaza','messages','profile']);
  const PRIMARY_ORDER=['feed','plaza','messages','profile'];
  const NAV_META={
    feed:['◒','feed'],
    plaza:['⌂','praça'],
    messages:['↔','amigos'],
    profile:['◎','canto']
  };
  const root=document.documentElement;
  const media=window.matchMedia(MOBILE_QUERY);
  const isMobile=()=>media.matches;

  let appNav=null;
  let navAnchor=null;
  let navObserver=null;
  let appObserver=null;
  let bodyObserver=null;
  let feedObserver=null;
  let moreButton=null;
  let moreSheet=null;
  let notificationsSheet=null;
  let composer=null;
  let composerAnchor=null;
  let composerLauncher=null;
  let composerBackdrop=null;
  let deferredInstallPrompt=null;
  let pullStartY=null;
  let swipeStart=null;
  let notificationCache=[];
  let notificationHandle='';
  const unread={messages:0,profile:0,center:0};

  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];

  function vibrate(pattern=8){
    try{navigator.vibrate?.(pattern);}catch{}
  }

  function currentHandle(){
    return String(qs('#nav-handle')?.textContent||'anon').replace(/^@/,'').trim()||'anon';
  }
  function notificationStorageKey(){
    return 'avesso_mobile_notifications_v2:'+currentHandle();
  }
  function loadNotificationCache(){
    notificationHandle=currentHandle();
    try{
      const rows=JSON.parse(localStorage.getItem(notificationStorageKey())||'[]');
      notificationCache=Array.isArray(rows)?rows.slice(0,60):[];
    }catch{notificationCache=[];}
    unread.center=notificationCache.filter(n=>!n.read).length;
  }
  function syncNotificationIdentity(){
    const handle=currentHandle();
    if(handle===notificationHandle)return;
    loadNotificationCache();
    renderNotificationCenter();
    renderBadges();
  }
  function saveNotificationCache(){
    try{localStorage.setItem(notificationStorageKey(),JSON.stringify(notificationCache.slice(0,60)));}catch{}
  }
  function relativeTime(ts){
    const sec=Math.max(0,Math.floor((Date.now()-Number(ts||Date.now()))/1000));
    if(sec<60)return'agora';
    const min=Math.floor(sec/60);if(min<60)return min+'min';
    const h=Math.floor(min/60);if(h<24)return h+'h';
    const d=Math.floor(h/24);return d+'d';
  }

  function syncVisualViewport(){
    const vv=window.visualViewport;
    const height=vv?.height||window.innerHeight;
    const top=vv?.offsetTop||0;
    root.style.setProperty('--avesso-visual-height',height+'px');
    root.style.setProperty('--avesso-visual-top',top+'px');
    if(!isMobile()){
      root.classList.remove('avesso-keyboard-open');
      return;
    }
    const active=document.activeElement;
    const editing=!!active&&/^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    const viewportShrunk=vv?vv.height<window.innerHeight*.78:false;
    root.classList.toggle('avesso-keyboard-open',editing&&viewportShrunk);
  }

  function saveOriginalNav(button){
    if(!button?.dataset.mobileOriginalHtml)button.dataset.mobileOriginalHtml=button.innerHTML;
  }
  function renderPrimaryNavButton(button,tab){
    saveOriginalNav(button);
    const [icon,label]=NAV_META[tab]||['•',tab];
    button.innerHTML='<span class="mobile-nav-icon">'+icon+'</span><b class="mobile-nav-label">'+label+'</b>';
  }
  function restoreNavButton(button){
    if(button?.dataset.mobileOriginalHtml){
      button.innerHTML=button.dataset.mobileOriginalHtml;
      delete button.dataset.mobileOriginalHtml;
    }
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
    moreButton?.classList.toggle('has-notice',unread.center>0);
    const count=moreSheet?.querySelector('[data-notification-center-count]');
    if(count){
      count.textContent=unread.center>99?'99+':String(unread.center||'');
      count.classList.toggle('hidden',!unread.center);
    }
  }
  function clearBadgeForTab(tab){
    if(tab==='messages')unread.messages=0;
    if(tab==='profile')unread.profile=0;
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

  function notificationDestination(kind='interaction'){
    if(kind==='message'||kind==='attention')return'messages';
    if(kind==='friend'||kind==='guestbook'||kind==='photo')return'profile';
    return'feed';
  }
  function openNotificationTarget(kind){
    const tab=notificationDestination(kind);
    document.querySelector('[data-app-tab="'+tab+'"]')?.click();
  }
  function rememberNotification(detail={}){
    const row={
      id:String(Date.now())+'-'+Math.random().toString(36).slice(2,7),
      kind:String(detail.kind||'interaction'),
      title:String(detail.title||'AVESSO').slice(0,140),
      body:String(detail.body||'').slice(0,260),
      createdAt:Date.now(),
      read:false
    };
    notificationCache.unshift(row);
    notificationCache=notificationCache.slice(0,60);
    unread.center=notificationCache.filter(n=>!n.read).length;
    saveNotificationCache();
    renderBadges();
    renderNotificationCenter();
  }

  function ensureNotificationCenter(){
    if(notificationsSheet)return notificationsSheet;
    notificationsSheet=document.createElement('section');
    notificationsSheet.className='mobile-notification-center hidden';
    notificationsSheet.innerHTML='<header><div><small>AVESSO // NOTIFICAÇÕES</small><b>aconteceu enquanto você tinha uma vida</b></div><button type="button" data-notification-center-close aria-label="Fechar">×</button></header><div class="mobile-notification-list"></div><footer><button type="button" data-notification-clear>limpar histórico</button></footer>';
    document.body.appendChild(notificationsSheet);
    notificationsSheet.querySelector('[data-notification-center-close]').onclick=closeNotificationCenter;
    notificationsSheet.querySelector('[data-notification-clear]').onclick=()=>{
      notificationCache=[];
      unread.center=0;
      saveNotificationCache();
      renderNotificationCenter();
      renderBadges();
    };
    notificationsSheet.addEventListener('click',e=>{
      const item=e.target.closest('[data-notification-item]');
      if(!item)return;
      const row=notificationCache.find(n=>n.id===item.dataset.notificationItem);
      if(row){
        row.read=true;
        saveNotificationCache();
        unread.center=notificationCache.filter(n=>!n.read).length;
        renderBadges();
        closeNotificationCenter();
        openNotificationTarget(row.kind);
      }
    });
    renderNotificationCenter();
    return notificationsSheet;
  }
  function renderNotificationCenter(){
    if(!notificationsSheet)return;
    const list=notificationsSheet.querySelector('.mobile-notification-list');
    if(!list)return;
    list.innerHTML=notificationCache.length?notificationCache.map(n=>
      '<button type="button" class="mobile-notification-item '+(n.read?'':'unread')+'" data-notification-item="'+n.id+'">'+
      '<i>'+({message:'↔',attention:'⚡',friend:'+',guestbook:'▤',story:'◫',interaction:'♥'}[n.kind]||'•')+'</i>'+
      '<span><b>'+escapeMobile(n.title)+'</b><em>'+escapeMobile(n.body)+'</em><small>'+relativeTime(n.createdAt)+'</small></span></button>'
    ).join(''):'<div class="mobile-notification-empty">Nada pendente. A internet sobreviveu sem você por alguns minutos.</div>';
  }
  function escapeMobile(value=''){
    return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function openNotificationCenter(){
    ensureNotificationCenter();
    closeMoreSheet();
    notificationCache.forEach(n=>n.read=true);
    unread.center=0;
    saveNotificationCache();
    renderNotificationCenter();
    renderBadges();
    notificationsSheet.classList.remove('hidden');
    requestAnimationFrame(()=>notificationsSheet.classList.add('open'));
    document.body.classList.add('mobile-sheet-open');
    vibrate(10);
  }
  function closeNotificationCenter(){
    if(!notificationsSheet)return;
    notificationsSheet.classList.remove('open');
    document.body.classList.remove('mobile-sheet-open');
    setTimeout(()=>notificationsSheet?.classList.add('hidden'),170);
  }

  function syncInstallButton(){
    const button=moreSheet?.querySelector('[data-install-avesso]');
    if(!button)return;
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
    button.classList.toggle('hidden',standalone||!deferredInstallPrompt);
  }

  function ensureMoreUi(){
    if(!appNav)return;
    if(!moreButton){
      moreButton=document.createElement('button');
      moreButton.type='button';
      moreButton.className='mobile-nav-more';
      moreButton.dataset.mobileMore='1';
      moreButton.innerHTML='<span class="mobile-nav-icon">•••</span><b class="mobile-nav-label">mais</b><i class="mobile-nav-more-dot"></i>';
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
      moreSheet.innerHTML='<header><div><small>AVESSO // ATALHOS</small><b>mais lugares para se perder</b></div><button type="button" data-mobile-more-close aria-label="Fechar">×</button></header>'+
        '<button type="button" class="mobile-notification-row mobile-notification-center-link" data-open-notification-center><i>◉</i><span>central de notificações</span><b data-notification-center-count class="hidden">0</b></button>'+
        '<div class="mobile-more-grid"></div>'+
        '<button type="button" class="mobile-notification-row hidden" data-install-avesso><i>▣</i><span>instalar AVESSO no celular</span></button>'+
        '<button type="button" class="mobile-notification-row" data-mobile-notifications><i>●</i><span>ativar notificações no celular</span></button>';
      document.body.appendChild(moreSheet);
      moreSheet.querySelector('[data-mobile-more-close]').onclick=closeMoreSheet;
      moreSheet.querySelector('[data-open-notification-center]').onclick=openNotificationCenter;
      moreSheet.querySelector('[data-mobile-notifications]').onclick=()=>{
        vibrate(12);
        window.dispatchEvent(new CustomEvent('avesso:request-notifications'));
      };
      moreSheet.querySelector('[data-install-avesso]').onclick=async()=>{
        if(!deferredInstallPrompt)return;
        vibrate(12);
        deferredInstallPrompt.prompt();
        try{await deferredInstallPrompt.userChoice;}catch{}
        deferredInstallPrompt=null;
        syncInstallButton();
      };
    }
    rebuildMoreSheet();
    syncNotificationLabel();
    syncInstallButton();
    renderBadges();
  }

  function rebuildMoreSheet(){
    if(!appNav||!moreSheet)return;
    const grid=moreSheet.querySelector('.mobile-more-grid');
    grid.innerHTML='';
    [...appNav.querySelectorAll('[data-app-tab]')].forEach(original=>{
      const tab=original.dataset.appTab;
      saveOriginalNav(original);
      original.classList.toggle('mobile-primary-tab',PRIMARY_TABS.has(tab));
      original.classList.toggle('mobile-extra-tab',!PRIMARY_TABS.has(tab));
      if(PRIMARY_TABS.has(tab)){
        renderPrimaryNavButton(original,tab);
        return;
      }
      if(original.classList.contains('hidden'))return;
      const proxy=document.createElement('button');
      proxy.type='button';
      proxy.className='mobile-more-item';
      proxy.dataset.mobileProxy=tab;
      const raw=original.dataset.mobileOriginalHtml||original.textContent||tab;
      proxy.innerHTML='<span>'+raw+'</span><i>›</i>';
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
      const label=moreButton.querySelector('.mobile-nav-label');
      if(label)label.textContent=activeExtra?'mais':'mais';
    }
    renderBadges();
  }

  function openMoreSheet(){
    if(!moreSheet)return;
    closeNotificationCenter();
    closeComposer();
    rebuildMoreSheet();
    syncNotificationLabel();
    syncInstallButton();
    moreSheet.classList.remove('hidden');
    requestAnimationFrame(()=>moreSheet.classList.add('open'));
    document.body.classList.add('mobile-more-open','mobile-sheet-open');
  }
  function closeMoreSheet(){
    if(!moreSheet)return;
    moreSheet.classList.remove('open');
    document.body.classList.remove('mobile-more-open','mobile-sheet-open');
    setTimeout(()=>moreSheet?.classList.add('hidden'),180);
  }
  function toggleMoreSheet(){
    if(!moreSheet)return;
    moreSheet.classList.contains('hidden')||!moreSheet.classList.contains('open')?openMoreSheet():closeMoreSheet();
  }

  function ensureComposer(){
    composer=composer||document.querySelector('.composer');
    if(!composer)return;
    if(!composerAnchor&&composer.parentNode){
      composerAnchor=document.createComment('avesso-mobile-composer-anchor');
      composer.parentNode.insertBefore(composerAnchor,composer);
    }
    if(!composerLauncher){
      composerLauncher=document.createElement('button');
      composerLauncher.type='button';
      composerLauncher.className='mobile-composer-launcher';
      composerLauncher.innerHTML='<span class="mobile-composer-avatar">'+(qs('#nav-avatar')?.innerHTML||'▼')+'</span><span><b>publique algo</b><small>texto, foto, GIF, música ou vídeo</small></span><i>＋</i>';
      const stories=qs('#stories-zone');
      (stories?.parentNode||composerAnchor.parentNode)?.insertBefore(composerLauncher,(stories?.nextSibling)||composerAnchor);
      composerLauncher.onclick=openComposer;
    }
    if(!composerBackdrop){
      composerBackdrop=document.createElement('button');
      composerBackdrop.type='button';
      composerBackdrop.className='mobile-composer-backdrop hidden';
      composerBackdrop.setAttribute('aria-label','Fechar publicação');
      composerBackdrop.onclick=closeComposer;
      document.body.appendChild(composerBackdrop);
    }
    if(!composer.querySelector('.mobile-composer-head')){
      const head=document.createElement('header');
      head.className='mobile-composer-head';
      head.innerHTML='<div><small>POST.EXE</small><b>coloque alguma coisa no mundo</b></div><button type="button" aria-label="Fechar">×</button>';
      head.querySelector('button').onclick=closeComposer;
      composer.prepend(head);
    }
    if(isMobile()){
      const firstMobileMount=!composer.classList.contains('mobile-composer-sheet');
      if(composer.parentNode!==document.body)document.body.appendChild(composer);
      composer.classList.add('mobile-composer-sheet');
      if(firstMobileMount)composer.classList.add('mobile-composer-closed');
    }else{
      closeComposer();
      composer.classList.remove('mobile-composer-sheet','mobile-composer-closed');
      composer.querySelector('.mobile-composer-head')?.remove();
      composerLauncher?.remove();composerLauncher=null;
      composerBackdrop?.remove();composerBackdrop=null;
      if(composerAnchor?.parentNode&&composer.parentNode!==composerAnchor.parentNode)composerAnchor.parentNode.insertBefore(composer,composerAnchor.nextSibling);
    }
    syncComposerVisibility();
  }
  function syncComposerVisibility(){
    if(!composerLauncher||!composer)return;
    const onFeed=document.body.classList.contains('avesso-feed-home')&&!qs('#app-view')?.classList.contains('hidden');
    composerLauncher.classList.toggle('hidden',!onFeed);
    if(!onFeed)closeComposer();
  }
  function openComposer(){
    if(!isMobile()||!composer||!document.body.classList.contains('avesso-feed-home'))return;
    closeMoreSheet();closeNotificationCenter();
    composer.classList.remove('mobile-composer-closed');
    composerBackdrop?.classList.remove('hidden');
    document.body.classList.add('mobile-composer-open','mobile-sheet-open');
    vibrate(9);
    setTimeout(()=>qs('#post-body')?.focus(),100);
  }
  function closeComposer(){
    if(!composer)return;
    composer.classList.add('mobile-composer-closed');
    composerBackdrop?.classList.add('hidden');
    document.body.classList.remove('mobile-composer-open','mobile-sheet-open');
  }
  function watchPublish(){
    const publish=qs('#publish-post');
    if(!publish||publish.dataset.mobilePublishWatch)return;
    publish.dataset.mobilePublishWatch='1';
    publish.addEventListener('click',()=>{
      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        const body=String(qs('#post-body')?.value||'').trim();
        const image=qs('#post-image')?.files?.length;
        const media=String(qs('#post-media-link')?.value||'').trim();
        const gif=String(qs('#post-gif-url')?.value||'').trim();
        if(!body&&!image&&!media&&!gif){clearInterval(timer);closeComposer();}
        else if(tries>20)clearInterval(timer);
      },120);
    });
  }

  function enhanceProfile(){
    if(!isMobile())return;
    const control=qs('.profile-control');
    if(!control||qs('.mobile-profile-edit-toggle',control))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='mobile-profile-edit-toggle';
    button.innerHTML='<span>⚙</span><b>editar meu Canto</b><i>›</i>';
    const stories=qs('.profile-story-section',control);
    (stories||control.firstElementChild)?.insertAdjacentElement('afterend',button);
    button.onclick=()=>{
      const open=document.body.classList.toggle('mobile-profile-edit-open');
      button.classList.toggle('active',open);
      button.querySelector('b').textContent=open?'fechar edição':'editar meu Canto';
      button.querySelector('i').textContent=open?'⌃':'›';
      if(open)setTimeout(()=>qs('.profile-settings-grid')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
      vibrate(8);
    };
  }

  function bindFeedObserver(){
    const list=qs('#feed-list');
    if(!list||feedObserver)return;
    feedObserver=new MutationObserver(()=>{
      enhanceProfile();
      syncFeedLoading();
    });
    feedObserver.observe(list,{childList:true,subtree:false});
  }
  function syncFeedLoading(){
    const status=qs('#feed-status');
    const loading=document.body.classList.contains('avesso-feed-home')&&status&&!status.classList.contains('hidden')&&/carregando|conectando/i.test(status.textContent||'');
    document.body.classList.toggle('mobile-feed-loading',Boolean(loading));
  }

  function ensurePullIndicator(){
    let el=qs('#mobile-pull-indicator');
    if(!el){
      el=document.createElement('div');
      el.id='mobile-pull-indicator';
      el.className='mobile-pull-indicator';
      el.textContent='↓ puxe para atualizar';
      document.body.appendChild(el);
    }
    return el;
  }
  function bindPullToRefresh(){
    document.addEventListener('touchstart',e=>{
      if(!isMobile()||!document.body.classList.contains('avesso-feed-home')||window.scrollY>2)return;
      if(e.target.closest('input,textarea,select,button,a,.stories-strip,.reaction-shell,.mobile-composer-sheet,.dm-floating-window,dialog'))return;
      pullStartY=e.touches?.[0]?.clientY??null;
    },{passive:true});
    document.addEventListener('touchmove',e=>{
      if(pullStartY==null)return;
      const y=e.touches?.[0]?.clientY??pullStartY;
      const delta=y-pullStartY;
      const indicator=ensurePullIndicator();
      indicator.classList.toggle('ready',delta>78);
      indicator.classList.toggle('visible',delta>22);
      indicator.textContent=delta>78?'↻ solte para atualizar':'↓ puxe para atualizar';
    },{passive:true});
    document.addEventListener('touchend',e=>{
      if(pullStartY==null)return;
      const y=e.changedTouches?.[0]?.clientY??pullStartY;
      const delta=y-pullStartY;
      pullStartY=null;
      const indicator=ensurePullIndicator();
      indicator.classList.remove('visible','ready');
      if(delta>78&&window.scrollY<4){
        vibrate([8,25,8]);
        qs('#refresh-feed')?.click();
      }
    },{passive:true});
  }

  function bindPrimarySwipe(){
    document.addEventListener('pointerdown',e=>{
      if(!isMobile()||e.pointerType==='mouse'||!e.target.closest('#app-view'))return;
      if(e.target.closest('button,a,input,textarea,select,dialog,.dm-floating-window,.stories-strip,.profile-story-list,.plaza-chat-room,.mobile-composer-sheet,.reaction-shell,.post-image'))return;
      swipeStart={x:e.clientX,y:e.clientY,t:Date.now()};
    },{passive:true});
    document.addEventListener('pointerup',e=>{
      if(!swipeStart||!isMobile())return;
      const start=swipeStart;swipeStart=null;
      const dx=e.clientX-start.x,dy=e.clientY-start.y,dt=Date.now()-start.t;
      if(dt>650||Math.abs(dx)<92||Math.abs(dy)>62||Math.abs(dx)<Math.abs(dy)*1.4)return;
      const active=qsa('.avesso-mobile-nav [data-app-tab].active').find(b=>PRIMARY_TABS.has(b.dataset.appTab));
      if(!active)return;
      const index=PRIMARY_ORDER.indexOf(active.dataset.appTab);
      const nextIndex=dx<0?index+1:index-1;
      if(nextIndex<0||nextIndex>=PRIMARY_ORDER.length)return;
      vibrate(7);
      appNav?.querySelector('[data-app-tab="'+PRIMARY_ORDER[nextIndex]+'"]')?.click();
    },{passive:true});
  }

  function applyStartupHash(){
    if(!isMobile())return;
    const hash=location.hash.toLowerCase();
    const map={
      '#para-cuidar':'feed','#feed':'feed',
      '#praca':'plaza','#praca-central':'plaza',
      '#amigos':'messages','#mensagens':'messages',
      '#seu-canto':'profile','#canto':'profile'
    };
    const tab=map[hash];if(!tab)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const button=appNav?.querySelector('[data-app-tab="'+tab+'"]');
      if(button&&!qs('#app-view')?.classList.contains('hidden')){
        clearInterval(timer);button.click();
      }else if(tries>30)clearInterval(timer);
    },120);
  }

  function syncAppVisibility(){
    if(!appNav)return;
    const app=qs('#app-view');
    const hidden=!!app?.classList.contains('hidden');
    appNav.classList.toggle('mobile-nav-suppressed',hidden);
    if(hidden){closeMoreSheet();closeNotificationCenter();closeComposer();}
  }

  function mountMobileNav(){
    const original=appNav||document.querySelector('.app-nav nav');
    if(!original)return;
    appNav=original;
    if(!navAnchor&&appNav.parentNode){
      navAnchor=document.createComment('avesso-mobile-nav-anchor');
      appNav.parentNode.insertBefore(navAnchor,appNav);
    }
    if(isMobile()){
      if(appNav.parentNode!==document.body)document.body.appendChild(appNav);
      appNav.classList.add('avesso-mobile-nav');
      ensureMoreUi();
      qsa('[data-app-tab]',appNav).forEach(b=>{
        const tab=b.dataset.appTab;
        if(PRIMARY_TABS.has(tab))renderPrimaryNavButton(b,tab);
      });
      renderBadges();
      syncAppVisibility();
    }else{
      closeMoreSheet();closeNotificationCenter();
      moreButton?.remove();moreButton=null;
      moreSheet?.remove();moreSheet=null;
      notificationsSheet?.remove();notificationsSheet=null;
      appNav.classList.remove('avesso-mobile-nav','mobile-nav-suppressed');
      qsa('[data-app-tab]',appNav).forEach(b=>{
        b.classList.remove('mobile-primary-tab','mobile-extra-tab');
        restoreNavButton(b);
      });
      if(navAnchor?.parentNode&&appNav.parentNode!==navAnchor.parentNode)navAnchor.parentNode.insertBefore(appNav,navAnchor.nextSibling);
    }
  }

  function centerActiveNav(){
    if(!isMobile())return;
    rebuildMoreSheet();
  }
  function bindNavObserver(){
    if(!appNav||navObserver)return;
    navObserver=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.type==='attributes'&&m.attributeName==='class'))centerActiveNav();
    });
    navObserver.observe(appNav,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  function bindAppObserver(){
    const app=qs('#app-view');
    if(!app||appObserver)return;
    appObserver=new MutationObserver(()=>{
      syncAppVisibility();
      syncComposerVisibility();
      if(!app.classList.contains('hidden')){
        syncNotificationIdentity();
        centerActiveNav();
      }
    });
    appObserver.observe(app,{attributes:true,attributeFilter:['class']});
  }
  function bindBodyObserver(){
    if(bodyObserver)return;
    bodyObserver=new MutationObserver(()=>{
      syncComposerVisibility();
      enhanceProfile();
      syncFeedLoading();
      if(!document.body.classList.contains('avesso-own-corner'))document.body.classList.remove('mobile-profile-edit-open');
    });
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  }

  function syncMobileUi(){
    mountMobileNav();
    ensureComposer();
    syncVisualViewport();
    syncAppVisibility();
    syncComposerVisibility();
    centerActiveNav();
    enhanceProfile();
    syncFeedLoading();
  }

  document.addEventListener('click',event=>{
    const tabButton=event.target.closest('[data-app-tab]');
    if(tabButton){
      vibrate(7);
      clearBadgeForTab(tabButton.dataset.appTab);
      setTimeout(centerActiveNav,0);
    }
  },{passive:true});

  window.addEventListener('avesso:notification',event=>{
    const detail=event.detail||{};
    const kind=detail.kind||'interaction';
    if(kind==='message'||kind==='attention')unread.messages++;
    else unread.profile++;
    rememberNotification(detail);
    renderBadges();
  });
  window.addEventListener('avesso:notification-permission',syncNotificationLabel);

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferredInstallPrompt=e;
    syncInstallButton();
  });
  window.addEventListener('appinstalled',()=>{
    deferredInstallPrompt=null;
    syncInstallButton();
  });

  document.addEventListener('focusin',syncVisualViewport);
  document.addEventListener('focusout',()=>setTimeout(syncVisualViewport,120));
  window.addEventListener('resize',syncMobileUi,{passive:true});
  media.addEventListener?.('change',syncMobileUi);
  window.visualViewport?.addEventListener('resize',syncVisualViewport,{passive:true});
  window.visualViewport?.addEventListener('scroll',syncVisualViewport,{passive:true});
  window.addEventListener('hashchange',applyStartupHash);

  async function registerPwaShell(){
    if(!('serviceWorker' in navigator))return;
    try{await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});}catch{}
  }

  function boot(){
    loadNotificationCache();
    mountMobileNav();
    ensureComposer();
    watchPublish();
    bindNavObserver();
    bindAppObserver();
    bindBodyObserver();
    bindFeedObserver();
    bindPullToRefresh();
    bindPrimarySwipe();
    syncMobileUi();
    registerPwaShell();
    setTimeout(applyStartupHash,350);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
