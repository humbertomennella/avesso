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
  let notificationGroups=new Map();

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
      <form class="desktop-quick-search" data-desktop-search-form>
        <span>⌕</span>
        <input id="desktop-quick-search-input" type="search" autocomplete="off" placeholder="BUSCAR.EXE // pessoas, posts, conversas">
        <button type="submit" aria-label="Buscar">↵</button>
        <kbd>Ctrl K</kbd>
      </form>
      <button type="button" data-desktop-now><span>◉</span><b>AGORA.EXE</b><kbd>Ctrl ⇧ A</kbd></button>
      <button type="button" data-desktop-notifications><span>▤</span><b>notificações</b><i class="hidden">0</i><kbd>Ctrl ⇧ N</kbd></button>
      <div class="desktop-command-spacer"></div>
      <small>desktop // ${window.innerWidth}×${window.innerHeight}</small>`;
    feed.insertBefore(bar,feed.firstChild);
    const form=q('[data-desktop-search-form]',bar);
    const input=q('#desktop-quick-search-input',bar);
    form.onsubmit=e=>{
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('avesso:open-search',{detail:{query:input.value.trim()}}));
    };
    input.addEventListener('keydown',e=>{
      if(e.key==='Escape'){input.value='';input.blur();}
    });
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
      const mark=e.target.closest('[data-desktop-mark-one]');
      if(mark){
        e.stopPropagation();
        const ids=notificationGroups.get(mark.dataset.desktopMarkOne)||[];
        const rows=readNotifications();
        rows.forEach(row=>{if(ids.includes(String(row.id)))row.read=true;});
        saveNotifications(rows);renderNotificationDrawer();refreshNotificationBadge();
        return;
      }
      const item=e.target.closest('[data-desktop-notification-group]');
      if(!item)return;
      const ids=notificationGroups.get(item.dataset.desktopNotificationGroup)||[];
      const rows=readNotifications();
      const row=rows.find(x=>ids.includes(String(x.id)))||rows[0];
      rows.forEach(x=>{if(ids.includes(String(x.id)))x.read=true;});
      saveNotifications(rows);refreshNotificationBadge();
      closeNotificationDrawer();
      if(!row)return;
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

  function groupNotifications(rows=[]){
    const groups=[];
    const byKey=new Map();
    rows.forEach((row,index)=>{
      const target=row.target||{};
      const key=[row.kind||'other',target.type||'',target.id||'',row.title||''].join('|');
      let group=byKey.get(key);
      if(!group){
        group={id:'g'+index,key,latest:row,rows:[],ids:[],count:0,unread:false};
        byKey.set(key,group);groups.push(group);
      }
      group.rows.push(row);
      group.ids.push(String(row.id));
      group.count+=1;
      group.unread=group.unread||!row.read;
      if(Number(row.createdAt||0)>Number(group.latest?.createdAt||0))group.latest=row;
    });
    return groups;
  }

  function renderNotificationDrawer(){
    const drawer=ensureNotificationDrawer();
    const list=q('.desktop-notification-list',drawer);
    const groups=groupNotifications(filteredNotifications());
    notificationGroups=new Map(groups.map(group=>[group.id,group.ids]));
    const icons={message:'↔',attention:'⚡',friend:'+',guestbook:'▤',story:'◫',photo:'▧',interaction:'♥',online:'●'};
    if(!groups.length){
      list.innerHTML='<div class="desktop-notification-empty">Nada aqui. O desktop está estranhamente civilizado.</div>';
      return;
    }
    list.innerHTML=groups.map(group=>{
      const row=group.latest||{};
      const badge=group.count>1?`<strong class="desktop-notification-count">+${group.count-1}</strong>`:'';
      return `<article class="desktop-notification-item ${group.unread?'unread':''}">
        <button type="button" class="desktop-notification-open" data-desktop-notification-group="${esc(group.id)}">
          <i>${icons[row.kind]||'•'}</i>
          <span><b>${esc(row.title||'AVESSO')} ${badge}</b><em>${esc(row.body||'')}</em><small>${timeAgo(row.createdAt)}</small></span>
        </button>
        <button type="button" class="desktop-notification-read" data-desktop-mark-one="${esc(group.id)}" title="Marcar como lida" aria-label="Marcar como lida">✓</button>
      </article>`;
    }).join('');
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
      <section class="desktop-live-section"><div class="desktop-live-section-head"><b>ONLINE AGORA</b></div><div class="desktop-live-online"></div></section>
      <section class="desktop-live-section"><div class="desktop-live-section-head"><b>FEED RECENTE</b></div><div class="desktop-live-posts"></div></section>
      <section class="desktop-live-section"><div class="desktop-live-section-head"><b>PRAÇA</b></div><div class="desktop-live-plaza"></div></section>
      <section class="desktop-live-section"><div class="desktop-live-section-head"><b>STORIES</b></div><div class="desktop-live-stories"></div></section>`;
    aside.insertBefore(card,aside.firstChild);
    q('[data-desktop-live-open]',card).onclick=()=>window.dispatchEvent(new CustomEvent('avesso:open-now'));
    card.addEventListener('click',e=>{
      const profile=e.target.closest('[data-desktop-live-profile]');
      if(profile)return window.dispatchEvent(new CustomEvent('avesso:open-target',{detail:{target:{type:'profile',id:profile.dataset.desktopLiveProfile}}}));
      const post=e.target.closest('[data-desktop-live-post]');
      if(post)return window.dispatchEvent(new CustomEvent('avesso:open-target',{detail:{target:{type:'post',id:post.dataset.desktopLivePost}}}));
      const story=e.target.closest('[data-desktop-live-story]');
      if(story)return window.dispatchEvent(new CustomEvent('avesso:open-target',{detail:{target:{type:'story',id:story.dataset.desktopLiveStory}}}));
      if(e.target.closest('[data-desktop-live-plaza]'))q('[data-app-tab="plaza"]')?.click();
    });
  }

  function requestSummary(){
    if(!isDesktop()||q('#app-view')?.classList.contains('hidden'))return;
    window.dispatchEvent(new CustomEvent('avesso:desktop-summary-request'));
  }

  function renderSummary(detail={}){
    ensureLiveAside();
    const card=q('#desktop-live-card');
    if(!card)return;
    const online=detail.online||[],posts=detail.posts||[],plaza=detail.plaza||[],stories=detail.stories||[];
    q('[data-live-online]',card).textContent=String(online.length);
    q('[data-live-unread]',card).textContent=String(detail.unread||0);
    q('[data-live-pending]',card).textContent=String(detail.pending||0);

    const onlineHost=q('.desktop-live-online',card);
    onlineHost.innerHTML=online.length?online.slice(0,5).map(person=>`
      <button type="button" data-desktop-live-profile="${esc(person.id)}" title="@${esc(person.handle||'')}">
        <span class="desktop-live-avatar">${person.avatar_url?'<img src="'+esc(person.avatar_url)+'" alt="">':'●'}</span>
        <span><b>${esc(person.display_name||person.handle||'alguém')}</b><small>@${esc(person.handle||'...')}</small></span>
      </button>`).join(''):'<small>Ninguém online. Talvez estejam vivendo.</small>';

    const postHost=q('.desktop-live-posts',card);
    postHost.innerHTML=posts.length?posts.slice(0,3).map(post=>`
      <button type="button" data-desktop-live-post="${esc(post.id)}">
        <b>@${esc(post.author_handle||'...')}</b>
        <small>${timeAgo(new Date(post.created_at).getTime())}</small>
        <p>${esc(String(post.body||'').slice(0,92))}</p>
      </button>`).join(''):'<small>Nada nas últimas horas. Milagre estatístico.</small>';

    const plazaHost=q('.desktop-live-plaza',card);
    plazaHost.innerHTML=plaza.length?plaza.slice(0,2).map(row=>`
      <button type="button" data-desktop-live-plaza="${esc(row.id)}">
        <b>⌂ Praça Central</b><small>${timeAgo(new Date(row.created_at).getTime())}</small>
        <p>${esc(String(row.body||'').slice(0,78))}</p>
      </button>`).join(''):'<small>A praça está quieta. Anote a data.</small>';

    const storyHost=q('.desktop-live-stories',card);
    storyHost.innerHTML=stories.length?stories.slice(0,3).map(story=>`
      <button type="button" data-desktop-live-story="${esc(story.id)}">
        <b>◫ story novo</b><small>${timeAgo(new Date(story.created_at).getTime())}</small>
        <p>${esc(String(story.body||'sem legenda').slice(0,72))}</p>
      </button>`).join(''):'<small>Nenhum story ativo agora.</small>';
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
    ensureChatDesktopEnhancements();
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


  function ensureChatDesktopEnhancements(){
    if(!isDesktop())return;
    const win=q('#dm-floating-window');
    if(!win||win.classList.contains('hidden'))return;
    const controls=q('.dm-window-controls',win);
    if(controls&&!q('#desktop-chat-search-head',controls)){
      const search=document.createElement('button');
      search.id='desktop-chat-search-head';
      search.type='button';
      search.title='Buscar nesta conversa';
      search.setAttribute('aria-label','Buscar nesta conversa');
      search.textContent='⌕';
      controls.insertBefore(search,controls.firstChild);
      search.onclick=e=>{e.stopPropagation();q('#dm-search',win)?.click();};
    }

    let rail=q('.desktop-chat-recents',win);
    if(!rail){
      rail=document.createElement('aside');
      rail.className='desktop-chat-recents';
      const body=q('.dm-window-body',win);
      body?.insertBefore(rail,body.firstChild);
    }
    if(!rail)return;
    readRecentChats();
    const active=String(win.dataset.peerId||'');
    const signature=JSON.stringify(recentChats.map(x=>[x.peerId,x.displayName,x.handle,x.avatar,active]));
    if(rail.dataset.signature===signature)return;
    rail.dataset.signature=signature;
    rail.innerHTML='<span>RECENTES</span><div>'+recentChats.map(chat=>`
      <button type="button" class="${String(chat.peerId)===active?'active':''}" data-desktop-rail-chat="${esc(chat.peerId)}" title="${esc(chat.displayName)}">
        <i>${chat.avatar?'<img src="'+esc(chat.avatar)+'" alt="">':'↔'}</i>
        <b>${esc(chat.displayName)}</b>
      </button>`).join('')+'</div>';
    qa('[data-desktop-rail-chat]',rail).forEach(button=>button.onclick=()=>window.dispatchEvent(
      new CustomEvent('avesso:open-target',{detail:{target:{type:'chat',id:button.dataset.desktopRailChat}}})
    ));
    win.classList.toggle('desktop-chat-rail-active',recentChats.length>1);
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
        const dialog=q('#avesso-discovery-dialog');if(dialog?.open)dialog.close();
        q('#dm-options-menu')?.classList.add('hidden');
        q('#dm-emoticon-palette')?.classList.add('hidden');
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
    ensureChatDesktopEnhancements();
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
    window.addEventListener('avesso:chat-opened',e=>{
      rememberChat(e.detail||{});
      setTimeout(()=>{bindChatDrop();ensureChatDesktopEnhancements();},0);
    });
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