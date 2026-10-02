/* AVESSO Mobile UX Layer
   Additive and fail-safe: this file never blocks app.js/mobile.js boot. */
(() => {
  'use strict';

  const MQ='(max-width: 820px)';
  const PRIMARY=['feed','plaza','messages','profile'];
  const isMobile=()=>window.matchMedia?.(MQ).matches;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const vibrate=(p=8)=>{try{navigator.vibrate?.(p);}catch{}};

  let installPrompt=null;
  let composerBound=false;
  let draftBound=false;
  let pullStart=null;
  let swipeStart=null;
  let notificationRows=[];
  let currentNotificationKey='';
  let notificationFilter='all';
  let feedMoreObserver=null;
  let observedLoadMore=null;
  let syncQueued=false;

  const escapeHtml=(value='')=>String(value).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));

  function userKey(){
    const handle=String(q('#nav-handle')?.textContent||'anon').trim().replace(/^@/,'')||'anon';
    return 'avesso_mobile_center_v1:'+handle;
  }

  function loadNotifications(){
    const key=userKey();
    if(key===currentNotificationKey)return;
    currentNotificationKey=key;
    try{
      const parsed=JSON.parse(localStorage.getItem(key)||'[]');
      const cutoff=Date.now()-30*24*60*60*1000;
      notificationRows=Array.isArray(parsed)?parsed.filter(row=>Number(row?.createdAt||0)>=cutoff).slice(0,100):[];
    }catch{notificationRows=[];}
    renderNotificationBadge();
    renderNotificationCenter();
  }

  function persistNotifications(){
    try{localStorage.setItem(currentNotificationKey||userKey(),JSON.stringify(notificationRows.slice(0,100)));}catch{}
  }

  function unreadCount(){
    return notificationRows.filter(x=>!x.read).length;
  }

  function timeAgo(ts){
    const seconds=Math.max(0,Math.floor((Date.now()-Number(ts||Date.now()))/1000));
    if(seconds<60)return'agora';
    const minutes=Math.floor(seconds/60);
    if(minutes<60)return minutes+'min';
    const hours=Math.floor(minutes/60);
    if(hours<24)return hours+'h';
    return Math.floor(hours/24)+'d';
  }

  function destinationFor(kind='interaction'){
    if(kind==='message'||kind==='attention')return'messages';
    if(kind==='friend'||kind==='guestbook'||kind==='photo')return'profile';
    return'feed';
  }

  function openDestination(kind){
    closeNotificationCenter();
    const tab=destinationFor(kind);
    q('[data-app-tab="'+tab+'"]')?.click();
  }

  function targetFromUrl(url=''){
    try{
      const parsed=new URL(url,location.href);
      const open=parsed.searchParams.get('open');
      const id=parsed.searchParams.get('id');
      if(open&&id&&/^(post|story|photo|chat|profile)$/i.test(open))return{type:open.toLowerCase(),id};
      const hash=parsed.hash.replace(/^#/,'');
      const match=hash.match(/^(post|story|photo|chat|profile)\/([^/?#]+)/i);
      return match?{type:match[1].toLowerCase(),id:decodeURIComponent(match[2])}:null;
    }catch{return null;}
  }

  function rememberNotification(detail={}){
    loadNotifications();
    const createdAt=Number(detail.createdAt||Date.now());
    const kind=String(detail.kind||'interaction');
    const title=String(detail.title||'AVESSO').slice(0,140);
    const body=String(detail.body||'').slice(0,260);
    const avatar=String(detail.avatar||'').slice(0,1200);
    const target=detail.target||targetFromUrl(detail.url)||null;
    const targetKey=target?.type&&target?.id?`${target.type}:${target.id}`:'';
    const dedupeKey=String(detail.dedupeKey||[kind,targetKey,title,body].join('|')).toLowerCase();
    const existingIndex=notificationRows.findIndex(row=>
      row.dedupeKey===dedupeKey&&
      createdAt-Number(row.createdAt||0)<15000
    );
    if(existingIndex>=0){
      const existing=notificationRows.splice(existingIndex,1)[0];
      notificationRows.unshift({
        ...existing,
        kind,title,body,avatar,target,dedupeKey,
        createdAt,
        read:false,
        repeat:Number(existing.repeat||1)+1
      });
    }else{
      notificationRows.unshift({
        id:String(createdAt)+'-'+Math.random().toString(36).slice(2,7),
        kind,title,body,avatar,createdAt,target,dedupeKey,
        read:false,
        repeat:1
      });
    }
    notificationRows=notificationRows.slice(0,100);
    persistNotifications();
    renderNotificationBadge();
    renderNotificationCenter();
  }

  function ensureNotificationCenter(){
    let sheet=q('#mobile-ux-notification-center');
    if(sheet)return sheet;
    sheet=document.createElement('section');
    sheet.id='mobile-ux-notification-center';
    sheet.className='mobile-ux-notification-center hidden';
    sheet.setAttribute('role','region');
    sheet.setAttribute('aria-label','Central de notificações');
    sheet.setAttribute('aria-hidden','true');
    sheet.innerHTML=`
      <header>
        <div><small>AVESSO // NOTIFICAÇÕES</small><b>aconteceu enquanto você tinha uma vida</b></div>
        <button type="button" data-mobile-center-close aria-label="Fechar">×</button>
      </header>
      <nav class="mobile-ux-notification-filters">
        <button type="button" class="active" data-notification-filter="all">tudo</button>
        <button type="button" data-notification-filter="messages">mensagens</button>
        <button type="button" data-notification-filter="reactions">reações</button>
        <button type="button" data-notification-filter="people">pessoas</button>
      </nav>
      <div class="mobile-ux-notification-list"></div>
      <footer><button type="button" data-mobile-center-read>marcar tudo como lido</button><button type="button" data-mobile-center-clear>limpar histórico</button></footer>`;
    document.body.appendChild(sheet);
    q('[data-mobile-center-close]',sheet).onclick=closeNotificationCenter;
    qa('[data-notification-filter]',sheet).forEach((button,index)=>button.setAttribute('aria-pressed',String(index===0)));
    qa('[data-notification-filter]',sheet).forEach(button=>button.onclick=()=>{
      notificationFilter=button.dataset.notificationFilter||'all';
      qa('[data-notification-filter]',sheet).forEach(x=>{
        const active=x===button;
        x.classList.toggle('active',active);
        x.setAttribute('aria-pressed',String(active));
      });
      renderNotificationCenter();
    });
    q('[data-mobile-center-read]',sheet).onclick=()=>{
      notificationRows.forEach(row=>row.read=true);
      persistNotifications();
      renderNotificationCenter();
      renderNotificationBadge();
    };
    q('[data-mobile-center-clear]',sheet).onclick=()=>{
      notificationRows=[];
      persistNotifications();
      renderNotificationCenter();
      renderNotificationBadge();
    };
    sheet.addEventListener('click',e=>{
      const item=e.target.closest('[data-mobile-notification-id]');
      if(!item)return;
      const row=notificationRows.find(x=>x.id===item.dataset.mobileNotificationId);
      if(!row)return;
      row.read=true;
      persistNotifications();
      renderNotificationBadge();
      closeNotificationCenter();
      if(row.target)window.dispatchEvent(new CustomEvent('avesso:open-target',{detail:{target:row.target}}));
      else openDestination(row.kind);
    });
    return sheet;
  }

  function renderNotificationCenter(){
    const sheet=q('#mobile-ux-notification-center');
    if(!sheet)return;
    const list=q('.mobile-ux-notification-list',sheet);
    if(!list)return;
    const filtered=notificationRows.filter(row=>{
      if(notificationFilter==='messages')return row.kind==='message'||row.kind==='attention';
      if(notificationFilter==='reactions')return ['interaction','story','photo'].includes(row.kind);
      if(notificationFilter==='people')return row.kind==='friend'||row.kind==='guestbook';
      return true;
    });
    if(!filtered.length){
      list.innerHTML='<div class="mobile-ux-notification-empty">Nada aqui. O filtro encontrou paz.</div>';
      return;
    }
    const icons={message:'↔',attention:'⚡',friend:'+',guestbook:'▤',story:'◫',photo:'▧',interaction:'♥'};
    const groups=[];
    const index=new Map();
    filtered.forEach(row=>{
      const canGroup=['interaction','story','photo'].includes(row.kind)&&row.target?.type&&row.target?.id;
      const key=canGroup?`${row.kind}:${row.target.type}:${row.target.id}`:`row:${row.id}`;
      if(canGroup&&index.has(key)){
        const group=groups[index.get(key)];
        group.count++;
        group.read=group.read&&row.read;
        if(row.createdAt>group.createdAt){group.createdAt=row.createdAt;group.body=row.body;group.id=row.id;}
      }else{
        index.set(key,groups.length);
        groups.push({...row,count:1});
      }
    });
    list.innerHTML=groups.map(row=>{
      const groupedTitle=row.count>1?`${row.count} interações recentes`:row.title;
      return `<button type="button" class="mobile-ux-notification-item ${row.read?'':'unread'}" data-mobile-notification-id="${row.id}">
        <i>${icons[row.kind]||'•'}</i>
        <span><b>${escapeHtml(groupedTitle)}</b><em>${escapeHtml(row.body)}</em><small>${timeAgo(row.createdAt)}</small></span>
      </button>`;
    }).join('');
  }

  function renderNotificationBadge(){
    const count=unreadCount();
    const more=q('.mobile-nav-more');
    if(more)more.classList.toggle('has-notice',count>0);
    const row=q('[data-mobile-ux-notifications]');
    const badge=row?.querySelector('b');
    if(badge){
      badge.textContent=count>99?'99+':String(count);
      badge.classList.toggle('hidden',count===0);
    }
  }

  function openNotificationCenter(){
    loadNotifications();
    dismissBaseMoreSheet();
    const sheet=ensureNotificationCenter();
    notificationRows.forEach(x=>x.read=true);
    persistNotifications();
    renderNotificationCenter();
    renderNotificationBadge();
    sheet.classList.remove('hidden');
    requestAnimationFrame(()=>sheet.classList.add('open'));
    document.body.classList.add('mobile-ux-sheet-open');
    vibrate(10);
  }

  function closeNotificationCenter(){
    const sheet=q('#mobile-ux-notification-center');
    if(!sheet)return;
    sheet.classList.remove('open');
    document.body.classList.remove('mobile-ux-sheet-open');
    setTimeout(()=>sheet.classList.add('hidden'),170);
  }

  function enhanceMoreSheet(){
    if(!isMobile())return;
    const sheet=q('#avesso-mobile-more-sheet');
    if(!sheet)return;
    if(!q('[data-mobile-ux-notifications]',sheet)){
      const permission=q('[data-mobile-notifications]',sheet);
      const search=document.createElement('button');
      search.type='button';
      search.className='mobile-notification-row mobile-ux-search-link';
      search.innerHTML='<i>⌕</i><span>BUSCAR.EXE</span>';
      search.onclick=()=>{dismissBaseMoreSheet();window.dispatchEvent(new CustomEvent('avesso:open-search'));};
      permission?.before(search);

      const now=document.createElement('button');
      now.type='button';
      now.className='mobile-notification-row mobile-ux-now-link';
      now.innerHTML='<i>◉</i><span>AGORA.EXE // ao vivo</span>';
      now.onclick=()=>{dismissBaseMoreSheet();window.dispatchEvent(new CustomEvent('avesso:open-now'));};
      permission?.before(now);

      const center=document.createElement('button');
      center.type='button';
      center.className='mobile-notification-row mobile-ux-center-link';
      center.dataset.mobileUxNotifications='1';
      center.innerHTML='<i>▤</i><span>central de notificações</span><b class="hidden">0</b>';
      center.onclick=openNotificationCenter;
      permission?.before(center);

      const install=document.createElement('button');
      install.type='button';
      install.className='mobile-notification-row mobile-ux-install hidden';
      install.dataset.mobileUxInstall='1';
      install.innerHTML='<i>▣</i><span>instalar AVESSO no celular</span>';
      install.onclick=async()=>{
        if(!installPrompt)return;
        vibrate(12);
        try{
          installPrompt.prompt();
          await installPrompt.userChoice;
        }catch{}
        installPrompt=null;
        syncInstallButton();
      };
      permission?.before(install);
    }
    const adminVisible=!q('#admin-nav-button')?.classList.contains('hidden');
    let health=q('[data-mobile-ux-health]',sheet);
    if(adminVisible&&!health){
      health=document.createElement('button');
      health.type='button';
      health.className='mobile-notification-row mobile-ux-health-link';
      health.dataset.mobileUxHealth='1';
      health.innerHTML='<i>＋</i><span>HEALTH.EXE // saúde do sistema</span>';
      health.onclick=()=>{dismissBaseMoreSheet();window.dispatchEvent(new CustomEvent('avesso:open-health'));};
      q('[data-mobile-notifications]',sheet)?.before(health);
    }else if(health){
      health.classList.toggle('hidden',!adminVisible);
    }
    renderNotificationBadge();
    syncInstallButton();
  }

  function syncInstallButton(){
    const button=q('[data-mobile-ux-install]');
    if(!button)return;
    const standalone=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
    button.classList.toggle('hidden',standalone||!installPrompt);
  }

  function draftKey(){
    return 'avesso_post_draft_v1:'+String(q('#nav-handle')?.textContent||'anon').replace(/^@/,'');
  }
  function bindComposerDraft(){
    if(draftBound)return;
    const body=q('#post-body');if(!body)return;
    draftBound=true;
    try{
      const saved=JSON.parse(localStorage.getItem(draftKey())||'null');
      if(saved?.body&&!body.value)body.value=String(saved.body).slice(0,420);
    }catch{}
    body.addEventListener('input',()=>{
      try{
        const value=body.value||'';
        if(value.trim())localStorage.setItem(draftKey(),JSON.stringify({body:value,savedAt:Date.now()}));
        else localStorage.removeItem(draftKey());
      }catch{}
    });
    q('#publish-post')?.addEventListener('click',()=>{
      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        if(!String(body.value||'').trim()){
          clearInterval(timer);
          try{localStorage.removeItem(draftKey());}catch{}
        }else if(tries>20)clearInterval(timer);
      },120);
    });
  }

  function syncNetworkIndicator(){
    if(!isMobile())return;
    let el=q('#mobile-network-state');
    if(!el){
      el=document.createElement('div');
      el.id='mobile-network-state';
      el.className='mobile-network-state hidden';
      document.body.appendChild(el);
    }
    const offline=navigator.onLine===false;
    el.classList.toggle('hidden',!offline);
    el.textContent=offline?'SEM REDE // usando o que ficou salvo neste aparelho':'';
    document.body.classList.toggle('avesso-offline',offline);
  }

  function ensureComposerLauncher(){
    if(!isMobile())return;
    const composer=q('.composer');
    const stories=q('#stories-zone');
    if(!composer||!stories)return;

    composer.classList.add('mobile-ux-composer');

    if(!q('.mobile-ux-composer-head',composer)){
      const head=document.createElement('header');
      head.className='mobile-ux-composer-head';
      head.innerHTML='<div><small>POST.EXE</small><b>coloque alguma coisa no mundo</b></div><button type="button" aria-label="Fechar">×</button>';
      q('button',head).onclick=closeComposer;
      composer.prepend(head);
    }

    let launcher=q('#mobile-ux-composer-launcher');
    if(!launcher){
      launcher=document.createElement('button');
      launcher.id='mobile-ux-composer-launcher';
      launcher.type='button';
      launcher.className='mobile-ux-composer-launcher';
      launcher.innerHTML='<span class="mobile-ux-launcher-avatar">▼</span><span><b>publique algo</b><small>texto, foto, GIF, música ou vídeo</small></span><i>＋</i>';
      stories.insertAdjacentElement('afterend',launcher);
      launcher.onclick=openComposer;
    }

    syncLauncherAvatar();
    syncComposerVisibility();

    if(!composerBound){
      composerBound=true;
      q('#publish-post')?.addEventListener('click',()=>{
        let checks=0;
        const timer=setInterval(()=>{
          checks++;
          const body=String(q('#post-body')?.value||'').trim();
          const fileCount=q('#post-image')?.files?.length||0;
          const gif=String(q('#post-gif-url')?.value||'').trim();
          const media=String(q('#post-media-link')?.value||'').trim();
          if(!body&&!fileCount&&!gif&&!media){
            clearInterval(timer);
            closeComposer();
          }else if(checks>18)clearInterval(timer);
        },140);
      });
    }
  }

  function syncLauncherAvatar(){
    const target=q('.mobile-ux-launcher-avatar');
    const source=q('#nav-avatar');
    if(target&&source)target.innerHTML=source.innerHTML;
  }

  function onFeed(){
    return document.body.classList.contains('avesso-feed-home')&&!q('#app-view')?.classList.contains('hidden');
  }

  function syncComposerVisibility(){
    const launcher=q('#mobile-ux-composer-launcher');
    const composer=q('.mobile-ux-composer');
    if(!launcher||!composer)return;
    const visible=onFeed();
    launcher.classList.toggle('hidden',!visible);
    if(!visible)closeComposer();
  }

  function openComposer(){
    const composer=q('.mobile-ux-composer');
    if(!composer||!onFeed())return;
    closeNotificationCenter();
    q('#avesso-mobile-more-sheet')?.classList.remove('open');
    composer.classList.add('mobile-ux-open');
    document.body.classList.add('mobile-ux-composer-open','mobile-ux-sheet-open');
    vibrate(9);
    setTimeout(()=>q('#post-body')?.focus(),110);
  }

  function closeComposer(){
    const composer=q('.mobile-ux-composer');
    composer?.classList.remove('mobile-ux-open');
    document.body.classList.remove('mobile-ux-composer-open','mobile-ux-sheet-open');
  }

  function enhanceProfile(){
    if(!isMobile()||!document.body.classList.contains('avesso-own-corner'))return;
    const profile=q('.profile-control');
    if(!profile||q('.mobile-ux-profile-edit',profile))return;
    const button=document.createElement('button');
    button.type='button';
    button.className='mobile-ux-profile-edit';
    button.innerHTML='<span>⚙</span><b>editar meu Canto</b><i>›</i>';
    const story=q('.profile-story-section',profile);
    (story||profile.firstElementChild)?.insertAdjacentElement('afterend',button);
    button.onclick=()=>{
      const open=document.body.classList.toggle('mobile-ux-profile-edit-open');
      button.classList.toggle('active',open);
      q('b',button).textContent=open?'fechar edição':'editar meu Canto';
      q('i',button).textContent=open?'⌃':'›';
      vibrate(8);
      if(open)setTimeout(()=>q('.profile-settings-grid')?.scrollIntoView({behavior:'smooth',block:'start'}),90);
    };
  }

  function ensurePullIndicator(){
    let indicator=q('#mobile-ux-pull');
    if(indicator)return indicator;
    indicator=document.createElement('div');
    indicator.id='mobile-ux-pull';
    indicator.className='mobile-ux-pull';
    indicator.textContent='↓ puxe para atualizar';
    document.body.appendChild(indicator);
    return indicator;
  }

  function bindPullToRefresh(){
    document.addEventListener('touchstart',e=>{
      if(!isMobile()||!onFeed()||window.scrollY>2)return;
      if(e.target.closest('button,a,input,textarea,select,.stories-strip,.reaction-shell,.dm-floating-window,dialog,.mobile-ux-composer'))return;
      pullStart=e.touches?.[0]?.clientY??null;
    },{passive:true});

    document.addEventListener('touchmove',e=>{
      if(pullStart==null)return;
      const y=e.touches?.[0]?.clientY??pullStart;
      const delta=y-pullStart;
      const indicator=ensurePullIndicator();
      indicator.classList.toggle('visible',delta>22);
      indicator.classList.toggle('ready',delta>78);
      indicator.textContent=delta>78?'↻ solte para atualizar':'↓ puxe para atualizar';
    },{passive:true});

    document.addEventListener('touchend',e=>{
      if(pullStart==null)return;
      const y=e.changedTouches?.[0]?.clientY??pullStart;
      const delta=y-pullStart;
      pullStart=null;
      const indicator=ensurePullIndicator();
      indicator.classList.remove('visible','ready');
      if(delta>78&&window.scrollY<4){
        vibrate([8,25,8]);
        q('#refresh-feed')?.click();
      }
    },{passive:true});
  }

  function bindPrimarySwipe(){
    document.addEventListener('pointerdown',e=>{
      if(!isMobile()||e.pointerType==='mouse'||!e.target.closest('#app-view'))return;
      if(e.target.closest('button,a,input,textarea,select,dialog,.dm-floating-window,.stories-strip,.profile-story-list,.plaza-chat-room,.reaction-shell,.post-image,.mobile-ux-composer'))return;
      swipeStart={x:e.clientX,y:e.clientY,time:Date.now()};
    },{passive:true});

    document.addEventListener('pointerup',e=>{
      if(!swipeStart||!isMobile())return;
      const start=swipeStart;swipeStart=null;
      const dx=e.clientX-start.x;
      const dy=e.clientY-start.y;
      const elapsed=Date.now()-start.time;
      if(elapsed>650||Math.abs(dx)<96||Math.abs(dy)>64||Math.abs(dx)<Math.abs(dy)*1.45)return;
      const active=qa('.avesso-mobile-nav [data-app-tab].active').find(b=>PRIMARY.includes(b.dataset.appTab));
      if(!active)return;
      const index=PRIMARY.indexOf(active.dataset.appTab);
      const next=dx<0?index+1:index-1;
      if(next<0||next>=PRIMARY.length)return;
      vibrate(7);
      q('[data-app-tab="'+PRIMARY[next]+'"]')?.click();
    },{passive:true});
  }

  function bindInfiniteFeed(){
    if(!isMobile())return;
    const button=q('#feed-load-more');
    if(!button){
      feedMoreObserver?.disconnect();
      observedLoadMore=null;
      return;
    }
    if(observedLoadMore===button)return;
    feedMoreObserver?.disconnect();
    observedLoadMore=button;
    feedMoreObserver=new IntersectionObserver(entries=>{
      const entry=entries[0];
      if(entry?.isIntersecting&&!button.disabled)button.click();
    },{root:null,rootMargin:'420px 0px 420px 0px',threshold:0.01});
    feedMoreObserver.observe(button);
  }

  function bindChatProgressiveHistory(){
    const log=q('#dm-log');
    if(!log||log.dataset.progressiveHistoryBound)return;
    log.dataset.progressiveHistoryBound='1';
    log.addEventListener('scroll',()=>{
      if(log.scrollTop<90){
        const old=q('#dm-load-older',log);
        if(old&&!old.disabled)old.click();
      }
    },{passive:true});
  }

  function syncFeedLoading(){
    if(!isMobile())return;
    const status=q('#feed-status');
    const list=q('#feed-list');
    const loading=onFeed()&&status&&!status.classList.contains('hidden')&&/carregando|conectando/i.test(status.textContent||'')&&!list?.children?.length;
    document.body.classList.toggle('mobile-ux-feed-loading',Boolean(loading));
  }

  function applyHashRoute(){
    if(!isMobile())return;
    const hash=String(location.hash||'');
    const raw=hash.replace(/^#/,'');
    const exact=raw.match(/^(post|story|photo|chat|profile)\/([^/?#]+)/i);
    if(exact){
      const type=exact[1].toLowerCase();
      const id=decodeURIComponent(exact[2]);
      let attempts=0;
      const timer=setInterval(()=>{
        attempts++;
        const app=q('#app-view');
        const ready=app&&!app.classList.contains('hidden')&&q('#nav-handle')?.textContent&&!q('#nav-handle').textContent.includes('...');
        if(ready){
          clearInterval(timer);
          const normalized=type==='profile'?'profile':type;
          window.dispatchEvent(new CustomEvent('avesso:open-target',{detail:{target:{type:normalized,id}}}));
        }else if(attempts>35)clearInterval(timer);
      },120);
      return;
    }
    const map={
      '#para-cuidar':'feed','#feed':'feed',
      '#praca':'plaza','#praca-central':'plaza',
      '#amigos':'messages','#mensagens':'messages',
      '#seu-canto':'profile','#canto':'profile'
    };
    const tab=map[hash.toLowerCase()];if(!tab)return;
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const app=q('#app-view');
      const button=q('[data-app-tab="'+tab+'"]');
      if(button&&app&&!app.classList.contains('hidden')){
        clearInterval(timer);
        if(!button.classList.contains('active'))button.click();
      }else if(tries>30)clearInterval(timer);
    },120);
  }

  function syncAll(){
    if(!isMobile()){
      closeComposer();
      closeNotificationCenter();
      document.body.classList.remove('mobile-ux-profile-edit-open','mobile-ux-feed-loading');
      return;
    }
    loadNotifications();
    enhanceMoreSheet();
    ensureComposerLauncher();
    bindComposerDraft();
    syncLauncherAvatar();
    syncComposerVisibility();
    enhanceProfile();
    syncFeedLoading();
    bindInfiniteFeed();
    bindChatProgressiveHistory();
  }

  function scheduleSync(){
    if(syncQueued)return;
    syncQueued=true;
    requestAnimationFrame(()=>{syncQueued=false;syncAll();});
  }
  function installObservers(){
    const childObserver=new MutationObserver(scheduleSync);
    childObserver.observe(document.body,{subtree:true,childList:true});

    const layoutObserver=new MutationObserver(scheduleSync);
    layoutObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    const appView=q('#app-view');
    if(appView)layoutObserver.observe(appView,{attributes:true,attributeFilter:['class']});

    const handle=q('#nav-handle');
    if(handle)new MutationObserver(()=>loadNotifications()).observe(handle,{childList:true,characterData:true,subtree:true});

    const status=q('#feed-status');
    if(status)new MutationObserver(syncFeedLoading).observe(status,{childList:true,characterData:true,attributes:true,attributeFilter:['class']});
  }

  function boot(){
    try{
      bindPullToRefresh();
      bindPrimarySwipe();
      installObservers();
      syncAll();

      document.addEventListener('click',e=>{
        const interactive=e.target.closest('.avesso-mobile-nav button,.reaction-trigger,.post-actions button,.compact-friend,.mobile-more-item');
        if(interactive&&isMobile())vibrate(6);
      },{passive:true});

      window.addEventListener('avesso:notification',e=>rememberNotification(e.detail||{}));
      window.addEventListener('avesso:notification-permission',enhanceMoreSheet);

      navigator.serviceWorker?.addEventListener?.('message',e=>{
        if(e.data?.type==='AVESSO_PUSH_WHILE_VISIBLE'&&e.data.payload)rememberNotification(e.data.payload);
      });

      window.addEventListener('beforeinstallprompt',e=>{
        e.preventDefault();
        installPrompt=e;
        enhanceMoreSheet();
      });
      window.addEventListener('appinstalled',()=>{
        installPrompt=null;
        syncInstallButton();
      });
      window.matchMedia?.(MQ).addEventListener?.('change',syncAll);
      window.addEventListener('online',syncNetworkIndicator);
      window.addEventListener('offline',syncNetworkIndicator);
      syncNetworkIndicator();
      window.addEventListener('hashchange',applyHashRoute);
      setTimeout(applyHashRoute,350);
    }catch(error){
      console.error('AVESSO mobile UX layer disabled safely:',error);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();