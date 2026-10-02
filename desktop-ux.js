/* AVESSO Desktop UX 2026-10-02
   Additive desktop layer. Mobile keeps its own interface. */
(() => {
  'use strict';

  const MQ='(min-width: 821px)';
  const media=window.matchMedia(MQ);
  const isDesktop=()=>media.matches;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const esc=(value='')=>String(value).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  }[c]));

  let summaryTimer=null;
  let navDecorated=false;
  let chatObserver=null;
  let notificationFilter='all';
  let recentChats=[];

  function currentHandle(){
    return String(q('#nav-handle')?.textContent||'anon').trim().replace(/^@/,'')||'anon';
  }
  function notificationKey(){return 'avesso_mobile_center_v1:'+currentHandle();}
  function recentChatKey(){return 'avesso_desktop_recent_chats_v1:'+currentHandle();}

  function readNotifications(){
    try{
      const rows=JSON.parse(localStorage.getItem(notificationKey())||'[]');
      return Array.isArray(rows)?rows.slice(0,80):[];
    }catch{return[];}
  }
  function saveNotifications(rows){
    try{localStorage.setItem(notificationKey(),JSON.stringify(rows.slice(0,80)));}catch{}
  }
  function readRecentChats(){
    try{
      const rows=JSON.parse(localStorage.getItem(recentChatKey())||'[]');
      recentChats=Array.isArray(rows)?rows.slice(0,6):[];
    }catch{recentChats=[];}
  }
  function saveRecentChats(){
    try{localStorage.setItem(recentChatKey(),JSON.stringify(recentChats.slice(0,6)));}catch{}
  }
  function timeAgo(ts){
    const sec=Math.max(0,Math.floor((Date.now()-Number(ts||Date.now()))/1000));
    if(sec<60)return'agora';
    const min=Math.floor(sec/60);if(min<60)return min+'min';
    const h=Math.floor(min/60);if(h<24)return h+'h';
    return Math.floor(h/24)+'d';
  }

  function decorateNav(){
    const nav=q('.app-nav nav');
    if(!nav||!isDesktop())return;
    qa('[data-app-tab]',nav).forEach(button=>{
      if(!button.dataset.desktopOriginalHtml)button.dataset.desktopOriginalHtml=button.innerHTML;
      if(button.querySelector('.desktop-nav-icon'))return;
      const text=button.textContent.trim();
      const parts=text.split(/\s+/);
      const icon=parts.shift()||'•';
      const label=parts.join(' ');
      button.innerHTML='<span class="desktop-nav-icon">'+esc(icon)+'</span><span class="desktop-nav-label">'+esc(label)+'</span>';
    });
    navDecorated=true;
  }

  function restoreNav(){
    if(!navDecorated)return;
    qa('.app-nav [data-app-tab]').forEach(button=>{
      if(button.dataset.desktopOriginalHtml)button.innerHTML=button.dataset.desktopOriginalHtml;
    });
    navDecorated=false;
  }

  function ensureCollapseButton(){
    const aside=q('.app-nav');
    if(!aside||q('#desktop-nav-collapse'))return;
    const button=document.createElement('button');
    button.id='desktop-nav-collapse';
    button.type='button';
    button.className='desktop-nav-collapse';
    button.setAttribute('aria-label','Recolher menu lateral');
    button.innerHTML='<span>«</span><b>recolher</b>';
    button.onclick=()=>{
      const collapsed=document.body.classList.toggle('desktop-nav-collapsed');
      try{localStorage.setItem('avesso.desktop.nav.collapsed',collapsed?'1':'0');}catch{}
      syncCollapseButton();
    };
    const brand=q('.brand',aside);
    brand?.insertAdjacentElement('afterend',button);
    try{
      if(localStorage.getItem('avesso.desktop.nav.collapsed')==='1')document.body.classList.add('desktop-nav-collapsed');
    }catch{}
    syncCollapseButton();
  }
  function syncCollapseButton(){
    const button=q('#desktop-nav-collapse');
    if(!button)return;
    const collapsed=document.body.classList.contains('desktop-nav-collapsed');
    button.querySelector('span').textContent=collapsed?'»':'«';
    button.querySelector('b').textContent=collapsed?'expandir':'recolher';
    button.setAttribute('aria-label',collapsed?'Expandir menu lateral':'Recolher menu lateral');
  }

  function ensureCommandBar(){
    const feed=q('.feed-column');
    if(!feed||q('#desktop-command-bar'))return;
    const bar=document.createElement('section');
    bar.id='desktop-command-bar';
    bar.className='desktop-command-bar';
    bar.innerHTML=`
      <button type="button" data-desktop-search><span>⌕</span><b>BUSCAR.EXE</b><kbd>Ctrl K</kbd></button>
      <button type="button" data-desktop-now><span>◉</span><b>AGORA.EXE</b><kbd>Ctrl ⇧ A</kbd></button>
      <button type="button" data-desktop-notifications><span>▤</span><b>notificações</b><i class="hidden">0</i><kbd>Ctrl ⇧ N</kbd></button>
      <div class="desktop-command-spacer"></div>
      <small>desktop // ${window.innerWidth}×${window.innerHeight}</small>`;
    feed.insertBefore(bar,feed.firstChild);
    q('[data-desktop-search]',bar).onclick=()=>window.dispatchEvent(new CustomEvent('avesso:open-search'));
    q('[data-desktop-now]',bar).onclick=()=>window.dispatchEvent(new CustomEvent('avesso:open-now'));
    q('[data-desktop-notifications]',bar).onclick=openNotificationDrawer;
    refreshNotificationBadge();
  }

  function ensureNotificationDrawer(){
    let drawer=q('#desktop-notification-drawer');
    if(drawer)return drawer;
    drawer=document.createElement('aside');
    drawer.id='desktop-notification-drawer';
    drawer.className='desktop-notification-drawer';
    drawer.innerHTML=`
      <header>
        <div><small>AVESSO // NOTIFICAÇÕES</small><b>coisas que aconteceram sem pedir licença</b></div>
        <button type="button" data-desktop-notification-close aria-label="Fechar">×</button>
      </header>
      <nav>
        <button type="button" class="active" data-desktop-notification-filter="all">tudo</button>
        <button type="button" data-desktop-notification-filter="messages">mensagens</button>
        <button type="button" data-desktop-notification-filter="reactions">reações</button>
        <button type="button" data-desktop-notification-filter="people">pessoas</button>
      </nav>
      <div class="desktop-notification-list"></div>
      <footer>
        <button type="button" data-desktop-mark-read>marcar tudo como lido</button>
        <button type="button" data-desktop-clear-notifications>limpar</button>
      </footer>`;
    document.body.appendChild(drawer);
    q('[data-desktop-notification-close]',drawer).onclick=closeNotificationDrawer;
    qa('[data-desktop-notification-filter]',drawer).forEach(button=>button.onclick=()=>{
      notificationFilter=button.dataset.desktopNotificationFilter||'all';
      qa('[data-desktop-notification-filter]',drawer).forEach(x=>x.classList.toggle('active',x===button));
      renderNotificationDrawer();
    });
    q('[data-desktop-mark-read]',drawer).onclick=()=>{
      const rows=readNotifications();rows.forEach(r=>r.read=true);saveNotifications(rows);
      renderNotificationDrawer();refreshNotificationBadge();
    };
    q('[data-desktop-clear-notifications]',drawer).onclick=()=>{
      saveNotifications([]);renderNotificationDrawer();refreshNotificationBadge();
    };
    drawer.addEventListener('click',e=>{
      const item=e.target.closest('[data-desktop-notification-id]');
      if(!item)return;
      const rows=readNotifications();
      const row=rows.find(x=>x.id===item.dataset.desktopNotificationId);
      if(!row)return;
      row.read=true;saveNotifications(rows);refreshNotificationBadge();
      closeNotificationDrawer();
      if(row.target)window.dispatchEvent(new CustomEvent('avesso:open-target',{detail:{target:row.target}}));
      else {
        const tab=(row.kind==='message'||row.kind==='attention')?'messages':
          (row.kind==='friend'||row.kind==='guestbook'||row.kind==='photo')?'profile':'feed';
        q('[data-app-tab="'+tab+'"]')?.click();
      }
    });
    return drawer;
  }

  function filteredNotifications(){
    return readNotifications().filter(row=>{
      if(notificationFilter==='messages')return row.kind==='message'||row.kind==='attention';
      if(notificationFilter==='reactions')return ['interaction','story','photo'].includes(row.kind);
      if(notificationFilter==='people')return row.kind==='friend'||row.kind==='guestbook';
      return true;
    });
  }

  function renderNotificationDrawer(){
    const drawer=ensureNotificationDrawer();
    const list=q('.desktop-notification-list',drawer);
    const rows=filteredNotifications();
    const icons={message:'↔',attention:'⚡',friend:'+',guestbook:'▤',story:'◫',photo:'▧',interaction:'♥',online:'●'};
    if(!rows.length){
      list.innerHTML='<div class="desktop-notification-empty">Nada aqui. O desktop está estranhamente civilizado.</div>';
      return;
    }
    list.innerHTML=rows.map(row=>`
      <button type="button" class="desktop-notification-item ${row.read?'':'unread'}" data-desktop-notification-id="${esc(row.id)}">
        <i>${icons[row.kind]||'•'}</i>
        <span><b>${esc(row.title||'AVESSO')}</b><em>${esc(row.body||'')}</em><small>${timeAgo(row.createdAt)}</small></span>
      </button>`).join('');
  }

  function refreshNotificationBadge(){
    const rows=readNotifications();
    const count=rows.filter(r=>!r.read).length;
    const badge=q('[data-desktop-notifications] i');
    if(badge){
      badge.textContent=count>99?'99+':String(count);
      badge.classList.toggle('hidden',count===0);
    }
  }

  function openNotificationDrawer(){
    if(!isDesktop())return;
    const drawer=ensureNotificationDrawer();
    renderNotificationDrawer();
    drawer.classList.add('open');
    document.body.classList.add('desktop-notifications-open');
  }
  function closeNotificationDrawer(){
    q('#desktop-notification-drawer')?.classList.remove('open');
    document.body.classList.remove('desktop-notifications-open');
  }

  function ensureLiveAside(){
    const aside=q('.app-aside');
    if(!aside||q('#desktop-live-card'))return;
    const card=document.createElement('section');
    card.id='desktop-live-card';
    card.className='aside-card desktop-live-card';
    card.innerHTML=`
      <header><span class="section-code">AGORA.EXE</span><button type="button" data-desktop-live-open>abrir ↗</button></header>
      <div class="desktop-live-kpis">
        <span><b data-live-online>–</b><small>online</small></span>
        <span><b data-live-unread>–</b><small>mensagens</small></span>
        <span><b data-live-pending>–</b><small>pedidos</small></span>
      </div>
      <div class="desktop-live-posts"><small>carregando atividade...</small></div>`;
    aside.insertBefore(card,aside.firstChild);
    q('[data-desktop-live-open]',card).onclick=()=>window.dispatchEvent(new CustomEvent('avesso:open-now'));
  }

  function requestSummary(){
    if(!isDesktop()||q('#app-view')?.classList.contains('hidden'))return;
    window.dispatchEvent(new CustomEvent('avesso:desktop-summary-request'));
  }

  function renderSummary(detail={}){
    ensureLiveAside();
    const card=q('#desktop-live-card');
    if(!card)return;
    const online=detail.online||[],posts=detail.posts||[];
    q('[data-live-online]',card).textContent=String(online.length);
    q('[data-live-unread]',card).textContent=String(detail.unread||0);
    q('[data-live-pending]',card).textContent=String(detail.pending||0);
    const host=q('.desktop-live-posts',card);
    host.innerHTML=posts.length?posts.slice(0,3).map(post=>`
      <button type="button" data-desktop-live-post="${esc(post.id)}">
        <b>@${esc(post.author_handle||'...')}</b>
        <small>${timeAgo(new Date(post.created_at).getTime())}</small>
        <p>${esc(String(post.body||'').slice(0,92))}</p>
      </button>`).join(''):'<small>Nada nas últimas horas. Milagre estatístico.</small>';
    qa('[data-desktop-live-post]',host).forEach(button=>button.onclick=()=>window.dispatchEvent(
      new CustomEvent('avesso:open-target',{detail:{target:{type:'post',id:button.dataset.desktopLivePost}}})
    ));
  }

  function rememberChat(detail={}){
    if(!detail.peerId)return;
    readRecentChats();
    recentChats=recentChats.filter(x=>x.peerId!==detail.peerId);
    recentChats.unshift({
      peerId:detail.peerId,
      displayName:detail.displayName||detail.handle||'conversa',
      handle:detail.handle||'',
      avatar:detail.avatar||'',
      at:Date.now()
    });
    recentChats=recentChats.slice(0,6);
    saveRecentChats();
    renderChatShelf();
  }

  function ensureChatShelf(){
    let shelf=q('#desktop-chat-shelf');
    if(shelf)return shelf;
    shelf=document.createElement('section');
    shelf.id='desktop-chat-shelf';
    shelf.className='desktop-chat-shelf';
    shelf.innerHTML='<span class="desktop-chat-shelf-label">CONVERSAS</span><div class="desktop-chat-shelf-list"></div>';
    document.body.appendChild(shelf);
    return shelf;
  }

  function renderChatShelf(){
    if(!isDesktop())return;
    readRecentChats();
    const shelf=ensureChatShelf();
    const list=q('.desktop-chat-shelf-list',shelf);
    const signature=JSON.stringify(recentChats.map(x=>[x.peerId,x.displayName,x.handle,x.avatar]));
    shelf.classList.toggle('hidden',recentChats.length===0);
    if(list.dataset.signature===signature)return;
    list.dataset.signature=signature;
    list.innerHTML=recentChats.map(chat=>`
      <button type="button" data-desktop-chat-peer="${esc(chat.peerId)}" title="${esc(chat.displayName)}">
        <span class="desktop-chat-avatar">${chat.avatar?'<img src="'+esc(chat.avatar)+'" alt="">':'↔'}</span>
        <span><b>${esc(chat.displayName)}</b><small>@${esc(chat.handle||'...')}</small></span>
      </button>`).join('');
    qa('[data-desktop-chat-peer]',list).forEach(button=>button.onclick=()=>window.dispatchEvent(
      new CustomEvent('avesso:open-target',{detail:{target:{type:'chat',id:button.dataset.desktopChatPeer}}})
    ));
  }

  function bindChatDrop(){
    const win=q('#dm-floating-window');
    if(!win||win.dataset.desktopDropBound)return;
    win.dataset.desktopDropBound='1';
    let depth=0;
    const toggle=on=>win.classList.toggle('desktop-drop-active',on);
    win.addEventListener('dragenter',e=>{if(!isDesktop())return;e.preventDefault();depth++;toggle(true);});
    win.addEventListener('dragover',e=>{if(!isDesktop())return;e.preventDefault();});
    win.addEventListener('dragleave',()=>{depth=Math.max(0,depth-1);if(!depth)toggle(false);});
    win.addEventListener('drop',e=>{
      if(!isDesktop())return;
      e.preventDefault();depth=0;toggle(false);
      const file=e.dataTransfer?.files?.[0];if(!file)return;
      const input=q('#dm-file-input');if(!input)return;
      try{
        const dt=new DataTransfer();dt.items.add(file);input.files=dt.files;
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }catch{}
    });
  }

  function bindKeyboard(){
    document.addEventListener('keydown',e=>{
      if(!isDesktop())return;
      const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'');
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
        e.preventDefault();window.dispatchEvent(new CustomEvent('avesso:open-search'));return;
      }
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='a'){
        e.preventDefault();window.dispatchEvent(new CustomEvent('avesso:open-now'));return;
      }
      if((e.ctrlKey||e.metaKey)&&e.shiftKey&&e.key.toLowerCase()==='n'){
        e.preventDefault();openNotificationDrawer();return;
      }
      if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&document.activeElement?.id==='dm-input'){
        e.preventDefault();q('#dm-form')?.requestSubmit();return;
      }
      if(e.key==='/'&&!typing&&!q('#dm-floating-window')?.classList.contains('hidden')){
        e.preventDefault();q('#dm-search')?.click();return;
      }
      if(e.key==='Escape'){
        closeNotificationDrawer();
        return;
      }
      if(e.altKey&&!typing&&/^[1-8]$/.test(e.key)){
        const tabs=['feed','quiet','sent','plaza','residents','tower','messages','profile'];
        const tab=tabs[Number(e.key)-1];
        if(tab){e.preventDefault();q('[data-app-tab="'+tab+'"]')?.click();}
      }
    });
  }

  function syncDesktop(){
    if(!isDesktop()){
      closeNotificationDrawer();
      document.body.classList.remove('desktop-nav-collapsed');
      restoreNav();
      q('#desktop-nav-collapse')?.setAttribute('hidden','');
      q('#desktop-command-bar')?.classList.add('desktop-hidden');
      q('#desktop-chat-shelf')?.classList.add('hidden');
      clearInterval(summaryTimer);summaryTimer=null;
      return;
    }
    decorateNav();
    ensureCollapseButton();
    q('#desktop-nav-collapse')?.removeAttribute('hidden');
    syncCollapseButton();
    ensureCommandBar();
    q('#desktop-command-bar')?.classList.remove('desktop-hidden');
    ensureNotificationDrawer();
    ensureLiveAside();
    renderChatShelf();
    bindChatDrop();
    refreshNotificationBadge();
    if(!summaryTimer){
      requestSummary();
      summaryTimer=setInterval(requestSummary,45000);
    }
  }

  function boot(){
    bindKeyboard();
    const observer=new MutationObserver(()=>requestAnimationFrame(syncDesktop));
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    window.addEventListener('avesso:desktop-summary',e=>renderSummary(e.detail||{}));
    window.addEventListener('avesso:chat-opened',e=>{rememberChat(e.detail||{});setTimeout(bindChatDrop,0);});
    window.addEventListener('avesso:notification',()=>setTimeout(refreshNotificationBadge,30));
    navigator.serviceWorker?.addEventListener?.('message',e=>{
      if(e.data?.type==='AVESSO_PUSH_WHILE_VISIBLE')setTimeout(refreshNotificationBadge,60);
    });
    media.addEventListener?.('change',syncDesktop);
    window.addEventListener('resize',()=>{const el=q('#desktop-command-bar small');if(el)el.textContent='desktop // '+window.innerWidth+'×'+window.innerHeight;});
    syncDesktop();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();