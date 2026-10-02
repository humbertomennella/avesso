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
  let notificationOpener=null;
  let recentChats=[];
  let notificationGroups=new Map();
  let contextTarget=null;
  let contextOpener=null;
  let desktopSyncQueued=false;
  let profileJumpObserver=null;

  function currentHandle(){
    return String(q('#nav-handle')?.textContent||'anon').trim().replace(/^@/,'')||'anon';
  }
  function notificationKey(){return 'avesso_mobile_center_v1:'+currentHandle();}
  function recentChatKey(){return 'avesso_desktop_recent_chats_v1:'+currentHandle();}

  function readNotifications(){
    try{
      const rows=JSON.parse(localStorage.getItem(notificationKey())||'[]');
      if(!Array.isArray(rows))return[];
      const cutoff=Date.now()-30*24*60*60*1000;
      return rows
        .filter(row=>row&&Number(row.createdAt||0)>=cutoff)
        .slice(0,100);
    }catch{return[];}
  }
  function saveNotifications(rows){
    try{
      const cutoff=Date.now()-30*24*60*60*1000;
      const clean=(Array.isArray(rows)?rows:[])
        .filter(row=>row&&Number(row.createdAt||0)>=cutoff)
        .slice(0,100);
      localStorage.setItem(notificationKey(),JSON.stringify(clean));
    }catch{}
  }
  function notificationTargetFromUrl(url=''){
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
  function rememberDesktopNotification(detail={}){
    const rows=readNotifications();
    const createdAt=Number(detail.createdAt||Date.now());
    const kind=String(detail.kind||'interaction');
    const title=String(detail.title||'AVESSO').slice(0,140);
    const body=String(detail.body||'').slice(0,260);
    const target=detail.target||notificationTargetFromUrl(detail.url)||null;
    const targetKey=target?.type&&target?.id?`${target.type}:${target.id}`:'';
    const dedupeKey=String(detail.dedupeKey||[kind,targetKey,title,body].join('|')).toLowerCase();

    const existingIndex=rows.findIndex(row=>
      String(row.dedupeKey||'')===dedupeKey&&
      Math.abs(createdAt-Number(row.createdAt||0))<15000
    );
    if(existingIndex>=0){
      const existing=rows.splice(existingIndex,1)[0];
      rows.unshift({
        ...existing,
        kind,title,body,target,dedupeKey,createdAt,
        read:false,
        repeat:Math.max(1,Number(existing.repeat||1))+1
      });
    }else{
      rows.unshift({
        id:String(createdAt)+'-'+Math.random().toString(36).slice(2,7),
        kind,title,body,createdAt,target,dedupeKey,
        read:false,repeat:1
      });
    }
    saveNotifications(rows);
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
      if(label){
        button.setAttribute('aria-label',label);
        button.title=label;
      }
    });
    navDecorated=true;
    syncNavAccessibility();
  }

  function restoreNav(){
    if(!navDecorated)return;
    qa('.app-nav [data-app-tab]').forEach(button=>{
      if(button.dataset.desktopOriginalHtml)button.innerHTML=button.dataset.desktopOriginalHtml;
      button.removeAttribute('aria-current');
      button.removeAttribute('title');
    });
    navDecorated=false;
  }

  function syncNavAccessibility(){
    qa('.app-nav [data-app-tab]').forEach(button=>{
      const active=button.classList.contains('active');
      if(active)button.setAttribute('aria-current','page');
      else button.removeAttribute('aria-current');
    });
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
      <form class="desktop-quick-search" data-desktop-search-form role="search" aria-label="Busca universal do AVESSO">
        <span aria-hidden="true">⌕</span>
        <input id="desktop-quick-search-input" type="search" autocomplete="off" aria-label="Pesquisar no AVESSO" placeholder="BUSCAR.EXE // pessoas, posts, chats, stories, fotos, praça">
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
    drawer.setAttribute('role','region');
    drawer.setAttribute('aria-label','Central de notificações');
    drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML=`
      <header>
        <div><small>AVESSO // NOTIFICAÇÕES</small><b>coisas que aconteceram sem pedir licença</b></div>
        <button type="button" data-desktop-notification-close aria-label="Fechar">×</button>
      </header>
      <nav>
        <button type="button" class="active" data-desktop-notification-filter="all">tudo <small data-filter-count="all">0</small></button>
        <button type="button" data-desktop-notification-filter="unread">não lidas <small data-filter-count="unread">0</small></button>
        <button type="button" data-desktop-notification-filter="messages">mensagens <small data-filter-count="messages">0</small></button>
        <button type="button" data-desktop-notification-filter="reactions">interações <small data-filter-count="reactions">0</small></button>
        <button type="button" data-desktop-notification-filter="people">pessoas <small data-filter-count="people">0</small></button>
        <button type="button" data-desktop-notification-filter="system">sistema <small data-filter-count="system">0</small></button>
      </nav>
      <div class="desktop-notification-summary" aria-live="polite"></div>
      <div class="desktop-notification-list"></div>
      <footer>
        <button type="button" data-desktop-mark-read>marcar tudo como lido</button>
        <button type="button" data-desktop-clear-read>limpar lidas</button>
        <button type="button" data-desktop-clear-notifications>limpar tudo</button>
      </footer>`;
    document.body.appendChild(drawer);
    q('[data-desktop-notification-close]',drawer).onclick=closeNotificationDrawer;
    qa('[data-desktop-notification-filter]',drawer).forEach((button,index)=>button.setAttribute('aria-pressed',String(index===0)));
    try{notificationFilter=localStorage.getItem('avesso.desktop.notification.filter')||'all';}catch{}
    qa('[data-desktop-notification-filter]',drawer).forEach(button=>{
      const active=button.dataset.desktopNotificationFilter===notificationFilter;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
      button.onclick=()=>{
        notificationFilter=button.dataset.desktopNotificationFilter||'all';
        try{localStorage.setItem('avesso.desktop.notification.filter',notificationFilter);}catch{}
        qa('[data-desktop-notification-filter]',drawer).forEach(x=>{
          const selected=x===button;
          x.classList.toggle('active',selected);
          x.setAttribute('aria-pressed',String(selected));
        });
        renderNotificationDrawer();
      };
    });
    q('[data-desktop-mark-read]',drawer).onclick=()=>{
      const rows=readNotifications();rows.forEach(r=>r.read=true);saveNotifications(rows);
      renderNotificationDrawer();refreshNotificationBadge();
    };
    q('[data-desktop-clear-read]',drawer).onclick=()=>{
      saveNotifications(readNotifications().filter(row=>!row.read));
      renderNotificationDrawer();refreshNotificationBadge();
    };
    q('[data-desktop-clear-notifications]',drawer).onclick=()=>{
      saveNotifications([]);renderNotificationDrawer();refreshNotificationBadge();
    };
    drawer.addEventListener('click',e=>{
      const mark=e.target.closest('[data-desktop-mark-one]');
      if(mark){
        e.stopPropagation();
        const group=notificationGroups.get(mark.dataset.desktopMarkOne);
        const ids=group?.ids||[];
        const rows=readNotifications();
        rows.forEach(row=>{if(ids.includes(String(row.id)))row.read=true;});
        saveNotifications(rows);renderNotificationDrawer();refreshNotificationBadge();
        return;
      }
      const item=e.target.closest('[data-desktop-notification-group]');
      if(!item)return;
      const group=notificationGroups.get(item.dataset.desktopNotificationGroup);
      const ids=group?.ids||[];
      const rows=readNotifications();
      const row=group?.latest||rows.find(x=>ids.includes(String(x.id)))||rows[0];
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

  function notificationCategory(row={}){
    if(row.kind==='message'||row.kind==='attention')return'messages';
    if(['interaction','story','photo'].includes(row.kind))return'reactions';
    if(row.kind==='friend'||row.kind==='guestbook'||row.kind==='online')return'people';
    if(row.kind==='staff'||row.kind==='world'||row.kind==='system')return'system';
    return'other';
  }
  function filteredNotifications(){
    return readNotifications().filter(row=>{
      if(notificationFilter==='unread')return !row.read;
      if(['messages','reactions','people','system'].includes(notificationFilter))return notificationCategory(row)===notificationFilter;
      return true;
    });
  }
  function notificationCounts(rows=readNotifications()){
    const counts={all:rows.length,unread:0,messages:0,reactions:0,people:0,system:0};
    for(const row of rows){
      if(!row.read)counts.unread+=Math.max(1,Number(row.repeat||1));
      const category=notificationCategory(row);
      if(counts[category]!==undefined)counts[category]+=Math.max(1,Number(row.repeat||1));
    }
    return counts;
  }

  function groupNotifications(rows=[]){
    const groups=[];
    const byKey=new Map();
    [...rows].sort((a,b)=>Number(b.createdAt||0)-Number(a.createdAt||0)).forEach((row,index)=>{
      const target=row.target||{};
      const category=notificationCategory(row);
      const targetKey=target.type&&target.id?`${target.type}:${target.id}`:'';
      const fallbackKey=String(row.dedupeKey||row.title||row.kind||'other').toLowerCase();
      const key=[category,targetKey||fallbackKey].join('|');
      let group=byKey.get(key);
      if(!group){
        group={id:'g'+index,key,latest:row,rows:[],ids:[],count:0,unread:false,category,target:targetKey?target:null};
        byKey.set(key,group);groups.push(group);
      }
      group.rows.push(row);
      group.ids.push(String(row.id));
      group.count+=Math.max(1,Number(row.repeat||1));
      group.unread=group.unread||!row.read;
      if(Number(row.createdAt||0)>Number(group.latest?.createdAt||0))group.latest=row;
    });
    return groups.sort((a,b)=>Number(b.latest?.createdAt||0)-Number(a.latest?.createdAt||0));
  }

  function renderNotificationDrawer(){
    const drawer=ensureNotificationDrawer();
    const list=q('.desktop-notification-list',drawer);
    const allRows=readNotifications();
    const groups=groupNotifications(filteredNotifications());
    notificationGroups=new Map(groups.map(group=>[group.id,group]));
    const counts=notificationCounts(allRows);
    qa('[data-filter-count]',drawer).forEach(el=>{
      const value=counts[el.dataset.filterCount]||0;
      el.textContent=value>99?'99+':String(value);
    });
    const summary=q('.desktop-notification-summary',drawer);
    if(summary){
      const shown=groups.reduce((sum,group)=>sum+group.count,0);
      summary.innerHTML=`<span><b>${counts.unread}</b> não lida${counts.unread===1?'':'s'}</span><span><b>${shown}</b> neste filtro</span><span><b>${allRows.length}</b> eventos salvos</span>`;
    }
    const icons={message:'↔',attention:'⚡',friend:'+',guestbook:'▤',story:'◫',photo:'▧',interaction:'♥',online:'●',staff:'⚑',world:'♛',system:'◉'};
    if(!groups.length){
      list.innerHTML='<div class="desktop-notification-empty">Nada aqui. O desktop está estranhamente civilizado.</div>';
      return;
    }
    list.innerHTML=groups.map(group=>{
      const row=group.latest||{};
      const badge=group.count>1?`<strong class="desktop-notification-count">×${group.count}</strong>`:'';
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
    const count=rows.filter(r=>!r.read).reduce((sum,row)=>sum+Math.max(1,Number(row.repeat||1)),0);
    const badge=q('[data-desktop-notifications] i');
    if(badge){
      badge.textContent=count>99?'99+':String(count);
      badge.classList.toggle('hidden',count===0);
    }
  }

  function openNotificationDrawer(){
    if(!isDesktop())return;
    notificationOpener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const drawer=ensureNotificationDrawer();
    renderNotificationDrawer();
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
    document.body.classList.add('desktop-notifications-open');
    q('[data-desktop-notification-close]',drawer)?.focus({preventScroll:true});
  }
  function closeNotificationDrawer(){
    const drawer=q('#desktop-notification-drawer');
    const wasOpen=drawer?.classList.contains('open');
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden','true');
    document.body.classList.remove('desktop-notifications-open');
    if(wasOpen){
      const opener=notificationOpener;
      notificationOpener=null;
      if(opener?.isConnected)requestAnimationFrame(()=>opener.focus({preventScroll:true}));
    }
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
    if(!isDesktop()||document.hidden||q('#app-view')?.classList.contains('hidden'))return;
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



  function contextDispatch(action,detail={}){
    window.dispatchEvent(new CustomEvent('avesso:desktop-context-action',{detail:{action,...detail}}));
    closeDesktopContextMenu();
  }

  function ensureDesktopContextMenu(){
    let menu=q('#desktop-context-menu');
    if(menu)return menu;
    menu=document.createElement('div');
    menu.id='desktop-context-menu';
    menu.className='desktop-context-menu hidden';
    menu.setAttribute('role','menu');
    document.body.appendChild(menu);
    menu.addEventListener('keydown',event=>{
      const buttons=qa('button:not([disabled])',menu);
      if(!buttons.length)return;
      const index=Math.max(0,buttons.indexOf(document.activeElement));
      let next=null;
      if(event.key==='ArrowDown')next=buttons[(index+1)%buttons.length];
      else if(event.key==='ArrowUp')next=buttons[(index-1+buttons.length)%buttons.length];
      else if(event.key==='Home')next=buttons[0];
      else if(event.key==='End')next=buttons[buttons.length-1];
      else if(event.key==='Escape'){event.preventDefault();closeDesktopContextMenu(true);return;}
      if(next){event.preventDefault();next.focus();}
    });
    menu.addEventListener('click',event=>{
      const button=event.target.closest('[data-context-action]');
      if(!button||!contextTarget)return;
      const action=button.dataset.contextAction;
      contextDispatch(action,contextTarget);
    });
    return menu;
  }

  function closeDesktopContextMenu(returnFocus=false){
    q('#desktop-context-menu')?.classList.add('hidden');
    qa('.desktop-context-trigger[aria-expanded="true"]').forEach(button=>button.setAttribute('aria-expanded','false'));
    const opener=contextOpener;
    contextTarget=null;
    contextOpener=null;
    if(returnFocus&&opener?.isConnected)opener.focus({preventScroll:true});
  }

  function contextUserFromNode(node){
    if(!node)return null;
    const direct=node.closest?.('[data-profile-id]');
    if(direct?.dataset.profileId)return direct.dataset.profileId;
    const row=node.closest?.('.friend-row,.compact-friend,.online-friend-item,.public-profile-hero,.dm-floating-window');
    const profile=row?.querySelector?.('[data-profile-id]');
    return profile?.dataset.profileId||null;
  }

  function contextDescriptor(target){
    const message=target.closest?.('.dm-bubble[data-dm-id]');
    if(message){
      const id=message.dataset.dmId;
      const mine=message.dataset.dmMine==='1';
      const text=q('.dm-message-body',message)?.textContent?.trim()||'';
      return {type:'message',id,mine,text,node:message};
    }

    const photo=target.closest?.('.album-photo[data-album-photo]');
    if(photo){
      const id=photo.dataset.albumPhoto;
      const own=Boolean(q('[data-photo-edit]',photo)||q('[data-photo-delete]',photo));
      return {type:'photo',id,own,node:photo};
    }

    const post=target.closest?.('.post-card[data-post-card]');
    if(post){
      const id=post.dataset.postCard;
      const own=Boolean(q('[data-post-edit]',post)||q('[data-post-delete]',post));
      const authorId=q('[data-profile-id]',post)?.dataset.profileId||'';
      return {type:'post',id,own,authorId,node:post};
    }

    const userId=contextUserFromNode(target);
    if(userId){
      const row=target.closest?.('.friend-row,.compact-friend,.online-friend-item,.public-profile-hero,.dm-floating-window');
      const canMessage=Boolean(
        row?.querySelector?.('[data-friend-chat],[data-open-chat],[data-message-friend]')||
        target.closest?.('.dm-floating-window')
      );
      return {type:'user',id:userId,canMessage,node:row||target.closest('[data-profile-id]')};
    }
    return null;
  }

  function contextItems(descriptor){
    if(!descriptor)return[];
    if(descriptor.type==='post'){
      const items=[
        ['post-reply','↩','responder'],
        ['post-react','♥','reagir'],
        ['post-turn','↻','virar no feed'],
        ['post-copy-link','⌘','copiar link']
      ];
      if(descriptor.own){
        items.push(['separator']);
        items.push(['post-edit','✎','editar']);
        items.push(['post-delete','×','apagar','danger']);
      }else if(descriptor.authorId){
        items.push(['separator']);
        items.push(['post-report','⚑','denunciar autor','danger']);
      }
      return items;
    }
    if(descriptor.type==='photo'){
      const items=[
        ['photo-open','▧','abrir foto'],
        ['photo-turn','↻','virar no feed'],
        ['photo-copy-link','⌘','copiar link']
      ];
      if(descriptor.own){
        items.push(['separator']);
        items.push(['photo-edit','✎','editar legenda']);
        items.push(['photo-delete','×','apagar foto','danger']);
      }
      return items;
    }
    if(descriptor.type==='message'){
      const items=[
        ['message-reply','↩','responder'],
        ['message-react','☺','reagir']
      ];
      if(descriptor.text)items.push(['message-copy','⌘','copiar texto']);
      if(descriptor.mine){
        items.push(['separator']);
        items.push(['message-edit','✎','editar']);
        items.push(['message-delete','×','apagar','danger']);
      }
      return items;
    }
    if(descriptor.type==='user'){
      const items=[
        ['user-open','◎','abrir Canto'],
        ['user-copy-link','⌘','copiar link']
      ];
      if(descriptor.canMessage)items.splice(1,0,['user-message','↔','mensagem']);
      items.push(['separator']);
      items.push(['user-report','⚑','denunciar usuário','danger']);
      return items;
    }
    return[];
  }

  function openDesktopContextMenu(descriptor,x,y){
    if(!isDesktop()||!descriptor)return;
    const menu=ensureDesktopContextMenu();
    contextTarget=descriptor;
    const items=contextItems(descriptor);
    menu.innerHTML=items.map(item=>{
      if(item[0]==='separator')return '<span class="desktop-context-separator" aria-hidden="true"></span>';
      return `<button type="button" role="menuitem" data-context-action="${esc(item[0])}" class="${item[3]||''}"><i>${item[1]}</i><span>${esc(item[2])}</span></button>`;
    }).join('');
    menu.classList.remove('hidden');
    menu.style.left='0px';menu.style.top='0px';
    const rect=menu.getBoundingClientRect();
    const gap=8;
    const left=Math.max(gap,Math.min(x,window.innerWidth-rect.width-gap));
    const top=Math.max(gap,Math.min(y,window.innerHeight-rect.height-gap));
    menu.style.left=left+'px';
    menu.style.top=top+'px';
    requestAnimationFrame(()=>q('button',menu)?.focus({preventScroll:true}));
  }

  function contextButton(type,id){
    const button=document.createElement('button');
    button.type='button';
    button.className='desktop-context-trigger';
    button.dataset.desktopContextType=type;
    button.dataset.desktopContextId=id;
    button.setAttribute('aria-label','Mais ações');
    button.setAttribute('aria-haspopup','menu');
    button.setAttribute('aria-expanded','false');
    button.title='Mais ações';
    button.textContent='•••';
    return button;
  }

  function enhanceContextButtons(){
    enhanceContextButtonsIn(document);
  }

  function bindDesktopContextMenus(){
    document.addEventListener('contextmenu',event=>{
      if(!isDesktop())return;
      if(event.target.closest('input,textarea,select,[contenteditable="true"],.desktop-context-menu'))return;
      const descriptor=contextDescriptor(event.target);
      if(!descriptor)return;
      event.preventDefault();
      openDesktopContextMenu(descriptor,event.clientX,event.clientY);
    });
    document.addEventListener('click',event=>{
      const trigger=event.target.closest('.desktop-context-trigger');
      if(trigger&&isDesktop()){
        event.preventDefault();event.stopPropagation();
        const descriptor=contextDescriptor(trigger.parentElement||trigger);
        if(!descriptor)return;
        contextOpener=trigger;
        trigger.setAttribute('aria-expanded','true');
        const rect=trigger.getBoundingClientRect();
        openDesktopContextMenu(descriptor,rect.right,rect.bottom+4);
        return;
      }
      if(!event.target.closest('.desktop-context-menu'))closeDesktopContextMenu();
    },true);
    window.addEventListener('blur',closeDesktopContextMenu);
    window.addEventListener('resize',closeDesktopContextMenu);
    document.addEventListener('scroll',closeDesktopContextMenu,true);
  }

  function profileSettingsOpen(){
    try{return localStorage.getItem('avesso.desktop.profile.settings')==='1';}catch{return false;}
  }

  function profilePlaceholder(key,node){
    if(!node?.parentNode)return null;
    let placeholder=q('[data-desktop-profile-placeholder="'+key+'"]');
    if(!placeholder){
      placeholder=document.createElement('span');
      placeholder.hidden=true;
      placeholder.dataset.desktopProfilePlaceholder=key;
      node.parentNode.insertBefore(placeholder,node);
    }
    return placeholder;
  }

  function moveProfileNode(node,target,key){
    if(!node||!target||node.parentElement===target)return;
    profilePlaceholder(key,node);
    target.appendChild(node);
  }

  function restoreProfileDesktop(){
    qa('[data-desktop-profile-placeholder]').forEach(placeholder=>{
      const key=placeholder.dataset.desktopProfilePlaceholder;
      const node=q('[data-desktop-profile-key="'+key+'"]');
      if(node&&placeholder.parentNode)placeholder.parentNode.insertBefore(node,placeholder);
      placeholder.remove();
    });
    q('#desktop-profile-layout')?.remove();
    q('#desktop-profile-settings-panel')?.remove();
    q('#desktop-profile-tools')?.remove();
    qa('.desktop-profile-jump-nav').forEach(node=>node.remove());
    profileJumpObserver?.disconnect();profileJumpObserver=null;
    q('.profile-control')?.classList.remove('desktop-profile-enhanced','desktop-profile-settings-open');
    document.body.classList.remove('desktop-profile-settings-open');
  }

  function tagProfileNode(node,key){
    if(node)node.dataset.desktopProfileKey=key;
    return node;
  }


  function setupProfileJumpNav({root,hero,items,publicView=false}){
    if(!root||!hero||!items?.length)return;
    const existing=q('.desktop-profile-jump-nav',root);
    if(existing)return;

    const nav=document.createElement('nav');
    nav.className='desktop-profile-jump-nav';
    nav.setAttribute('aria-label',publicView?'Navegação do Canto público':'Navegação do Meu Canto');
    nav.innerHTML=items.map(item=>`
      <button type="button" data-profile-jump="${esc(item.key)}">
        <span>${esc(item.icon||'·')}</span>
        <b>${esc(item.label)}</b>
        ${item.count?'<small data-profile-jump-count>…</small>':''}
      </button>`).join('');
    hero.insertAdjacentElement('afterend',nav);

    const activate=key=>{
      qa('[data-profile-jump]',nav).forEach(button=>button.classList.toggle('active',button.dataset.profileJump===key));
    };
    activate(items[0].key);

    qa('[data-profile-jump]',nav).forEach(button=>{
      button.onclick=()=>{
        const item=items.find(entry=>entry.key===button.dataset.profileJump);
        const target=item?.selector?q(item.selector,root)||q(item.selector):null;
        if(item?.key==='settings'){
          const ownerRoot=q('.profile-control');
          ownerRoot?.classList.add('desktop-profile-settings-open');
          document.body.classList.add('desktop-profile-settings-open');
          try{localStorage.setItem('avesso.desktop.profile.settings','1');}catch{}
          const settingsButton=q('[data-desktop-profile-settings]');
          if(settingsButton)settingsButton.textContent='× fechar ajustes';
        }
        activate(item?.key||'');
        target?.scrollIntoView({behavior:'smooth',block:'start'});
      };
    });

    profileJumpObserver?.disconnect();
    if('IntersectionObserver' in window){
      const observed=items
        .map(item=>({item,node:item.selector?(q(item.selector,root)||q(item.selector)):null}))
        .filter(entry=>entry.node&&entry.item.key!=='settings');
      profileJumpObserver=new IntersectionObserver(entries=>{
        const visible=entries
          .filter(entry=>entry.isIntersecting)
          .sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
        if(!visible)return;
        const match=observed.find(entry=>entry.node===visible.target);
        if(match)activate(match.item.key);
      },{root:null,rootMargin:'-18% 0px -62% 0px',threshold:[0,.08,.2,.4]});
      observed.forEach(entry=>profileJumpObserver.observe(entry.node));
    }
  }

  function enhancePublicProfileDesktop(){
    if(!isDesktop()||!document.body.classList.contains('avesso-public-corner'))return;
    const root=q('.public-profile');
    const hero=q('.public-profile-hero',root);
    if(!root||!hero)return;
    setupProfileJumpNav({
      root,hero,publicView:true,
      items:[
        {key:'stories',label:'Stories',icon:'◌',selector:'.public-story-section'},
        {key:'public-posts',label:'Publicações',icon:'↗',selector:'.public-posts',count:true},
        {key:'album',label:'Álbum',icon:'▧',selector:'.public-album'},
        {key:'media',label:'Mídia',icon:'♫',selector:'.public-media'},
        {key:'guestbook',label:'Recados',icon:'✎',selector:'.public-guestbook'}
      ]
    });
  }

  function desktopPresenceLabel(value){
    return value==='away'?'ausente':value==='invisible'?'invisível':'online';
  }

  function enhanceProfileDesktop(){
    if(!isDesktop()||!document.body.classList.contains('avesso-own-corner'))return;
    const root=q('.profile-control');
    const hero=q('.profile-control-hero',root);
    if(!root||!hero)return;
    if(root.classList.contains('desktop-profile-enhanced')){
      const status=q('#profile-status')?.value||'';
      const bio=q('#profile-bio')?.value||'';
      const presence=q('#profile-presence')?.value||'online';
      const statusEl=q('[data-desktop-profile-status]',hero);
      const bioEl=q('[data-desktop-profile-bio]',hero);
      const presenceEl=q('[data-desktop-profile-presence]',hero);
      if(statusEl)statusEl.textContent=status||'sem status definido';
      if(bioEl)bioEl.textContent=bio||'Sem bio. Um raro caso de contenção editorial.';
      if(presenceEl){
        presenceEl.className='desktop-profile-presence '+presence;
        presenceEl.innerHTML='<i></i>'+desktopPresenceLabel(presence);
      }
      return;
    }

    root.classList.add('desktop-profile-enhanced');

    const identity=q('.profile-hero-identity',hero);
    if(identity&&!q('#desktop-profile-tools',hero)){
      const status=q('#profile-status')?.value||'';
      const bio=q('#profile-bio')?.value||'';
      const presence=q('#profile-presence')?.value||'online';
      const tools=document.createElement('div');
      tools.id='desktop-profile-tools';
      tools.className='desktop-profile-tools';
      tools.innerHTML=`
        <div class="desktop-profile-summary">
          <div class="desktop-profile-state-row">
            <span class="desktop-profile-presence ${esc(presence)}" data-desktop-profile-presence><i></i>${esc(desktopPresenceLabel(presence))}</span>
            <p data-desktop-profile-status>${esc(status||'sem status definido')}</p>
          </div>
          <small data-desktop-profile-bio>${esc(bio||'Sem bio. Um raro caso de contenção editorial.')}</small>
        </div>
        <div class="desktop-profile-actions">
          <button type="button" data-desktop-profile-settings>⚙ ajustes do Canto</button>
          <button type="button" data-desktop-profile-avatar>◎ trocar avatar</button>
        </div>`;
      identity.appendChild(tools);
      q('[data-desktop-profile-settings]',tools).onclick=()=>{
        const open=!root.classList.contains('desktop-profile-settings-open');
        root.classList.toggle('desktop-profile-settings-open',open);
        document.body.classList.toggle('desktop-profile-settings-open',open);
        try{localStorage.setItem('avesso.desktop.profile.settings',open?'1':'0');}catch{}
        const button=q('[data-desktop-profile-settings]',tools);
        if(button)button.textContent=open?'× fechar ajustes':'⚙ ajustes do Canto';
        if(open)setTimeout(()=>q('#desktop-profile-settings-panel')?.scrollIntoView({behavior:'smooth',block:'start'}),30);
      };
      q('[data-desktop-profile-avatar]',tools).onclick=()=>q('#open-avatar-picker')?.click();
      q('#profile-presence')?.addEventListener('change',event=>{
        const value=event.target?.value||'online';
        const presenceEl=q('[data-desktop-profile-presence]',hero);
        if(presenceEl){
          presenceEl.className='desktop-profile-presence '+value;
          presenceEl.innerHTML='<i></i>'+desktopPresenceLabel(value);
        }
      });
      q('#open-avatar-picker',identity)?.classList.add('desktop-profile-original-avatar');
    }

    const layout=document.createElement('div');
    layout.id='desktop-profile-layout';
    layout.className='desktop-profile-layout';
    layout.innerHTML='<main class="desktop-profile-main"></main><aside class="desktop-profile-social"></aside>';
    hero.insertAdjacentElement('afterend',layout);

    const settings=document.createElement('section');
    settings.id='desktop-profile-settings-panel';
    settings.className='desktop-profile-settings-panel';
    settings.innerHTML='<header><div><span>CONFIG.EXE // SEU CANTO</span><h2>Ajustes sem disputar espaço com sua vida social</h2><p>Perfil, privacidade, cenário, trilha, segurança e controles ficam aqui.</p></div><button type="button" data-desktop-profile-settings-close>×</button></header><div class="desktop-profile-settings-content"></div>';
    layout.insertAdjacentElement('afterend',settings);
    q('[data-desktop-profile-settings-close]',settings).onclick=()=>{
      root.classList.remove('desktop-profile-settings-open');
      document.body.classList.remove('desktop-profile-settings-open');
      try{localStorage.setItem('avesso.desktop.profile.settings','0');}catch{}
      const button=q('[data-desktop-profile-settings]');
      if(button)button.textContent='⚙ ajustes do Canto';
    };

    const main=q('.desktop-profile-main',layout);
    const social=q('.desktop-profile-social',layout);
    const settingsContent=q('.desktop-profile-settings-content',settings);

    moveProfileNode(tagProfileNode(q('.profile-story-section',root),'stories'),main,'stories');
    moveProfileNode(tagProfileNode(q('.profile-posts-control',root),'posts'),main,'posts');
    moveProfileNode(tagProfileNode(q('.profile-album-control',root),'album'),main,'album');
    moveProfileNode(tagProfileNode(q('.profile-media-control',root),'media'),main,'media');

    moveProfileNode(tagProfileNode(q('.guestbook-own',root),'guestbook'),social,'guestbook');
    moveProfileNode(tagProfileNode(q('.friends-control',root),'friends'),social,'friends');

    moveProfileNode(tagProfileNode(q('.profile-settings-grid',root),'profile-settings'),settingsContent,'profile-settings');
    moveProfileNode(tagProfileNode(q('.wallpaper-control',root),'wallpaper'),settingsContent,'wallpaper');
    moveProfileNode(tagProfileNode(q('.corner-music-control',root),'corner-music'),settingsContent,'corner-music');
    moveProfileNode(tagProfileNode(q('.blocked-control',root),'blocked'),settingsContent,'blocked');

    const world=q('.world-preferences');
    moveProfileNode(tagProfileNode(world,'world'),settingsContent,'world');

    setupProfileJumpNav({
      root,hero,
      items:[
        {key:'stories',label:'Stories',icon:'◌',selector:'.profile-story-section'},
        {key:'posts',label:'Publicações',icon:'↗',selector:'.profile-posts-control',count:true},
        {key:'album',label:'Álbum',icon:'▧',selector:'.profile-album-control'},
        {key:'media',label:'Mídia',icon:'♫',selector:'.profile-media-control'},
        {key:'guestbook',label:'Recados',icon:'✎',selector:'.guestbook-own'},
        {key:'friends',label:'Amigos',icon:'↔',selector:'.friends-control'},
        {key:'settings',label:'Ajustes',icon:'⚙',selector:'#desktop-profile-settings-panel'}
      ]
    });

    const open=profileSettingsOpen();
    root.classList.toggle('desktop-profile-settings-open',open);
    document.body.classList.toggle('desktop-profile-settings-open',open);
    const settingsButton=q('[data-desktop-profile-settings]');
    if(settingsButton)settingsButton.textContent=open?'× fechar ajustes':'⚙ ajustes do Canto';
  }


  function enhanceContextButtonsIn(root){
    if(!isDesktop()||!root)return;
    const nodes=[];
    if(root.matches?.('.post-card[data-post-card],.album-photo[data-album-photo],.dm-bubble[data-dm-id]:not(.deleted),.friend-row,.public-profile-hero'))nodes.push(root);
    root.querySelectorAll?.('.post-card[data-post-card],.album-photo[data-album-photo],.dm-bubble[data-dm-id]:not(.deleted),.friend-row,.public-profile-hero').forEach(node=>nodes.push(node));
    nodes.forEach(node=>{
      if(q(':scope > .desktop-context-trigger',node)){
        node.classList.add('has-desktop-context');
        return;
      }
      let button=null;
      if(node.matches('.post-card[data-post-card]'))button=contextButton('post',node.dataset.postCard);
      else if(node.matches('.album-photo[data-album-photo]'))button=contextButton('photo',node.dataset.albumPhoto);
      else if(node.matches('.dm-bubble[data-dm-id]:not(.deleted)'))button=contextButton('message',node.dataset.dmId);
      else{
        const id=q('[data-profile-id]',node)?.dataset.profileId;
        if(id)button=contextButton('user',id);
      }
      if(button){
        node.classList.add('has-desktop-context');
        node.appendChild(button);
      }
    });
  }

  function scheduleDesktopSync(){
    if(desktopSyncQueued)return;
    desktopSyncQueued=true;
    requestAnimationFrame(()=>{
      desktopSyncQueued=false;
      syncDesktop();
    });
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
        closeDesktopContextMenu(true);
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
      restoreProfileDesktop();
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
    syncNavAccessibility();
    ensureCommandBar();
    q('#desktop-command-bar')?.classList.remove('desktop-hidden');
    ensureNotificationDrawer();
    ensureLiveAside();
    renderChatShelf();
    ensureChatDesktopEnhancements();
    enhanceProfileDesktop();
    enhancePublicProfileDesktop();
    enhanceContextButtons();
    bindChatDrop();
    refreshNotificationBadge();
    if(!summaryTimer){
      requestSummary();
      summaryTimer=setInterval(requestSummary,45000);
    }
  }

  function boot(){
    bindKeyboard();
    bindDesktopContextMenus();
    const childObserver=new MutationObserver(mutations=>{
      let needsSync=false;
      for(const mutation of mutations){
        mutation.addedNodes.forEach(node=>{
          if(node.nodeType===1)enhanceContextButtonsIn(node);
        });
        const target=mutation.target;
        if(
          target===document.body||
          target?.id==='app-view'||
          target?.id==='feed-list'||
          target?.classList?.contains('feed-column')||
          target?.classList?.contains('profile-control')
        )needsSync=true;
      }
      if(isDesktop()&&!document.body.classList.contains('avesso-own-corner')&&q('.profile-control.desktop-profile-enhanced'))restoreProfileDesktop();
      if(needsSync)scheduleDesktopSync();
    });
    childObserver.observe(document.body,{subtree:true,childList:true});

    const layoutObserver=new MutationObserver(()=>scheduleDesktopSync());
    layoutObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    const appView=q('#app-view');
    if(appView)layoutObserver.observe(appView,{attributes:true,attributeFilter:['class']});
    window.addEventListener('avesso:desktop-summary',e=>renderSummary(e.detail||{}));
    window.addEventListener('avesso:chat-opened',e=>{
      rememberChat(e.detail||{});
      setTimeout(()=>{bindChatDrop();ensureChatDesktopEnhancements();},0);
    });
    window.addEventListener('avesso:notification',event=>{
      rememberDesktopNotification(event.detail||{});
      setTimeout(()=>{
        refreshNotificationBadge();
        if(q('#desktop-notification-drawer')?.classList.contains('open'))renderNotificationDrawer();
      },30);
    });
    navigator.serviceWorker?.addEventListener?.('message',e=>{
      if(e.data?.type==='AVESSO_PUSH_WHILE_VISIBLE'){
        if(e.data.payload)rememberDesktopNotification(e.data.payload);
        setTimeout(()=>{
          refreshNotificationBadge();
          if(q('#desktop-notification-drawer')?.classList.contains('open'))renderNotificationDrawer();
        },60);
      }
    });
    window.addEventListener('storage',event=>{
      if(event.key!==notificationKey())return;
      refreshNotificationBadge();
      if(q('#desktop-notification-drawer')?.classList.contains('open'))renderNotificationDrawer();
    });
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden&&isDesktop()){
        requestSummary();
        scheduleDesktopSync();
      }
    });
    if(typeof media.addEventListener==='function')media.addEventListener('change',syncDesktop);
    else if(typeof media.addListener==='function')media.addListener(syncDesktop);
    let lastDesktopState=isDesktop();
    window.addEventListener('resize',()=>{
      const el=q('#desktop-command-bar small');if(el)el.textContent='desktop // '+window.innerWidth+'×'+window.innerHeight;
      const next=isDesktop();
      if(next!==lastDesktopState){lastDesktopState=next;scheduleDesktopSync();}
    });
    syncDesktop();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();