import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const SITE_URL = new URL('./', import.meta.url).href;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { session:null, profile:null, recipient:null, mode:'signup', tab:'feed', viewVersion:0, postImageFile:null, publicProfileId:null, plazaChannel:null, directChannel:null, directPeerId:null, chatWindowOpen:false, chatWindowMinimized:false, presenceTimer:null, presenceWatchTimer:null, friendPresence:{}, mutedPeers:{}, blockedPeers:{}, pendingAttentionPeerId:null, notificationPermissionArmed:false, notificationRegistration:null, wallpaperTarget:'profile', socialNotificationQueue:[], socialNotificationBusy:false, audioCtx:null, voiceRecorder:null, voiceStream:null, voiceChunks:[], voiceStartedAt:0, voiceTimer:null, voicePeerId:null, storyChannel:null, storyBusy:false, storyTimer:null, storySequence:[], storyCurrentId:null, albumPreloaded:{}, albumUrlCache:{}, world:{preferences:null,settings:null,characters:{},charactersById:{},dialogues:[],idleTimer:null,encounterTimer:null,towerTimer:null,lastInteractionId:null,lastReactiveAt:0,lastNotificationAt:0,recentNotificationKeys:[],notificationQueue:[],notificationBusy:false} };

function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }
function initials(name='?'){ return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function ago(date){ const s=Math.floor((Date.now()-new Date(date))/1000); if(s<60)return'agora'; if(s<3600)return`${Math.floor(s/60)}min`; if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`; }
function escapeHtml(value=''){ const d=document.createElement('div'); d.textContent=value; return d.innerHTML; }
function escapeAttr(value=''){return String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll("'",'&#39;').replaceAll('<','&lt;').replaceAll('>','&gt;');}
function isFeedTab(tab=state.tab){ return ['feed','quiet','sent'].includes(tab); }
function bumpView(){ state.viewVersion+=1; return state.viewVersion; }
const AVATAR_OPTIONS=[
  ['Humano 01','assets/avatars/humano-01.svg','humano'],['Humano 02','assets/avatars/humano-02.svg','humano'],['Humano 03','assets/avatars/humano-03.svg','humano'],
  ['Humana 01','assets/avatars/humana-01.svg','humana'],['Humana 02','assets/avatars/humana-02.svg','humana'],['Humana 03','assets/avatars/humana-03.svg','humana'],
  ['Robô 01','assets/avatars/robo-01.svg','robo'],['Robô 02','assets/avatars/robo-02.svg','robo'],['Robô 03','assets/avatars/robo-03.svg','robo']
];
const WALLPAPER_OPTIONS=[
  ['cidade-56k','Cidade 56K','conectando desde 1998'],
  ['praça-3am','Praça 03:00','ninguém disse que ia embora'],
  ['torre-kpi','Torre KPI','+999% de nada'],
  ['arquivo-morto','Arquivo Morto','você não apagou. só esqueceu'],
  ['jardim-glitch','Jardim Glitch','natureza.exe respondendo'],
  ['servidor-submerso','Servidor Submerso','ping: 20000 anos'],
  ['terapia-do-algoritmo','Terapia do Algoritmo','e como isso fez você clicar?'],
  ['erro-bonito','Erro Bonito','falha crítica, esteticamente agradável'],
  ['lua-de-cache','Lua de Cache','última atualização: talvez'],
  ['humano-nao-encontrado','Humano Não Encontrado','http 418 // continue tentando']
];
const ACID_REACTIONS=[
  ['li_me_arrependi','↩','li e me arrependi'],
  ['infelizmente_concordo','≋','infelizmente eu concordo'],
  ['modem_julgou','⌁','meu modem julgou'],
  ['melhor_offline','□','era melhor ter ficado offline'],
  ['fingir_nao_vi','◌','vou fingir que não vi'],
  ['argumento_carregando','…','argumento carregando...'],
  ['virou_reuniao','▦','isso virou reunião']
];
const AVESSO_EMOTICONS=[
  '☻','☺','ಠ_ಠ','¬_¬','(ง •̀_•́)ง','¯\\_(ツ)_/¯','(╯°□°）╯︵ ┻━┻','┬─┬ ノ( ゜-゜ノ)',
  '[404]','[56K]','[AFK]','[PING?]','[ERRO HUMANO]','<3.exe','...','?!','⚡','⌁','◉','◌','▣','✦',
  '👀','🤨','🫠','🙃','😂','😅','☕','⚠️','🖥️','💾','📟','📼','🌀','🫥','🔥','❤️','🐈','⌛'
];
const STORY_REACTIONS=[
  ['curti','♥','curti sem querer'],
  ['vi','◉','vi. infelizmente'],
  ['modem','⌁','meu modem aprovou'],
  ['pane','⚡','deu pane'],
  ['quatro_zero_quatro','404','isso merece um 404']
];
function avessoEmoticonButtons(attribute='data-emoticon-value'){
  return AVESSO_EMOTICONS.map(value=>`<button type="button" ${attribute}="${escapeAttr(value)}" title="inserir ${escapeAttr(value)}">${escapeHtml(value)}</button>`).join('');
}
function setupFeedEmoticons(){
  const palette=$('#post-emoticon-palette');
  if(!palette)return;
  palette.innerHTML=avessoEmoticonButtons('data-post-emoticon');
  $('#post-emoticons')?.addEventListener('click',e=>{e.stopPropagation();palette.classList.toggle('hidden');});
  palette.querySelectorAll('[data-post-emoticon]').forEach(b=>b.onclick=()=>{
    const input=$('#post-body'); if(!input)return;
    input.value+=`${input.value?' ':''}${b.dataset.postEmoticon}`;
    input.dispatchEvent(new Event('input')); input.focus();
  });
}
const CHAT_THEMES=[
  ['bbs_cyan','BBS Ciano','#22d9ee'],
  ['phosphor_green','Fósforo Verde','#74ff4b'],
  ['dos_amber','DOS Âmbar','#ffbf3f'],
  ['arcade_violet','Arcade Violeta','#9b7cff'],
  ['error_coral','Erro Coral','#ff6257'],
  ['acid_terminal','Terminal Ácido','#d8ff3e'],
  ['janela_95','Janela 95','#8aa8b0'],
  ['midnight_modem','Modem Noturno','#4268a8'],
  ['magenta_crt','CRT Magenta','#ff59d6'],
  ['graphite_dos','Grafite DOS','#7b8588'],
  ['win95_future','Windows 95½','#00a7a7'],
  ['icq_neon','ICQ Neon','#8cff3f'],
  ['winamp_2026','Winamp 2026','#ffb000'],
  ['web98_glass','Web 98 Glass','#5a8cff'],
  ['crt_void','CRT Vazio','#75ff91'],
  ['arcade_os','Arcade OS','#ff4fd8']
];
const CHAT_WALLPAPERS=[['none','Sem fundo','o vazio também é um layout'],...WALLPAPER_OPTIONS];
function chatThemeClass(theme=state.profile?.chat_theme||'bbs_cyan'){
  return CHAT_THEMES.some(x=>x[0]===theme)?`theme-${theme}`:'theme-bbs_cyan';
}
function chatWallpaperCss(slug=state.profile?.chat_wallpaper||'none'){
  return CHAT_WALLPAPERS.some(x=>x[0]===slug)&&slug!=='none'?`url("${wallpaperUrl(slug)}")`:'none';
}
function wallpaperUrl(slug){return `assets/wallpapers/${slug||'cidade-56k'}.webp`;}
function applyAppWallpaper(){
  const useProfileWallpaper=state.tab==='profile';
  const slug=(useProfileWallpaper?state.profile?.profile_wallpaper:state.profile?.app_wallpaper)||'cidade-56k';
  document.documentElement.style.setProperty('--avesso-app-wallpaper',`url("${wallpaperUrl(slug)}")`);
  document.documentElement.dataset.wallpaperSurface=useProfileWallpaper?'profile':'app';
  document.body.classList.add('avesso-app-active');
}

function hydrateStories(rows=[]){
  const ids=[...new Set(rows.map(x=>x.author_id).filter(Boolean))];
  return (async()=>{
    let profiles={};
    if(ids.length){
      const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',ids);
      profiles=Object.fromEntries((data||[]).map(p=>[p.id,p]));
    }
    return Promise.all(rows.map(async row=>{
      let image_url='';
      if(row.image_path){
        const {data}=await supabase.storage.from('avesso-stories').createSignedUrl(row.image_path,300);
        image_url=data?.signedUrl||'';
      }
      return {...row,author:profiles[row.author_id]||{},image_url};
    }));
  })();
}

function storyTimeLeft(expiresAt){
  const ms=Math.max(0,new Date(expiresAt)-Date.now());
  const h=Math.floor(ms/3600000),m=Math.floor((ms%3600000)/60000);
  return h>0?`${h}h ${m}m`:`${Math.max(1,m)}min`;
}

function storyCardHtml(story,{compact=false}={}){
  const a=story.author||{};
  return `<button class="story-card ${compact?'compact':''}" data-story-open="${story.id}" style="${story.image_url?`--story-thumb:url('${escapeAttr(story.image_url)}')`:''}">
    <span class="story-ring"><i>${avatarHtml(a.avatar_url,a.display_name||'?')}</i></span>
    <span class="story-card-copy"><b>${escapeHtml(a.display_name||'humano')}</b><small>${story.visibility==='amigos'?'amigos':'público'} · ${storyTimeLeft(story.expires_at)}</small></span>
  </button>`;
}

async function loadStoriesStrip(){
  const host=$('#stories-zone');
  if(!host||!state.profile||state.tab!=='feed'){host?.classList.add('hidden');return;}
  host.classList.remove('hidden');
  const {data,error}=await supabase.from('stories').select('id,author_id,body,image_path,visibility,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(60);
  if(error){host.innerHTML='<div class="stories-error">stories deram tela azul.</div>';return;}
  const stories=await hydrateStories((data||[]).filter(s=>!isPeerBlocked(s.author_id)));
  const latestByAuthor=[],seen=new Set();
  for(const s of stories){if(!seen.has(s.author_id)){seen.add(s.author_id);latestByAuthor.push(s);}}
  host.innerHTML=`<div class="stories-head"><div><span class="section-code">STORIES // 24H</span><b>temporário, como toda boa decisão na internet</b></div><button id="story-create-feed">＋ postar story</button></div><div class="stories-strip"><button class="story-new-card" id="story-create-feed-card"><span class="story-ring self"><i>${avatarHtml(state.profile.avatar_url,state.profile.display_name)}</i><em>＋</em></span><b>seu story</b><small>24h e acabou</small></button>${latestByAuthor.map(s=>storyCardHtml(s,{compact:true})).join('')}</div>`;
  $('#story-create-feed')?.addEventListener('click',openStoryCreate);
  $('#story-create-feed-card')?.addEventListener('click',openStoryCreate);
  const storySequence=latestByAuthor.map(s=>s.id);
  host.querySelectorAll('[data-story-open]').forEach(b=>b.onclick=()=>openStory(b.dataset.storyOpen,{sequence:storySequence}));
}

function openStoryCreate(){
  const dialog=$('#story-create-dialog');if(!dialog)return;
  $('#story-create-message').textContent='';
  $('#story-body').value='';
  $('#story-image').value='';
  $('#story-visibility').value='publico';
  $('#story-image-preview').classList.add('hidden');
  $('#story-image-preview').innerHTML='';
  if(!dialog.open)dialog.showModal();
  setTimeout(()=>$('#story-body')?.focus(),40);
}

async function publishStory(){
  if(state.storyBusy)return;
  const body=String($('#story-body')?.value||'').trim().slice(0,420);
  const file=$('#story-image')?.files?.[0]||null;
  const visibility=$('#story-visibility')?.value==='amigos'?'amigos':'publico';
  if(!body&&!file)return toast('Story vazio dura zero horas. Eficiência admirável, utilidade discutível.');
  if(file&&file.size>8*1024*1024)return toast('Imagem de story: até 8 MB. A fita VHS agradece.');
  if(file&&!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))return toast('Story aceita JPG, PNG, WEBP ou GIF.');
  state.storyBusy=true;
  const btn=$('#story-publish');if(btn){btn.disabled=true;btn.textContent='subindo para a internet...';}
  let created=null,imagePath=null;
  try{
    const ins=await supabase.from('stories').insert({author_id:state.profile.id,body,visibility}).select().single();
    if(ins.error)throw ins.error;
    created=ins.data;
    if(file){
      imagePath=`${state.profile.id}/${created.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const up=await supabase.storage.from('avesso-stories').upload(imagePath,file,{cacheControl:'86400',upsert:false,contentType:file.type});
      if(up.error)throw up.error;
      const upd=await supabase.from('stories').update({image_path:imagePath}).eq('id',created.id);
      if(upd.error)throw upd.error;
    }
    $('#story-create-dialog')?.close();
    toast('Story publicado. O relógio de 24h já está julgando.');
    trackAction('story_posted','stories',{visibility,has_image:Boolean(file)});
    await loadStoriesStrip();
    if(state.tab==='profile')loadProfileStories(state.profile.id,'#profile-story-list');
  }catch(err){
    if(imagePath)await supabase.storage.from('avesso-stories').remove([imagePath]);
    if(created?.id)await supabase.from('stories').delete().eq('id',created.id);
    console.error('story publish',err);
    toast('O story caiu antes de completar 24 horas.');
  }finally{
    state.storyBusy=false;if(btn){btn.disabled=false;btn.textContent='publicar por 24h';}
  }
}

async function loadProfileStories(userId,selector){
  const host=$(selector);if(!host||!userId)return;
  const {data,error}=await supabase.from('stories').select('id,author_id,body,image_path,visibility,created_at,expires_at').eq('author_id',userId).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(20);
  if(error){host.innerHTML='<p class="story-empty">Os stories se perderam no cache.</p>';return;}
  const stories=await hydrateStories(data||[]);
  host.innerHTML=stories.map(s=>storyCardHtml(s)).join('')||'<p class="story-empty">Nenhum story ativo. A internet sobreviveu.</p>';
  const storySequence=stories.map(s=>s.id);
  host.querySelectorAll('[data-story-open]').forEach(b=>b.onclick=()=>openStory(b.dataset.storyOpen,{sequence:storySequence}));
}


const STORY_VIEW_MS=10000;
function clearStoryTimer(){
  if(state.storyTimer){clearTimeout(state.storyTimer);state.storyTimer=null;}
}
function closeStoryViewer(){
  clearStoryTimer();
  state.storyCurrentId=null;
  const dialog=$('#story-view-dialog');
  if(dialog?.open)dialog.close();
}
function scheduleStoryAdvance(){
  clearStoryTimer();
  const dialog=$('#story-view-dialog');
  if(!dialog?.open||!state.storyCurrentId)return;
  state.storyTimer=setTimeout(()=>{
    const currentIndex=state.storySequence.indexOf(state.storyCurrentId);
    const nextId=currentIndex>=0?state.storySequence[currentIndex+1]:null;
    if(nextId)openStory(nextId,{sequence:state.storySequence,auto:true});
    else closeStoryViewer();
  },STORY_VIEW_MS);
}
function pauseStoryTimer(){clearStoryTimer();}
function resumeStoryTimer(){if($('#story-view-dialog')?.open)scheduleStoryAdvance();}

async function openStory(storyId,options={}){
  const {data:story,error}=await supabase.from('stories').select('id,author_id,body,image_path,visibility,created_at,expires_at').eq('id',storyId).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!story)return toast('Este story expirou ou você não pode vê-lo. O tempo venceu outra vez.');
  if(isPeerBlocked(story.author_id))return toast('Este usuário está bloqueado. O story ficou do outro lado da porta.');
  const suppliedSequence=Array.isArray(options.sequence)?options.sequence.filter(Boolean):[];
  if(suppliedSequence.length)state.storySequence=[...new Set(suppliedSequence)];
  else if(!state.storySequence.includes(storyId))state.storySequence=[storyId];
  state.storyCurrentId=storyId;
  clearStoryTimer();
  const [authorRes,reactionsRes,commentsRes]=await Promise.all([
    supabase.from('profiles').select('id,display_name,handle,avatar_url').eq('id',story.author_id).maybeSingle(),
    supabase.from('story_reactions').select('story_id,user_id,reaction,created_at').eq('story_id',story.id),
    supabase.from('story_comments').select('id,story_id,user_id,body,created_at').eq('story_id',story.id).order('created_at',{ascending:true}).limit(120)
  ]);
  let image_url='';
  if(story.image_path){
    const signed=await supabase.storage.from('avesso-stories').createSignedUrl(story.image_path,300);
    image_url=signed.data?.signedUrl||'';
  }
  const comments=commentsRes.data||[],commentIds=[...new Set(comments.map(x=>x.user_id))];
  let commentProfiles={};
  if(commentIds.length){
    const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',commentIds);
    commentProfiles=Object.fromEntries((data||[]).map(p=>[p.id,p]));
  }
  const reactions=reactionsRes.data||[];
  const reactionHtml=STORY_REACTIONS.map(([id,icon,label])=>{
    const rows=reactions.filter(x=>x.reaction===id),active=rows.some(x=>x.user_id===state.profile.id);
    return `<button class="story-reaction ${active?'active':''}" data-story-react="${id}"><span>${icon}</span>${label}${rows.length?` <b>${rows.length}</b>`:''}</button>`;
  }).join('');
  const a=authorRes.data||{},canDelete=story.author_id===state.profile.id;
  const commentsHtml=comments.map(row=>{const p=commentProfiles[row.user_id]||{};return `<article class="story-comment"><span class="mini-avatar">${avatarHtml(p.avatar_url,p.display_name||'?')}</span><div><b>${escapeHtml(p.display_name||'alguém')}</b><small>@${escapeHtml(p.handle||'...')} · ${ago(row.created_at)}</small><p>${escapeHtml(row.body)}</p></div></article>`;}).join('')||'<p class="story-empty">Sem comentários. O silêncio também expira.</p>';
  const host=$('#story-view-content');
  host.innerHTML=`<article class="story-view-card">
    <header><span class="story-ring"><i>${avatarHtml(a.avatar_url,a.display_name||'?')}</i></span><div><b>${escapeHtml(a.display_name||'humano')}</b><small>@${escapeHtml(a.handle||'...')} · ${story.visibility==='amigos'?'só amigos':'público'} · expira em ${storyTimeLeft(story.expires_at)}</small></div>${canDelete?'<button id="story-delete" class="story-delete">apagar</button>':''}</header>
    <div class="story-stage ${image_url?'has-image':''}" style="${image_url?`--story-image:url('${escapeAttr(image_url)}')`:''}">${image_url?`<img src="${escapeAttr(image_url)}" alt="Story de ${escapeAttr(a.display_name||'usuário')}" decoding="async" fetchpriority="high">`:''}${story.body?`<p>${escapeHtml(story.body)}</p>`:''}</div>
    <div class="story-reactions">${reactionHtml}</div>
    <section class="story-comments"><h3>respostas // sem plateia</h3><div class="story-comment-list">${commentsHtml}</div><div class="story-comment-compose"><textarea id="story-comment-body" maxlength="420" placeholder="responda antes que isso desapareça..."></textarea><div><button id="story-comment-emoticons" type="button">☻ avessícones</button><button id="story-comment-send" type="button">responder</button></div><div id="story-comment-palette" class="feed-emoticon-palette hidden">${avessoEmoticonButtons('data-story-comment-emoticon')}</div></div></section>
  </article>`;
  const dialog=$('#story-view-dialog');if(!dialog.open)dialog.showModal();
  host.querySelectorAll('[data-story-react]').forEach(b=>b.onclick=()=>toggleStoryReaction(story.id,b.dataset.storyReact));
  $('#story-comment-send').onclick=()=>sendStoryComment(story.id);
  $('#story-comment-emoticons').onclick=()=>$('#story-comment-palette').classList.toggle('hidden');
  host.querySelectorAll('[data-story-comment-emoticon]').forEach(b=>b.onclick=()=>{const input=$('#story-comment-body');if(input){input.value+=`${input.value?' ':''}${b.dataset.storyCommentEmoticon}`;input.focus();}});
  const commentInput=$('#story-comment-body');
  commentInput?.addEventListener('focus',pauseStoryTimer);
  commentInput?.addEventListener('blur',resumeStoryTimer);
  if(canDelete)$('#story-delete').onclick=()=>deleteStory(story);
  scheduleStoryAdvance();
}

async function toggleStoryReaction(storyId,reaction){
  if(!STORY_REACTIONS.some(x=>x[0]===reaction))return;
  const {data:existing}=await supabase.from('story_reactions').select('reaction').eq('story_id',storyId).eq('user_id',state.profile.id).maybeSingle();
  const result=existing?.reaction===reaction
    ?await supabase.from('story_reactions').delete().eq('story_id',storyId).eq('user_id',state.profile.id)
    :await supabase.from('story_reactions').upsert({story_id:storyId,user_id:state.profile.id,reaction},{onConflict:'story_id,user_id'});
  if(result.error)return toast('A reação ao story teve uma reação adversa.');
  trackAction('story_reaction','stories',{story_id:storyId,reaction});
  openStory(storyId,{sequence:state.storySequence});
}

async function sendStoryComment(storyId){
  const input=$('#story-comment-body'),body=String(input?.value||'').trim().slice(0,420);
  if(!body)return toast('Resposta vazia é só telepatia com interface.');
  const {error}=await supabase.from('story_comments').insert({story_id:storyId,user_id:state.profile.id,body});
  if(error)return toast('A resposta não chegou ao story.');
  input.value='';trackAction('story_reply','stories',{story_id:storyId});openStory(storyId,{sequence:state.storySequence});
}

async function deleteStory(story){
  if(!confirm('Apagar este story agora? Ele já estava com os dias contados.'))return;
  if(story.image_path)await supabase.storage.from('avesso-stories').remove([story.image_path]);
  const {error}=await supabase.from('stories').delete().eq('id',story.id).eq('author_id',state.profile.id);
  if(error)return toast('O story se recusou a morrer antes do prazo.');
  closeStoryViewer();toast('Story apagado.');
  loadStoriesStrip();
  if(state.tab==='profile')loadProfileStories(state.profile.id,'#profile-story-list');
}

async function notifyStoryEvent(row){
  if(!row||row.recipient_id!==state.profile?.id)return;
  const actor=await profileById(row.actor_id);
  const label=row.kind==='comment'?'respondeu ao seu story':`reagiu ao seu story: ${STORY_REACTIONS.find(x=>x[0]===row.reaction)?.[2]||'reação'}`;
  socialNotify({title:'STORY.EXE',body:`${actor?.display_name||'Alguém'} ${label}.`,avatar:actor?.avatar_url||'',kind:'story',action:()=>openStory(row.story_id)});
  await supabase.from('story_notifications').update({read_at:new Date().toISOString()}).eq('id',row.id).eq('recipient_id',state.profile.id);
}

async function loadStoryNotifications(){
  if(!state.profile?.id)return;
  const {data}=await supabase.from('story_notifications').select('*').eq('recipient_id',state.profile.id).is('read_at',null).order('created_at',{ascending:false}).limit(5);
  for(const row of [...(data||[])].reverse())await notifyStoryEvent(row);
}

function startStoryRealtime(){
  if(state.storyChannel||!state.profile?.id)return;
  state.storyChannel=supabase.channel(`avesso-stories-${state.profile.id}-${Date.now()}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'stories'},()=>{if(isFeedTab())loadStoriesStrip();if(state.tab==='profile')loadProfileStories(state.profile.id,'#profile-story-list');})
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'story_notifications',filter:`recipient_id=eq.${state.profile.id}`},payload=>notifyStoryEvent(payload.new))
    .subscribe();
}

function stopStoryRealtime(){
  if(state.storyChannel)supabase.removeChannel(state.storyChannel);
  state.storyChannel=null;
}
function audioContext(){
  try{
    if(!state.audioCtx)state.audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(state.audioCtx.state==='suspended')state.audioCtx.resume().catch(()=>{});
    return state.audioCtx;
  }catch{return null;}
}
function playUiSound(kind='message'){
  const ctx=audioContext();if(!ctx)return;
  const now=ctx.currentTime;
  const tones=kind==='attention'?[660,880,660,1040,880,1170]:kind==='friend'?[520,660]:kind==='online'?[523,659,784]:kind==='guestbook'?[494,659,740]:[740,880];
  tones.forEach((freq,i)=>{
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=kind==='attention'?'square':'sine';o.frequency.value=freq;
    g.gain.setValueAtTime(0.0001,now+i*.11);
    g.gain.exponentialRampToValueAtTime(kind==='attention'?.08:.045,now+i*.11+.015);
    g.gain.exponentialRampToValueAtTime(0.0001,now+i*.11+.09);
    o.connect(g);g.connect(ctx.destination);o.start(now+i*.11);o.stop(now+i*.11+.1);
  });
}
document.addEventListener('pointerdown',()=>audioContext(),{once:true});
function ensureSocialNotifyHost(){
  let host=$('#social-notifications');
  if(!host){host=document.createElement('div');host.id='social-notifications';host.className='social-notifications';document.body.appendChild(host);}
  return host;
}
function notificationPermissionLabel(){
  if(!('Notification' in window))return'notificações indisponíveis';
  if(Notification.permission==='granted')return'notificações ativas';
  if(Notification.permission==='denied')return'notificações bloqueadas';
  return'ativar notificações';
}
async function requestBrowserNotifications({quiet=false}={}){
  if(!('Notification' in window)){if(!quiet)toast('Este navegador não oferece notificações do sistema.');return false;}
  if(Notification.permission==='granted')return true;
  if(Notification.permission==='denied'){if(!quiet)toast('As notificações foram bloqueadas no navegador. Libere a permissão do site para voltar a 2006 com dignidade.');return false;}
  try{
    const result=await Notification.requestPermission();
    if(!quiet)toast(result==='granted'?'Notificações ativadas. Seus amigos agora podem interromper sua produtividade oficialmente.':'Sem permissão, o AVESSO só consegue avisar dentro da própria aba.');
    return result==='granted';
  }catch{return false;}
}
function armBrowserNotifications(){
  if(state.notificationPermissionArmed||!('Notification' in window)||Notification.permission!=='default')return;
  state.notificationPermissionArmed=true;
  const ask=()=>{state.notificationPermissionArmed=false;requestBrowserNotifications({quiet:true});};
  document.addEventListener('pointerdown',ask,{once:true,capture:true});
}
async function registerNotificationWorker(){
  if(state.notificationRegistration||!('serviceWorker' in navigator))return state.notificationRegistration;
  try{
    state.notificationRegistration=await navigator.serviceWorker.register(new URL('sw.js',SITE_URL).href,{scope:new URL('./',SITE_URL).pathname});
    return state.notificationRegistration;
  }catch{return null;}
}
async function browserNotify({title='AVESSO',body='',avatar='',kind='message',action=null}={}){
  if(!document.hidden||!('Notification' in window)||Notification.permission!=='granted')return;
  const icon=avatar?new URL(avatar,SITE_URL).href:new URL('assets/avatars/robo-01.svg',SITE_URL).href;
  const options={
    body,
    icon,
    badge:new URL('assets/avatars/robo-01.svg',SITE_URL).href,
    tag:`avesso-${kind}-${title}`,
    renotify:true,
    silent:false,
    data:{url:SITE_URL,kind}
  };
  try{
    const registration=await registerNotificationWorker();
    if(registration?.showNotification){await registration.showNotification(title,options);return;}
    const n=new Notification(title,options);
    n.onclick=()=>{window.focus();n.close();if(typeof action==='function')action();};
    setTimeout(()=>n.close(),9000);
  }catch{}
}
function socialNotify({title='AVESSO',body='',avatar='',kind='message',action=null,sound=true}={}){
  const item={title,body,avatar,kind,action,sound};
  state.socialNotificationQueue.push(item);
  if(state.socialNotificationQueue.length>6)state.socialNotificationQueue.shift();
  browserNotify(item);
  runSocialNotificationQueue();
}
function runSocialNotificationQueue(){
  if(state.socialNotificationBusy)return;
  const item=state.socialNotificationQueue.shift();if(!item)return;
  state.socialNotificationBusy=true;
  const host=ensureSocialNotifyHost();
  const card=document.createElement('button');
  card.type='button';card.className='social-notification';
  card.innerHTML=`${item.avatar?`<span class="social-notification-avatar"><img src="${escapeAttr(item.avatar)}" alt=""></span>`:''}<span><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.body)}</small></span><i>×</i>`;
  host.appendChild(card);
  const dismiss=()=>{card.classList.remove('show');card.classList.add('hide');setTimeout(()=>{card.remove();state.socialNotificationBusy=false;runSocialNotificationQueue();},430);};
  card.onclick=()=>{dismiss();if(typeof item.action==='function')item.action();};
  requestAnimationFrame(()=>requestAnimationFrame(()=>card.classList.add('show')));
  if(item.sound!==false)playUiSound(item.kind==='friend'?'friend':item.kind==='attention'?'attention':item.kind==='online'?'online':item.kind==='guestbook'?'guestbook':'message');
  setTimeout(dismiss,5000);
}
function presenceView(profile){
  if(!profile)return{mode:'offline',label:'offline'};
  if(profile.presence_mode==='invisible')return{mode:'offline',label:'offline'};
  if(profile.presence_mode==='away')return{mode:'away',label:'ausente'};
  const fresh=profile.last_seen&&Date.now()-new Date(profile.last_seen).getTime()<120000;
  return fresh?{mode:'online',label:'online'}:{mode:'away',label:'ausente'};
}
async function setPresenceMode(mode){
  if(!['online','away','invisible'].includes(mode)||!state.profile)return;
  const {data,error}=await supabase.from('profiles').update({presence_mode:mode,last_seen:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error)return toast('Seu estado social entrou em estado quântico.');
  state.profile=data;startPresenceHeartbeat();
  const sel=$('#presence-mode-select');if(sel)sel.value=mode;
  const profileSel=$('#profile-presence');if(profileSel)profileSel.value=mode;
  toast(mode==='invisible'?'Você ficou invisível. Parabéns por redescobrir o MSN.':mode==='away'?'Ausente. Presente o suficiente para configurar isso.':'Online. A internet foi avisada.');
}
function startPresenceHeartbeat(){
  clearInterval(state.presenceTimer);
  if(!state.profile?.id)return;
  const beat=()=>{if(!state.profile||state.profile.presence_mode==='invisible'||document.hidden)return;supabase.from('profiles').update({last_seen:new Date().toISOString()}).eq('id',state.profile.id).then(()=>{});};
  beat();state.presenceTimer=setInterval(beat,45000);
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden||!state.profile)return;
  startPresenceHeartbeat();
  if(state.pendingAttentionPeerId){
    const peerId=state.pendingAttentionPeerId;
    state.pendingAttentionPeerId=null;
    openChatWindow(peerId).then(()=>{triggerScreenNudge();triggerChatNudge(peerId);});
  }
});
const PHOTO_REACTIONS=[
  ['nao_foi_horrivel','♥','não foi horrível'],
  ['eu_vi','◉','eu vi'],
  ['pixel_aprovado','▣','pixel aprovado'],
  ['quase_arte','✦','quase arte']
];
function publicAlbumUrl(path){
  if(!path)return '';
  if(state.albumUrlCache[path])return state.albumUrlCache[path];
  const url=supabase.storage.from('avesso-albums').getPublicUrl(path).data.publicUrl;
  state.albumUrlCache[path]=url;
  return url;
}
function warmAlbumImages(urls=[]){
  urls.slice(0,16).forEach((url,index)=>{
    if(!url||state.albumPreloaded[url])return;
    const img=new Image();
    img.decoding='async';
    if(index<6)img.fetchPriority='high';
    img.src=url;
    state.albumPreloaded[url]=true;
  });
}
function guestbookImageUrl(path){return supabase.storage.from('avesso-recados').getPublicUrl(path).data.publicUrl;}
function richText(value=''){const escaped=escapeHtml(value).replace(/\n/g,'<br>');return escaped.replace(/(https?:\/\/[^\s<]+)/g,'<a class="guestbook-link" href="$1" target="_blank" rel="noopener noreferrer">$1</a>');}
function safeFileName(name='arquivo'){return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(-90)||'arquivo';}

async function loadBlockedPeers(){
  if(!state.profile?.id)return;
  const {data,error}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',state.profile.id);
  if(error){state.blockedPeers={};return;}
  state.blockedPeers=Object.fromEntries((data||[]).map(row=>[row.blocked_id,true]));
}
function isPeerBlocked(peerId){return Boolean(peerId&&state.blockedPeers?.[peerId]);}

async function loadMutedPeers(){
  if(!state.profile?.id)return;
  const {data}=await supabase.from('mutes').select('muted_id').eq('muter_id',state.profile.id);
  state.mutedPeers=Object.fromEntries((data||[]).map(row=>[row.muted_id,true]));
}
function isPeerMuted(peerId){return Boolean(peerId&&state.mutedPeers?.[peerId]);}
async function toggleMutePeer(peerId){
  if(!peerId)return false;
  const muted=isPeerMuted(peerId);
  const result=muted
    ?await supabase.from('mutes').delete().eq('muter_id',state.profile.id).eq('muted_id',peerId)
    :await supabase.from('mutes').insert({muter_id:state.profile.id,muted_id:peerId});
  if(result.error){toast('O botão de silêncio fez barulho no banco. Tente de novo.');return muted;}
  if(muted)delete state.mutedPeers[peerId];else state.mutedPeers[peerId]=true;
  toast(muted?'Contato desmutado. Os bipes voltaram ao mercado.':'Contato mutado. Mensagens chegam, sua paz fica menos negociável.');
  if(state.chatWindowOpen&&state.directPeerId===peerId)openChatWindow(peerId,{keepMinimized:true});
  return !muted;
}
async function setChatTheme(theme){
  if(!CHAT_THEMES.some(x=>x[0]===theme)||!state.profile?.id)return;
  const {data,error}=await supabase.from('profiles').update({chat_theme:theme,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error)return toast('A tinta digital derramou antes de chegar na janela.');
  state.profile=data;
  if(state.chatWindowOpen&&state.directPeerId)openChatWindow(state.directPeerId,{keepMinimized:true});
}
async function setChatWallpaper(slug){
  if(!CHAT_WALLPAPERS.some(x=>x[0]===slug)||!state.profile?.id)return;
  const {data,error}=await supabase.from('profiles').update({chat_wallpaper:slug,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error)return toast('O papel de parede caiu atrás do modem.');
  state.profile=data;
  if(state.chatWindowOpen&&state.directPeerId)openChatWindow(state.directPeerId,{keepMinimized:true});
}
async function blockChatPeer(peerId){
  if(!peerId||peerId===state.profile?.id)return;
  const peer=await profileById(peerId);
  if(!confirm(`Bloquear ${peer?.display_name||'este usuário'}? A amizade será encerrada e novas mensagens serão recusadas.`))return;
  const {error}=await supabase.from('blocks').upsert({blocker_id:state.profile.id,blocked_id:peerId},{onConflict:'blocker_id,blocked_id'});
  if(error)return toast('O bloqueio encontrou uma porta bloqueada. Ironicamente.');
  const friendship=await getFriendshipWith(peerId);
  if(friendship)await supabase.from('friendships').delete().eq('id',friendship.id);
  await supabase.from('mutes').delete().eq('muter_id',state.profile.id).eq('muted_id',peerId);
  state.blockedPeers[peerId]=true;
  delete state.mutedPeers[peerId];
  delete state.friendPresence[peerId];
  closeChatWindow(true);
  if(state.tab==='messages')renderMessagesPage();
  if(isFeedTab()){loadFeed();if(state.tab==='feed')loadStoriesStrip();}
  toast(`${peer?.display_name||'Usuário'} foi bloqueado. Ele também saiu do seu feed.`);
}
async function unblockPeer(peerId){
  if(!peerId||!state.profile?.id)return;
  const button=document.querySelector(`[data-unblock="${CSS.escape(peerId)}"]`);
  if(button){button.disabled=true;button.textContent='desbloqueando...';}
  const {data,error}=await supabase.from('blocks').delete().eq('blocker_id',state.profile.id).eq('blocked_id',peerId).select('blocked_id');
  if(error){
    if(button){button.disabled=false;button.textContent='desbloquear';}
    console.error('unblock failed',error);
    return toast('O desbloqueio tropeçou na maçaneta.');
  }
  if(!data?.length){
    await loadBlockedPeers();
    loadBlockedPanel();
    return toast('Esse bloqueio já não existia. A interface estava atrasada.');
  }
  delete state.blockedPeers[peerId];
  await loadBlockedPanel();
  if(isFeedTab()){loadFeed();if(state.tab==='feed')loadStoriesStrip();}
  toast('Usuário desbloqueado. A amizade não volta sozinha, porque até botão precisa de limites.');
}
async function loadBlockedPanel(){
  const host=$('#blocked-panel');if(!host||!state.profile?.id)return;
  const {data:rows,error}=await supabase.from('blocks').select('blocked_id,created_at').eq('blocker_id',state.profile.id).order('created_at',{ascending:false});
  if(error){host.innerHTML='<p>Não foi possível consultar os bloqueios.</p>';return;}
  const ids=(rows||[]).map(x=>x.blocked_id);
  state.blockedPeers=Object.fromEntries(ids.map(id=>[id,true]));
  if(!ids.length){host.innerHTML='<p>Ninguém bloqueado. A paz pode ser temporária.</p>';return;}
  const {data:profiles}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',ids);
  const map=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  host.innerHTML=(rows||[]).map(row=>{const p=map[row.blocked_id]||{};return `<div class="blocked-row"><span class="mini-avatar">${avatarHtml(p.avatar_url,p.display_name||'?')}</span><div><b>${escapeHtml(p.display_name||'usuário')}</b><small>@${escapeHtml(p.handle||'...')}</small></div><button data-unblock="${row.blocked_id}">desbloquear</button></div>`;}).join('');
  $$('[data-unblock]').forEach(b=>b.onclick=()=>unblockPeer(b.dataset.unblock));
}

function avatarHtml(url,name='?'){ return url?`<img src="${escapeAttr(url)}" alt="" loading="lazy">`:escapeHtml(initials(name)); }
function renderNavAvatar(){ const el=$('#nav-avatar'); if(el)el.innerHTML=avatarHtml(state.profile?.avatar_url,state.profile?.display_name||'?'); }
function characterSpriteClass(character){ return ''; }
function characterVisual(character,extra=''){
  const src=characterImage(character);
  return `<img class="character-hq ${extra}" src="${escapeAttr(src)}" alt="${escapeAttr(character?.name||'Habitante')}" loading="lazy">`;
}
async function trackAction(action_type,surface=state.tab,metadata={}){
  if(!state.profile?.id)return;
  const clean={};
  Object.entries(metadata||{}).slice(0,8).forEach(([k,v])=>clean[String(k).slice(0,40)]=String(v).slice(0,100));
  supabase.from('user_actions').insert({user_id:state.profile.id,action_type:String(action_type).slice(0,80),surface:String(surface||'app').slice(0,40),metadata:clean}).then(()=>{});
}

function weightedPick(items=[]){
  if(!items.length)return null;
  const total=items.reduce((sum,item)=>sum+Math.max(1,Number(item.weight)||1),0);
  let cursor=Math.random()*total;
  for(const item of items){cursor-=Math.max(1,Number(item.weight)||1);if(cursor<=0)return item;}
  return items[items.length-1];
}
function algoSay(context='feed_default'){
  const el=$('#algo-line');
  if(!el)return;
  const contextual=state.world.dialogues.filter(d=>d.context===context);
  const fallback=state.world.dialogues.filter(d=>d.context==='feed_default');
  const line=weightedPick(contextual.length?contextual:fallback);
  el.textContent=line?.body||'Estou tentando organizar pessoas sem transformá-las em gráfico. É um ambiente de trabalho hostil.';
}
function characterImage(character){ return character?.avatar_url||character?.image_path||''; }
function paintEncounter(payload,preview=false){
  const card=$('#world-encounter');
  if(!card||!payload?.character)return;
  const interaction=payload.interaction||{};
  const c=payload.character;
  const known=state.world.characters[c.slug]||c;
  const image=$('#encounter-image');
  image.className='encounter-image';
  image.innerHTML=characterVisual(known,'encounter-character-hq');
  image.setAttribute('aria-label',c.name||known.name||'Habitante');
  $('#encounter-name').textContent=c.name||known.name||'Habitante';
  $('#encounter-role').textContent=c.role||known.role||'habitante do AVESSO';
  $('#encounter-line').textContent=interaction.body||payload.text||'...';
  $('#encounter-source').textContent=preview?'ARQUIVO DO HABITANTE':(interaction.source==='ai'||payload.ai?'MUNDO // AO VIVO':'MUNDO // ROTEIRO');
}
function encounterKey(payload){
  const c=payload?.character||{};
  const interaction=payload?.interaction||{};
  return `${c.slug||c.id||c.name||'habitante'}|${String(interaction.body||payload?.text||'').trim().slice(0,120)}`;
}
function runEncounterQueue(){
  if(state.world.notificationBusy)return;
  const next=state.world.notificationQueue.shift();
  if(!next)return;
  const now=Date.now();
  if(!next.preview&&(state.socialNotificationBusy||now-state.world.lastNotificationAt<90000)){
    state.world.notificationQueue.length=0;
    return;
  }
  state.world.notificationBusy=true;
  const card=$('#world-encounter');
  paintEncounter(next.payload,next.preview);
  card.classList.remove('hidden','msn-out');
  requestAnimationFrame(()=>requestAnimationFrame(()=>card.classList.add('msn-in')));
  clearTimeout(state.world.encounterTimer);
  state.world.encounterTimer=setTimeout(()=>dismissEncounter(),5000);
}
function dismissEncounter(){
  const card=$('#world-encounter');
  if(!card)return;
  clearTimeout(state.world.encounterTimer);
  card.classList.remove('msn-in');
  card.classList.add('msn-out');
  setTimeout(()=>{
    card.classList.add('hidden');
    card.classList.remove('msn-out');
    state.world.notificationBusy=false;
    state.world.lastNotificationAt=Date.now();
    state.world.notificationQueue.length=0;
  },480);
}
function showEncounter(payload,preview=false){
  if(!payload?.character)return;
  const interaction=payload.interaction||{};
  if(!preview&&interaction.id&&interaction.id===state.world.lastInteractionId)return;
  if(!preview&&interaction.id)state.world.lastInteractionId=interaction.id;
  const key=encounterKey(payload);
  if(!preview&&state.world.recentNotificationKeys.includes(key))return;
  if(!preview&&(state.world.notificationBusy||state.socialNotificationBusy||Date.now()-state.world.lastNotificationAt<90000))return;
  state.world.recentNotificationKeys=[key,...state.world.recentNotificationKeys.filter(x=>x!==key)].slice(0,8);
  state.world.notificationQueue=[{payload,preview}];
  runEncounterQueue();
}
function maybeWorldCharacter(trigger,options={},chance=.16,cooldown=180000){
  const now=Date.now();
  if(!state.session||!state.profile||state.world.notificationBusy||state.socialNotificationBusy)return null;
  if(now-state.world.lastReactiveAt<cooldown||now-state.world.lastNotificationAt<90000)return null;
  if(Math.random()>chance)return null;
  state.world.lastReactiveAt=now;
  return askWorldCharacter(trigger,options);
}
async function askWorldCharacter(trigger,options={}){
  if(!state.session||!state.profile)return null;
  try{
    const {data,error}=await supabase.functions.invoke('world-character',{body:{
      trigger,
      character:options.character||null,
      post_id:options.post_id||null,
      action_type:options.action_type||null,
      surface:options.surface||state.tab||'app',
      metadata:options.metadata||{}
    }});
    if(error||!data||data.skipped)return null;
    if(!options.silent)showEncounter(data);
    return data;
  }catch(e){
    console.warn('O Mundo do AVESSO ficou quieto:',e);
    return null;
  }
}
function scheduleIdleWorld(){
  clearTimeout(state.world.idleTimer);
  if(!state.session)return;
  const delay=(6+Math.random()*6)*60*1000;
  state.world.idleTimer=setTimeout(async()=>{
    if(state.tab==='tower') await askWorldCharacter('tower_pulse',{character:'rei_engajamento',action_type:'idle_tower',surface:'tower'});
    else if(state.tab==='plaza') { /* a Praça fala dentro do chat, não por cima dele */ }
    else await askWorldCharacter('idle');
    scheduleIdleWorld();
  },delay);
}
function setWorldModeLabel(){
  const mode=state.world.preferences?.participation_mode||'world';
  const visualOnline=Boolean(state.world.settings?.world_interventions_enabled);
  const labels={
    observer:'OBSERVADOR // interações pessoais desligadas',
    world:'MUNDO // visitas e falas ativas',
    chaos:visualOnline?'CAOS // 404 e interferências visuais liberados':'CAOS // 404 autorizado; sabotagens visuais em preparação'
  };
  const profileStatus=$('#profile-world-status');
  if(profileStatus)profileStatus.textContent=labels[mode]||mode.toUpperCase();
}
async function loadWorldState(){
  if(!state.profile?.id)return;
  const [prefsRes,settingsRes,charsRes]=await Promise.all([
    supabase.from('user_world_preferences').select('*').eq('user_id',state.profile.id).maybeSingle(),
    supabase.from('world_settings').select('*').eq('id','global').maybeSingle(),
    supabase.from('characters').select('id,slug,name,role,bio,accent_color,image_path,avatar_url,personality,home_location,presence_state').eq('is_active',true)
  ]);
  let prefs=prefsRes.data;
  if(!prefs&&!prefsRes.error){
    const created=await supabase.from('user_world_preferences').upsert({user_id:state.profile.id},{onConflict:'user_id'}).select().single();
    prefs=created.data;
  }
  state.world.preferences=prefs||{user_id:state.profile.id,participation_mode:'world',allow_post_interference:false,allow_profile_interference:false,allow_character_visits:true};
  state.world.settings=settingsRes.data||{id:'global',world_events_enabled:true,world_interventions_enabled:false};
  state.world.characters=Object.fromEntries((charsRes.data||[]).map(c=>[c.slug,c]));
  state.world.charactersById=Object.fromEntries((charsRes.data||[]).map(c=>[c.id,c]));
  state.world.dialogues=[];
  const algo=state.world.characters.algo;
  if(algo){
    const {data}=await supabase.from('character_dialogues').select('context,body,weight').eq('character_id',algo.id).eq('enabled',true);
    state.world.dialogues=data||[];
  }
  setWorldModeLabel();
  algoSay('feed_default');
}
async function saveWorldMode(mode){
  if(!['observer','world','chaos'].includes(mode)||!state.profile?.id)return;
  if(mode==='chaos'&&!confirm('Modo CAOS autoriza o 404 a interagir pessoalmente e, quando o motor visual for liberado, fazer sabotagens cosméticas reversíveis. Seu conteúdo original continua intocável. Ativar?'))return;
  const patch={
    participation_mode:mode,
    allow_post_interference:mode==='chaos',
    allow_profile_interference:mode==='chaos',
    allow_character_visits:mode!=='observer'
  };
  document.querySelectorAll('[data-world-mode]').forEach(b=>b.disabled=true);
  let {data,error}=await supabase.from('user_world_preferences')
    .update(patch)
    .eq('user_id',state.profile.id)
    .select()
    .maybeSingle();
  if(!error&&!data){
    const created=await supabase.from('user_world_preferences')
      .upsert({user_id:state.profile.id,...patch},{onConflict:'user_id'})
      .select()
      .single();
    data=created.data; error=created.error;
  }
  if(error||!data){
    document.querySelectorAll('[data-world-mode]').forEach(b=>b.disabled=false);
    console.error('world mode update failed',error);
    return toast('O modo não foi salvo. O sistema tropeçou na própria configuração.');
  }
  state.world.preferences=data;
  renderProfile();
  setWorldModeLabel();
  const messages={
    observer:'OBSERVADOR ativo. O mundo continua, mas não entra no seu Canto.',
    world:'MUNDO ativo. Visitas e falas dos habitantes estão permitidas.',
    chaos:'CAOS ativo. O 404 recebeu autorização pessoal. Isso parece uma ideia melhor no papel.'
  };
  trackAction('mode_changed','profile',{mode});
  askWorldCharacter('mode_changed',{action_type:'mode_changed',surface:'profile',metadata:{mode}});
  toast(messages[mode]);
}

document.querySelectorAll('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>$('#auth-dialog').showModal()));
$('#encounter-close').onclick=()=>dismissEncounter();
$('.dialog-close').onclick=()=>$('#auth-dialog').close();
$('.avatar-dialog-close').onclick=()=>$('#avatar-dialog').close();
$('.wallpaper-dialog-close').onclick=()=>$('#wallpaper-dialog').close();
$('.story-create-close').onclick=()=>$('#story-create-dialog').close();
$('.story-view-close').onclick=closeStoryViewer;
const storyViewDialog=$('#story-view-dialog');
storyViewDialog?.addEventListener('click',e=>{
  if(e.target===storyViewDialog)closeStoryViewer();
});
storyViewDialog?.addEventListener('close',()=>{
  clearStoryTimer();
  state.storyCurrentId=null;
});
$('#story-publish').onclick=publishStory;
$('#story-image').onchange=e=>{
  const file=e.target.files?.[0]||null,box=$('#story-image-preview');
  if(!file){box.classList.add('hidden');box.innerHTML='';return;}
  const url=URL.createObjectURL(file);
  box.innerHTML=`<img src="${url}" alt="prévia do story"><small>${escapeHtml(file.name)}</small>`;
  box.classList.remove('hidden');
};
$$('[data-auth-mode]').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.authMode));
function setAuthMode(mode){ state.mode=mode; $$('[data-auth-mode]').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode)); $('#signup-fields').classList.toggle('hidden',mode==='login'); $('#resend-confirmation').classList.add('hidden'); $('#auth-submit').textContent=mode==='login'?'entrar':'criar meu canto'; $('#auth-message').textContent=''; }

$('#auth-form').addEventListener('submit',async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const email=f.get('email');const password=f.get('password');$('#auth-submit').disabled=true;$('#auth-message').textContent='conversando com os computadores...';let result;if(state.mode==='signup'){const handle=String(f.get('handle')||'').toLowerCase();const display_name=String(f.get('display_name')||'').trim().slice(0,80);if(!display_name){result={error:{message:'Escolha um nome exibido. Vale símbolo, emoji, drama e decisões questionáveis.'}}}else if(!/^[a-z0-9_]{3,24}$/.test(handle)){result={error:{message:'Seu @ precisa ter 3–24 letras minúsculas, números ou _.'}}}else{result=await supabase.auth.signUp({email,password,options:{data:{handle,display_name},emailRedirectTo:SITE_URL}});}}else result=await supabase.auth.signInWithPassword({email,password});$('#auth-submit').disabled=false;if(result.error){$('#auth-message').textContent=humanError(result.error.message);return}if(state.mode==='signup'&&!result.data.session){$('#auth-message').textContent='Confira seu e-mail e use o link mais recente. Se já confirmou a conta, abra a aba de entrar e use sua senha.';$('#resend-confirmation').classList.remove('hidden');return}$('#auth-dialog').close();toast('Você entrou. Tente não estragar tudo.');});

$('#resend-confirmation').onclick=async()=>{const email=new FormData($('#auth-form')).get('email');if(!email)return toast('Digite seu e-mail primeiro. Adivinhação ainda está em beta.');const button=$('#resend-confirmation');button.disabled=true;button.textContent='reenviando...';const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:SITE_URL}});button.disabled=false;button.textContent='reenviar confirmação de e-mail';if(error){$('#auth-message').textContent=humanError(error.message);return}$('#auth-message').textContent='Se a conta ainda estiver pendente, você receberá um novo link. Se já confirmou, entre com sua senha.';toast('Solicitação recebida. Confira seu e-mail ou tente entrar.');};

function humanError(m){const value=String(m||'');const lower=value.toLowerCase();if(lower.includes('email not confirmed'))return'Confirme seu e-mail antes de entrar. Use o link mais recente ou solicite outro na aba de cadastro.';if(lower.includes('invalid login'))return'E-mail ou senha não conferem. Se você já confirmou, use a senha do cadastro.';if(lower.includes('already registered'))return'Este e-mail já tem cadastro. Use a aba de entrar.';if(lower.includes('expired')||lower.includes('otp_expired'))return'Este link expirou ou já foi utilizado. Se já confirmou, entre com sua senha.';if(lower.includes('password'))return'A senha precisa atender aos requisitos de segurança.';return value;}
$('#logout').onclick=()=>supabase.auth.signOut();

supabase.auth.onAuthStateChange((_event,session)=>{state.session=session;if(session)enterApp();else leaveApp();});
async function enterApp(){ $('#marketing-view').classList.add('hidden');$('.site-header').classList.add('hidden');$('.site-footer').classList.add('hidden');$('#app-view').classList.remove('hidden');const {data}=await supabase.from('profiles').select('*').eq('id',state.session.user.id).single();state.profile=data;if(!data){toast('Seu perfil ainda está acordando. Atualize em alguns segundos.');return}$('#nav-name').textContent=data.display_name;$('#nav-handle').textContent='@'+data.handle;renderNavAvatar();applyAppWallpaper();await loadWorldState();await loadBlockedPeers();await Promise.all([loadFeed(),loadImpact(),loadStoriesStrip()]);subscribeRealtime();await primeFriendPresenceCache();await loadMutedPeers();startFriendPresenceWatch();registerNotificationWorker();armBrowserNotifications();startDirectRealtime();startStoryRealtime();loadStoryNotifications();startPresenceHeartbeat();scheduleIdleWorld();scheduleTowerPulse();trackAction('login','app');setTimeout(notifyPendingFriendRequests,900);setTimeout(()=>askWorldCharacter('login',{action_type:'login',surface:'app'}),1400);}
function leaveApp(){clearTimeout(state.world.idleTimer);clearTimeout(state.world.towerTimer);clearInterval(state.presenceTimer);clearInterval(state.presenceWatchTimer);state.friendPresence={};state.mutedPeers={};state.blockedPeers={};state.pendingAttentionPeerId=null;stopPlazaRealtime();stopDirectRealtime();stopStoryRealtime();closeStoryViewer();closeChatWindow(true);document.body.classList.remove('avesso-app-active');state.profile=null;$('#app-view').classList.add('hidden');$('#marketing-view').classList.remove('hidden');$('.site-header').classList.remove('hidden');$('.site-footer').classList.remove('hidden');}

let searchTimer;$('#recipient-search').addEventListener('input',e=>{state.recipient=null;clearTimeout(searchTimer);const q=e.target.value.trim();if(q.length<2){$('#recipient-results').classList.add('hidden');return}searchTimer=setTimeout(()=>searchProfiles(q),250)});
async function searchProfiles(q){const {data,error}=await supabase.from('profiles').select('id,handle,display_name').or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`).neq('id',state.profile.id).limit(12);if(error)return toast('A busca tropeçou. Tente de novo.');const visible=(data||[]).filter(p=>!isPeerBlocked(p.id)).slice(0,6);const box=$('#recipient-results');box.innerHTML=visible.map(p=>`<button data-user='${p.id}' data-name='${escapeAttr(p.display_name)}' data-handle='${escapeAttr(p.handle)}'><span>${escapeHtml(p.display_name)}</span><small>@${escapeHtml(p.handle)}</small></button>`).join('')||'<button disabled>ninguém encontrado neste pedaço da internet</button>';box.classList.remove('hidden');box.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>{state.recipient={id:b.dataset.user,name:b.dataset.name,handle:b.dataset.handle};$('#recipient-search').value=`${b.dataset.name} (@${b.dataset.handle})`;box.classList.add('hidden')});}

function updateComposerTarget(){
  const directed=$('#post-target').value==='person';
  $('#recipient-row').classList.toggle('hidden',!directed);
  $('#post-visibility').disabled=!directed;
  if(!directed){
    state.recipient=null;
    $('#recipient-search').value='';
    $('#recipient-results').classList.add('hidden');
    $('#post-visibility').value='publico';
  }
  $('#composer-hint').textContent=directed?'Escolha a pessoa pelo @. Você decide se a mensagem será pública ou privada.':'Publicação aberta à comunidade. Não é necessário marcar ninguém.';
  $('#post-body').placeholder=directed?'Reconheça, pergunte ou ofereça ajuda a essa pessoa.':'Pergunte, reconheça ou compartilhe algo que ajude a comunidade.';
}
$('#post-target').addEventListener('change',updateComposerTarget);
updateComposerTarget();
setupFeedEmoticons();
$('#post-body').addEventListener('input',e=>$('#char-count').textContent=420-e.target.value.length);
$('#post-image').addEventListener('change',e=>{
  const file=e.target.files?.[0]||null;
  if(!file){state.postImageFile=null;$('#image-preview').classList.add('hidden');return;}
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))return toast('Formato não suportado. A internet inventou muitos; não precisamos de todos.');
  if(file.size>5*1024*1024){e.target.value='';return toast('Imagem acima de 5 MB. Pixels também precisam de limites.');}
  state.postImageFile=file;
  const url=URL.createObjectURL(file);
  $('#image-preview-img').src=url;
  $('#image-preview-name').textContent=file.name;
  $('#image-preview').classList.remove('hidden');
  trackAction('image_selected','composer',{type:file.type,size:file.size});
});
$('#remove-image').onclick=()=>{state.postImageFile=null;$('#post-image').value='';$('#image-preview').classList.add('hidden');};
async function uploadPostImage(){
  if(!state.postImageFile)return null;
  const ext=(state.postImageFile.name.split('.').pop()||'webp').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const path=`${state.profile.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await supabase.storage.from('post-images').upload(path,state.postImageFile,{cacheControl:'3600',upsert:false});
  if(error)throw error;
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}
$('#publish-post').onclick=async()=>{
  const body=$('#post-body').value.trim();
  const directed=$('#post-target').value==='person';
  if(directed&&!state.recipient)return toast('Escolha alguém na busca para direcionar sua mensagem.');
  if(directed&&$('#post-visibility').value==='privado'&&state.postImageFile)return toast('Imagem privada ainda não entra aqui. Não vou colocar arquivo íntimo em bucket público só porque seria mais rápido.');
  if(body.length<3&&!state.postImageFile)return toast('Dê ao menos uma frase ou uma imagem. Telepatia ainda não foi integrada.');
  $('#publish-post').disabled=true;
  let image_url=null;
  try{ image_url=await uploadPostImage(); }catch(e){$('#publish-post').disabled=false;return toast('A imagem tropeçou no upload. Tente novamente.');}
  const {data:createdPost,error}=await supabase.from('posts').insert({
    author_id:state.profile.id,
    recipient_id:directed?state.recipient.id:null,
    body:body||'Imagem publicada no AVESSO.',
    image_url,
    visibility:directed?$('#post-visibility').value:'publico'
  }).select('id').single();
  $('#publish-post').disabled=false;
  if(error)return toast('Não foi possível publicar. Tente novamente.');
  $('#post-body').value='';$('#recipient-search').value='';$('#char-count').textContent='420';state.recipient=null;
  state.postImageFile=null;$('#post-image').value='';$('#image-preview').classList.add('hidden');
  toast(image_url?'Imagem entregue ao feed. Sem moldura de influencer.':(directed?'Mensagem entregue.':'Publicado para a comunidade. Sem placar, com conversa.'));
  trackAction(image_url?'image_posted':'post_created','composer',{directed});
  if(isFeedTab())loadFeed();
  loadImpact();
  if(createdPost?.id)setTimeout(()=>askWorldCharacter(image_url?'image_posted':'post_created',{post_id:createdPost.id,action_type:image_url?'image_posted':'post_created',surface:'feed'}),500);
};

async function loadThreadData(posts){
  const ids=posts.map(p=>p.id);
  if(!ids.length)return{responses:{},characters:{},reactions:{}};
  const [responsesRes,reactionsRes,characterRes]=await Promise.all([
    supabase.from('responses').select('id,post_id,author_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true}),
    supabase.from('post_reactions').select('post_id,user_id,reaction,created_at').in('post_id',ids),
    supabase.from('character_interactions').select('id,post_id,character_id,body,created_at,source,visibility').in('post_id',ids).order('created_at',{ascending:true})
  ]);
  const responses=(responsesRes.data||[]).filter(r=>!isPeerBlocked(r.author_id));
  const reactions=(reactionsRes.data||[]).filter(r=>!isPeerBlocked(r.user_id));
  const characterReplies=(characterRes.data||[]).filter(x=>x.post_id);
  const profileIds=[...new Set(responses.map(r=>r.author_id).filter(Boolean))];
  let profiles={};
  if(profileIds.length){
    const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',profileIds);
    profiles=Object.fromEntries((data||[]).map(p=>[p.id,p]));
  }
  const byPost={},charactersByPost={},reactionsByPost={};
  for(const r of responses)(byPost[r.post_id]??=[]).push({...r,author:profiles[r.author_id]});
  for(const x of characterReplies)(charactersByPost[x.post_id]??=[]).push({...x,character:state.world.charactersById[x.character_id]});
  for(const x of reactions)(reactionsByPost[x.post_id]??=[]).push(x);
  return{responses:byPost,characters:charactersByPost,reactions:reactionsByPost};
}
async function loadFeed(){
  if(!isFeedTab())return;
  const viewVersion=state.viewVersion;
  const requestedTab=state.tab;
  const status=$('#feed-status');
  status.classList.remove('hidden');
  status.textContent='ordenando pelo que importa, ideia radical...';
  algoSay('feed_loading');

  let query=supabase.from('feed_attention').select('*');
  if(requestedTab==='quiet')query=query.eq('response_count',0);
  if(requestedTab==='sent')query=query.eq('author_id',state.profile.id);

  const {data,error}=await query.order('attention_need',{ascending:false}).limit(40);

  // O usuário pode ter mudado de página enquanto o banco respondia.
  if(viewVersion!==state.viewVersion||state.tab!==requestedTab||!isFeedTab())return;

  if(error){
    status.textContent='O feed falhou. Até o anti-algoritmo tem segunda-feira.';
    algoSay('feed_error');
    return;
  }

  const posts=(data||[]).filter(p=>!isPeerBlocked(p.author_id)&&!isPeerBlocked(p.recipient_id));
  const profileIds=[...new Set(posts.flatMap(p=>[p.author_id,p.recipient_id]).filter(Boolean))];
  let feedProfiles={};
  if(profileIds.length){
    const {data:profiles}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',profileIds);
    feedProfiles=Object.fromEntries((profiles||[]).map(p=>[p.id,p]));
  }
  posts.forEach(p=>{p.author_avatar_url=feedProfiles[p.author_id]?.avatar_url||null;p.recipient_avatar_url=feedProfiles[p.recipient_id]?.avatar_url||null;});
  const threadData=await loadThreadData(posts);

  // Segunda barreira: loadThreadData também é assíncrono.
  if(viewVersion!==state.viewVersion||state.tab!==requestedTab||!isFeedTab())return;

  status.classList.add('hidden');
  renderFeed(posts,threadData);
  renderTowerCard();

  if(posts.some(p=>p.response_count===0)){
    algoSay('feed_attention');
    if(state.tab==='feed')setTimeout(()=>{ if(state.tab==='feed'&&viewVersion===state.viewVersion) askWorldCharacter('feed_attention'); },2200);
  }else if(posts.length)algoSay('feed_default');
}
function renderFeed(posts,threadData={responses:{},characters:{},reactions:{}}){
  if(!isFeedTab())return;
  const list=$('#feed-list');
  if(!posts.length){
    list.innerHTML='<div class="feed-status">Nada aqui. Talvez as pessoas estejam vivendo. Estranho, mas permitido.</div>';
    algoSay('feed_empty');return;
  }
  list.innerHTML=posts.map(p=>{
    const responses=threadData.responses[p.id]||[];
    const characterReplies=threadData.characters[p.id]||[];
    const reactionRows=threadData.reactions[p.id]||[];
    const conversation=[
      ...responses.map(x=>({...x,type:'human'})),
      ...characterReplies.map(x=>({...x,type:'character'}))
    ].sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const conversationHtml=conversation.length?`<section class="conversation-thread">
      <header><span>CONVERSA // ${conversation.length} ${conversation.length===1?'RESPOSTA':'RESPOSTAS'}</span><small>sem hierarquia. conceito quase ofensivo.</small></header>
      <div class="conversation-list">${conversation.map(item=>{
        if(item.type==='character'){
          const c=item.character||{};
          return `<article class="conversation-item character-conversation">${characterVisual(c,'conversation-character')}<div><div class="conversation-author"><b>${escapeHtml(c.name||'Habitante')}</b><span>HABITANTE · ${ago(item.created_at)}</span></div><p>${escapeHtml(item.body)}</p></div></article>`;
        }
        return `<article class="conversation-item"><button class="mini-avatar profile-avatar-button" data-profile-id="${item.author_id}">${avatarHtml(item.author?.avatar_url,item.author?.display_name||'?')}</button><div><div class="conversation-author"><button class="user-link" data-profile-id="${item.author_id}">${escapeHtml(item.author?.display_name||'alguém')}</button><span>@${escapeHtml(item.author?.handle||'...')} · ${ago(item.created_at)}</span></div><p>${escapeHtml(item.body)}</p></div></article>`;
      }).join('')}</div></section>`:'';
    const reactionHtml=ACID_REACTIONS.map(([id,icon,label])=>{
      const rows=reactionRows.filter(x=>x.reaction===id);
      const active=rows.some(x=>x.user_id===state.profile.id);
      return `<button class="acid-reaction ${active?'active':''}" data-react-post="${p.id}" data-reaction="${id}" aria-pressed="${active}"><span>${icon}</span>${label}${rows.length?` <b>${rows.length}</b>`:''}</button>`;
    }).join('');
    return `<article class="post-card" data-post-card="${p.id}">
      <div class="post-route"><button class="mini-avatar profile-avatar-button" data-profile-id="${p.author_id}">${avatarHtml(p.author_avatar_url,p.author_name)}</button><button class="user-link" data-profile-id="${p.author_id}">${escapeHtml(p.author_name)}</button><span class="arrow">→</span><span>${p.recipient_id?escapeHtml(p.recipient_name||'pessoa'):'comunidade'}</span><span class="post-meta">${ago(p.created_at)} · ${p.response_count} resposta${p.response_count===1?'':'s'}</span></div>
      <p class="post-body">${escapeHtml(p.body)}</p>
      ${p.image_url?`<figure class="post-image"><img src="${escapeHtml(p.image_url)}" alt="Imagem publicada por ${escapeHtml(p.author_name)}" loading="lazy"></figure>`:''}
      <div class="acid-reactions" aria-label="Reações do Avesso">${reactionHtml}</div>
      ${conversationHtml}
      <div class="post-actions"><button data-reply-toggle="${p.id}">↳ entrar na conversa</button>${p.response_count===0?'<span class="need-tag">PRECISA DE ATENÇÃO</span>':''}</div>
      <div class="inline-reply hidden" data-reply-box="${p.id}"><label>RESPOSTA // fale com a pessoa, não com a métrica</label><textarea maxlength="420" placeholder="Escreva algo que valha o espaço que ocupa."></textarea><div class="reply-emoticon-row"><button type="button" data-reply-emoticons="${p.id}">☻ avessícones</button><div class="feed-emoticon-palette hidden" data-reply-emoticon-palette="${p.id}">${avessoEmoticonButtons('data-reply-emoticon')}</div></div><div><button data-reply-send="${p.id}">publicar resposta</button><button data-reply-cancel="${p.id}">cancelar</button></div></div>
    </article>`;
  }).join('');
  $$('[data-reply-toggle]').forEach(b=>b.onclick=()=>{
    const box=document.querySelector(`[data-reply-box="${b.dataset.replyToggle}"]`);
    box?.classList.toggle('hidden');box?.querySelector('textarea')?.focus();
  });
  $('[data-reply-cancel]').forEach(b=>b.onclick=()=>document.querySelector(`[data-reply-box="${b.dataset.replyCancel}"]`)?.classList.add('hidden'));
  $('[data-reply-emoticons]').forEach(b=>b.onclick=()=>document.querySelector(`[data-reply-emoticon-palette="${b.dataset.replyEmoticons}"]`)?.classList.toggle('hidden'));
  $('[data-reply-emoticon]').forEach(b=>b.onclick=()=>{const box=b.closest('[data-reply-box]'),input=box?.querySelector('textarea');if(input){input.value+=`${input.value?' ':''}${b.dataset.replyEmoticon}`;input.focus();}});
  $('[data-reply-send]').forEach(b=>b.onclick=()=>sendReply(b.dataset.replySend));
  $$('[data-react-post]').forEach(b=>b.onclick=()=>toggleReaction(b.dataset.reactPost,b.dataset.reaction,b.classList.contains('active')));
}
async function toggleReaction(postId,reaction,active){
  if(!ACID_REACTIONS.some(x=>x[0]===reaction))return;
  let error;
  if(active){
    ({error}=await supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',state.profile.id));
  }else{
    ({error}=await supabase.from('post_reactions').upsert({post_id:postId,user_id:state.profile.id,reaction,updated_at:new Date().toISOString()},{onConflict:'post_id,user_id'}));
  }
  if(error)return toast('A reação teve uma reação adversa.');
  trackAction('acid_reaction','feed',{post_id:postId,reaction:active?'remove':reaction});
  if(isFeedTab())loadFeed();
}
async function sendReply(post_id){
  const box=document.querySelector(`[data-reply-box="${post_id}"]`);
  const input=box?.querySelector('textarea');
  const body=input?.value.trim()||'';
  if(body.length<2)return toast('A resposta precisa de pelo menos 2 caracteres.');
  const {error}=await supabase.from('responses').insert({post_id,author_id:state.profile.id,body});
  if(error)return toast('A resposta caiu no vazio. Tente novamente.');
  input.value='';
  toast('Resposta publicada. Agora ela aparece na conversa, como seria razoável esperar.');
  trackAction('reply_created','feed',{post_id});
  if(isFeedTab())loadFeed();
  setTimeout(()=>askWorldCharacter('reply_created',{post_id}),650);
}

async function loadImpact(){const {count}=await supabase.from('posts').select('*',{count:'exact',head:true}).eq('author_id',state.profile.id);$('#impact-number').textContent=count||0;}
function applyAppTabLayout(){
  const worldOpen=['residents','plaza','tower','profile','public_profile','messages'].includes(state.tab);
  $('#app-view')?.classList.toggle('inhabitants-open',worldOpen);
  $('.composer')?.classList.toggle('hidden',worldOpen||state.tab==='profile');
  $('#stories-zone')?.classList.toggle('hidden',state.tab!=='feed');
  $('.feed-header')?.classList.toggle('hidden',worldOpen);
  $('#refresh-feed')?.classList.toggle('hidden',worldOpen||state.tab==='profile');
  applyAppWallpaper();
}
document.querySelectorAll('[data-app-tab]').forEach(b=>b.onclick=async()=>{
  const previousTab=state.tab;
  if(previousTab==='plaza'&&b.dataset.appTab!=='plaza')stopPlazaRealtime();
  state.tab=b.dataset.appTab;
  applyAppWallpaper();
  bumpView();
  document.querySelectorAll('[data-app-tab]').forEach(x=>x.classList.toggle('active',x===b));
  const headings={feed:'Quem precisa ser visto?',quiet:'Quem ficou falando sozinho?',sent:'O que você entregou',profile:'Seu canto, sem palco',residents:'Mundo deles',plaza:'Praça Central',tower:'Torre do Engajamento',messages:'Amigos & cúmplices'};
  $('#feed-heading').textContent=headings[state.tab]||'AVESSO';
  applyAppTabLayout();
  trackAction('tab_view',state.tab,{tab:state.tab});
  if(!['plaza','tower'].includes(state.tab))maybeWorldCharacter('tab_view',{action_type:'tab_view',surface:state.tab,metadata:{tab:state.tab}},.14,180000);
  if(state.tab==='profile')renderProfile();
  else if(state.tab==='residents')await renderInhabitantsPage();
  else if(state.tab==='plaza')await renderPlaza();
  else if(state.tab==='tower')await renderTowerPage();
  else if(state.tab==='messages')await renderMessagesPage();
  else {if(state.tab==='feed')await loadStoriesStrip();loadFeed();}
});
async function renderInhabitantsPage(){
  if(state.tab!=='residents')return;
  const viewVersion=state.viewVersion;
  $('#feed-status').classList.add('hidden');
  const {data:presence}=await supabase.from('character_presence').select('character_id,location,activity,mood,status,updated_at');
  if(state.tab!=='residents'||viewVersion!==state.viewVersion)return;
  const presenceById=Object.fromEntries((presence||[]).map(p=>[p.character_id,p]));
  const abilities={
    algo:'Reordena atenção, observa conversas esquecidas e explica por que o feed fez o que fez. Está tentando desaprender a internet moderna.',
    '404':'No modo CAOS pode visitar, provocar e, quando o motor visual estiver liberado, sabotar a aparência de posts e do seu Canto sem tocar no conteúdo original.',
    npc:'Circula pela Praça Central, inicia pequenas missões sociais e cutuca conversas que ficaram sem companhia. É humano. Isso explica muita coisa.',
    rei_engajamento:'Invade eventos com métricas, campanhas e ideias de monetização que ninguém pediu. O problema é que ele acha todas excelentes.',
    aquele_le_tudo:'Quebra a quarta parede. Percebe botões, textos, roteiro e decisões de design. Não lê suas mensagens privadas. Nem ele merece esse emprego.',
    alem:'Quase nunca aparece. Surge quando o mundo está estranho demais até para o AVESSO. O restante do arquivo está, convenientemente, ausente.'
  };
  const notes={
    algo:'STATUS: tentando não transformar você em KPI',
    '404':'AVISO: não alimente depois da meia-noite. Também não antes.',
    npc:'MISSÃO ATUAL: descobrir se existe missão principal',
    rei_engajamento:'META DO TRIMESTRE: monetizar o silêncio',
    aquele_le_tudo:'ELE LEU ESTA LINHA ANTES DE VOCÊ',
    alem:'REGISTRO INCOMPLETO // isso talvez seja intencional'
  };
  const order=['algo','404','npc','rei_engajamento','aquele_le_tudo','alem'];
  const cards=order.map((slug,i)=>{
    const c=state.world.characters[slug];
    if(!c)return'';
    const p=presenceById[c.id]||{};
    const rare=slug==='alem'?' inhabitant-card-rare':'';
    return `<article class="inhabitant-card${rare}" style="--accent:${escapeHtml(c.accent_color||'#d8ff3e')}">
      <div class="inhabitant-index">0${i+1}</div>
      <div class="inhabitant-portrait">${characterVisual(c,'character-portrait-sprite')}</div>
      <div class="inhabitant-copy">
        <span class="inhabitant-role">${escapeHtml(c.role)}</span>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(abilities[slug]||c.bio||'Habitante do AVESSO.')}</p>
        <div class="inhabitant-status"><span>${escapeHtml(p.location||c.home_location||'local desconhecido')}</span><span>${escapeHtml(p.status||c.presence_state||'???')}</span></div>
        <small>${escapeHtml(notes[slug])}</small>
      </div>
    </article>`;
  }).join('');
  if(state.tab!=='residents'||viewVersion!==state.viewVersion)return;
  $('#feed-list').innerHTML=`
    <section class="inhabitants-world">
      <div class="world-grid-noise"></div>
      <header class="inhabitants-hero">
        <span class="world-kicker">AVESSO.EXE // QUEM É QUEM</span>
        <h2>HABITANTES DO <em>AVESSO</em></h2>
        <p>Você não entrou numa rede. Entrou na casa deles. Seu perfil é só um Canto alugado dentro de um computador que claramente desenvolveu vida própria sem consultar o jurídico.</p>
        <div class="world-rule">A REDE NÃO PERTENCE A NÓS. <strong>PERTENCE A ELES.</strong></div>
      </header>
      <div class="inhabitants-map">
        <div class="map-wire wire-a"></div><div class="map-wire wire-b"></div><div class="map-wire wire-c"></div>
        ${cards}
      </div>
      <footer class="world-footer"><span>AVESSO.SYS // HABITANTES V1.0</span><b>ESTE É SÓ O COMEÇO.</b><span>O MUNDO DO AVESSO CONTINUA...</span></footer>
    </section>`;
}
function stopPlazaRealtime(){
  if(state.plazaChannel){supabase.removeChannel(state.plazaChannel);state.plazaChannel=null;}
}
function startPlazaRealtime(){
  stopPlazaRealtime();
  if(!state.profile?.id)return;
  state.plazaChannel=supabase.channel(`avesso-plaza-${state.profile.id}-${Date.now()}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'plaza_messages'},()=>{if(state.tab==='plaza')loadPlazaMessages();})
    .subscribe(status=>{
      const dot=$('#plaza-realtime-status');
      if(dot)dot.textContent=status==='SUBSCRIBED'?'● realtime':'○ conectando';
    });
}
async function loadPlazaMessages(){
  if(state.tab!=='plaza')return;
  const {data,error}=await supabase.from('plaza_messages')
    .select('id,user_id,character_id,body,reply_to,created_at')
    .order('created_at',{ascending:false}).limit(60);
  if(error)return;
  const messages=[...(data||[])].reverse();
  const userIds=[...new Set(messages.map(m=>m.user_id).filter(Boolean))];
  let profiles={};
  if(userIds.length){
    const {data:ps}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',userIds);
    profiles=Object.fromEntries((ps||[]).map(p=>[p.id,p]));
  }
  const log=$('#plaza-chat-log'); if(!log)return;
  log.innerHTML=messages.map(m=>{
    if(m.character_id){
      const c=state.world.charactersById[m.character_id]||state.world.characters.npc;
      return `<article class="plaza-message npc-message">${characterVisual(c,'plaza-msg-avatar')}<div><header><strong>${escapeHtml(c?.name||'NPC')}</strong><span>HABITANTE · ${ago(m.created_at)}</span></header><p>${escapeHtml(m.body)}</p></div></article>`;
    }
    const p=profiles[m.user_id]||{};
    return `<article class="plaza-message"><button class="plaza-avatar" data-profile-id="${m.user_id}">${avatarHtml(p.avatar_url,p.display_name||'?')}</button><div><header><button class="user-link" data-profile-id="${m.user_id}">${escapeHtml(p.display_name||'alguém')}</button><span>@${escapeHtml(p.handle||'...')} · ${ago(m.created_at)}</span></header><p>${escapeHtml(m.body)}</p></div></article>`;
  }).join('')||'<div class="plaza-empty">A praça está vazia. O NPC está fingindo que isso era parte do planejamento urbano.</div>';
  bindProfileLinks();
  log.scrollTop=log.scrollHeight;
}
async function sendPlazaMessage(body,forceNpc=false){
  const text=String(body||'').trim().slice(0,280);
  if(!text)return;
  const {data,error}=await supabase.from('plaza_messages').insert({user_id:state.profile.id,body:text}).select('id').single();
  if(error)return toast('A mensagem caiu entre os bancos da praça.');
  trackAction('plaza_chat','plaza',{message:text.slice(0,90)});
  await loadPlazaMessages();
  const mentionNpc=/@?npc\b/i.test(text);
  if(forceNpc||mentionNpc||Math.random()<0.28){
    askWorldCharacter('plaza_chat',{character:'npc',silent:true,action_type:'plaza_chat',surface:'plaza',metadata:{message:text,message_id:data.id}}).then(()=>setTimeout(loadPlazaMessages,180));
  }
}
async function renderPlaza(){
  if(state.tab!=='plaza')return;
  const npc=state.world.characters.npc;
  $('#feed-status').classList.add('hidden');
  $('#feed-list').innerHTML=`<section class="plaza-world plaza-live">
    <div class="plaza-sky"></div>
    <div class="plaza-sign">PRAÇA CENTRAL <small>bate-papo público dos desencontrados</small></div>
    <div class="plaza-buildings"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="plaza-live-grid">
      <aside class="plaza-npc-live">
        ${characterVisual(npc,'plaza-npc-hq')}
        <span>NPC // FIGURANTE EM PROMOÇÃO</span>
        <h2>A praça fica aberta. O roteiro, nem sempre.</h2>
        <p>Fale <b>@npc</b> no chat ou use um dos atalhos. Ele responde quando lembra que ganhou falas.</p>
        <div class="plaza-actions"><button data-npc-prompt="Me dê uma missão secundária.">pedir missão</button><button data-npc-prompt="Qual é o rumor de hoje na Praça?">perguntar rumor</button><button data-npc-prompt="NPC, conversa comigo um pouco.">conversar</button></div>
      </aside>
      <section class="plaza-chat-room">
        <header><div><span class="section-code">PRAÇA // AO VIVO</span><h3>Gente normal em um mundo bugado</h3></div><span class="live-dot" id="plaza-realtime-status">○ conectando</span></header>
        <div id="plaza-chat-log" class="plaza-chat-log"></div>
        <form id="plaza-chat-form" class="plaza-chat-form"><input id="plaza-chat-input" maxlength="280" autocomplete="off" placeholder="Fale na Praça Central... @npc também lê isto"><button>enviar</button></form>
      </section>
    </div>
  </section>`;
  await loadPlazaMessages();
  startPlazaRealtime();
  trackAction('plaza_opened','plaza');
  $('#plaza-chat-form').onsubmit=async e=>{
    e.preventDefault();
    const input=$('#plaza-chat-input'); const text=input.value.trim(); if(!text)return;
    input.value=''; await sendPlazaMessage(text,false);
  };
  $$('[data-npc-prompt]').forEach(b=>b.onclick=async()=>{
    const prompt=b.dataset.npcPrompt;
    await sendPlazaMessage(prompt,true);
  });
}
function towerFallback(){
  const lines=['CAMPANHA // VIDA REAL É BETA. O produto final segue sem previsão.','OPORTUNIDADE // monetize o silêncio antes que alguém crie um plano Pro.','EM ALTA // pessoas conversando sem intermediário. Mercado em pânico.','AVISO // respirar sem publicar reduz impressões. Faça por sua conta e risco.','PESQUISA INTERNA // 100% do Rei concorda com o Rei.'];
  return lines[Math.floor(Math.random()*lines.length)];
}
function renderTowerCard(text=towerFallback()){
  const box=$('#tower-live');if(!box)return;
  box.innerHTML=`<div class="tower-crown">♛</div><span class="section-code">TORRE DO ENGAJAMENTO // AO VIVO</span><h3>Mensagem do Rei</h3><p>${escapeHtml(text)}</p><button id="open-tower">subir na torre →</button>`;
  $('#open-tower').onclick=()=>document.querySelector('[data-app-tab="tower"]')?.click();
}
async function updateTowerAI(trigger='tower_pulse'){
  if(!state.session||!state.profile)return;
  const result=await askWorldCharacter(trigger,{character:'rei_engajamento',silent:true,action_type:trigger,surface:'tower'});
  renderTowerCard(result?.interaction?.body||towerFallback());
}
function scheduleTowerPulse(){
  clearTimeout(state.world.towerTimer);
  if(!state.session)return;
  state.world.towerTimer=setTimeout(async()=>{if(isFeedTab())await updateTowerAI('tower_pulse');scheduleTowerPulse();},(150+Math.random()*120)*1000);
  setTimeout(()=>{if(isFeedTab())updateTowerAI('tower_opened')},2200);
}
async function renderTowerPage(){
  if(state.tab!=='tower')return;
  const king=state.world.characters.rei_engajamento;
  $('#feed-status').classList.add('hidden');
  $('#feed-list').innerHTML=`<section class="tower-world">
    <div class="tower-header"><span>♛ TORRE DO ENGAJAMENTO</span><h2>PROPAGANDA, CAOS E OPORTUNIDADES™</h2><p>Um monumento vertical à ideia de que tudo fica melhor quando alguém coloca um KPI em cima.</p></div>
    <div class="tower-king">${characterVisual(king,'tower-king-hq')}<div id="tower-page-message">O Rei está preparando um PowerPoint que ninguém solicitou.</div></div>
    <div class="tower-grid"><article><b>CAMPANHA OFICIAL</b><h3>VIDA REAL É BETA</h3><p>Aproveite enquanto ainda não tem assinatura mensal.</p></article><article><b>EM ALTA</b><ol><li>Humanos falando com humanos</li><li>Não monetizar tudo</li><li>Silêncio sem anúncios</li></ol></article><article><b>OPORTUNIDADE DO REI</b><p>Teste um recurso inexistente. Ganhe um badge invisível e absolutamente nenhum benefício.</p></article></div>
    <button id="tower-refresh" class="tower-refresh">pedir outra ideia péssima ao Rei</button>
  </section>`;
  trackAction('tower_opened','tower');
  const result=await askWorldCharacter('tower_opened',{character:'rei_engajamento',silent:true,action_type:'tower_opened',surface:'tower'});
  if(state.tab==='tower'&&result?.interaction?.body)$('#tower-page-message').textContent=result.interaction.body;
  $('#tower-refresh').onclick=async()=>{trackAction('tower_pulse','tower');const r=await askWorldCharacter('tower_pulse',{character:'rei_engajamento',silent:true,action_type:'manual_campaign',surface:'tower'});if(r?.interaction?.body)$('#tower-page-message').textContent=r.interaction.body;};
}

async function acceptedFriendProfiles(){
  const {data:rels}=await supabase.from('friendships').select('*').eq('status','accepted')
    .or(`requester_id.eq.${state.profile.id},addressee_id.eq.${state.profile.id}`);
  const ids=[...new Set((rels||[]).map(r=>r.requester_id===state.profile.id?r.addressee_id:r.requester_id))];
  if(!ids.length)return[];
  const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url,status_message,presence_mode,last_seen').in('id',ids);
  return data||[];
}
async function profileById(id){
  const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url,status_message,presence_mode,last_seen').eq('id',id).maybeSingle();
  return data||null;
}
function cachedPresenceEntry(profile){
  return {mode:presenceView(profile).mode,lastSeen:profile?.last_seen?new Date(profile.last_seen).getTime():0,profile};
}
async function primeFriendPresenceCache(){
  state.friendPresence={};
  const friends=await acceptedFriendProfiles();
  friends.forEach(friend=>{state.friendPresence[friend.id]=cachedPresenceEntry(friend);});
}
function ageFriendPresenceCache(){
  const now=Date.now();
  Object.values(state.friendPresence||{}).forEach(entry=>{
    if(entry?.mode==='online'&&entry.lastSeen&&now-entry.lastSeen>120000)entry.mode='away';
  });
}
function startFriendPresenceWatch(){
  clearInterval(state.presenceWatchTimer);
  ageFriendPresenceCache();
  state.presenceWatchTimer=setInterval(ageFriendPresenceCache,30000);
}
function noteFriendPresence(profile){
  if(!profile?.id||!Object.prototype.hasOwnProperty.call(state.friendPresence,profile.id))return;
  ageFriendPresenceCache();
  const prev=state.friendPresence[profile.id];
  const next=cachedPresenceEntry(profile);
  state.friendPresence[profile.id]=next;
  if(prev?.mode!=='online'&&next.mode==='online'&&!isPeerMuted(profile.id)){
    socialNotify({
      title:`${profile.display_name||'Um amigo'} entrou no AVESSO`,
      body:'Online agora. A bolinha verde ressuscitou sem pedir licença.',
      avatar:profile.avatar_url||'',
      kind:'online',
      action:()=>openFriendChat(profile.id)
    });
  }
}
function stopDirectRealtime(){
  if(state.directChannel){supabase.removeChannel(state.directChannel);state.directChannel=null;}
}
async function notifyPendingFriendRequests(){
  if(!state.profile?.id)return;
  const {data,error}=await supabase.from('friendships')
    .select('id,requester_id,created_at')
    .eq('addressee_id',state.profile.id)
    .eq('status','pending')
    .order('created_at',{ascending:false})
    .limit(5);
  if(error||!data?.length)return;
  const newest=data[0];
  const who=await profileById(newest.requester_id);
  const extra=data.length>1?` +${data.length-1} outro${data.length>2?'s':''}`:'';
  socialNotify({
    title:'Pedido de amizade pendente',
    body:`${who?.display_name||'Alguém'} quer entrar na sua lista${extra}. A diplomacia digital exige um clique.`,
    avatar:who?.avatar_url||'',
    kind:'friend',
    action:()=>openPublicProfile(newest.requester_id)
  });
}
function startDirectRealtime(){
  if(state.directChannel||!state.profile?.id)return;
  const me=state.profile.id;
  state.directChannel=supabase.channel(`avesso-social-${me}-${Date.now()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages'},async payload=>{
      const m=payload.new||{};
      if(m.sender_id!==me&&m.recipient_id!==me)return;
      if(m.sender_id===me){if(state.chatWindowOpen&&state.directPeerId===m.recipient_id)refreshChatWindow();return;}
      const sender=await profileById(m.sender_id);
      const attention=m.message_kind==='attention';
      const muted=isPeerMuted(m.sender_id);
      if(!muted){
        socialNotify({
          title:attention?`${sender?.display_name||'Alguém'} chamou sua atenção`:`Mensagem de ${sender?.display_name||'alguém'}`,
          body:attention?'CHAMAR ATENÇÃO. O protocolo de 2006 foi executado.':(m.message_kind==='image'?'enviou uma imagem':m.message_kind==='audio'?'enviou uma mensagem de voz':m.message_kind==='file'?'enviou um arquivo':String(m.body||'').slice(0,90)),
          avatar:sender?.avatar_url||'',kind:attention?'attention':'message',
          sound:!attention,
          action:()=>openFriendChat(m.sender_id)
        });
        if(attention)await receiveAttention(m.sender_id);
      }
      if(state.tab==='messages')renderMessagesPage();
      if((muted||!attention)&&state.chatWindowOpen&&state.directPeerId===m.sender_id)refreshChatWindow();
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'friendships'},async payload=>{
      const f=payload.new||{};
      if(f.addressee_id!==me||f.status!=='pending')return;
      const who=await profileById(f.requester_id);
      socialNotify({title:'Pedido de amizade',body:`${who?.display_name||'Alguém'} quer entrar na sua lista. O protocolo social ressuscitou.`,avatar:who?.avatar_url||'',kind:'friend',action:()=>openPublicProfile(f.requester_id)});
      if(state.tab==='profile')loadFriendPanel();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'friendships'},async payload=>{
      const f=payload.new||{};
      if(f.status==='accepted'&&f.requester_id===me){
        const who=await profileById(f.addressee_id);
        if(who)state.friendPresence[who.id]=cachedPresenceEntry(who);
        socialNotify({title:'Amizade aceita',body:`${who?.display_name||'Alguém'} aceitou. Nenhum contador público foi ferido.`,avatar:who?.avatar_url||'',kind:'friend',action:()=>openFriendChat(f.addressee_id)});
      }
      if(state.tab==='messages')renderMessagesPage();
      if(state.tab==='profile')loadFriendPanel();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},payload=>{
      const p=payload.new||{};
      if(p.id!==me)noteFriendPresence(p);
      if(state.tab==='messages')renderMessagesPage();
      if(state.chatWindowOpen&&state.directPeerId===p.id)openChatWindow(p.id,{keepMinimized:true});
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'guestbook_entries'},async payload=>{
      const row=payload.new||{};
      if(row.profile_id!==me||row.author_id===me)return;
      const author=await profileById(row.author_id);
      socialNotify({
        title:'Novo recado no seu Canto',
        body:`${author?.display_name||'Alguém'} escreveu na sua parede. A internet de 2007 foi restaurada com sucesso.`,
        avatar:author?.avatar_url||'',
        kind:'guestbook',
        action:()=>openPublicProfile(row.author_id)
      });
      if(state.tab==='profile')loadGuestbook(me,'#profile-guestbook');
    })
    .subscribe();
}
async function loadDirectConversation(peerId){
  if(!peerId)return[];
  const me=state.profile.id;
  const {data,error}=await supabase.from('direct_messages').select('*')
    .or(`and(sender_id.eq.${me},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${me})`)
    .order('created_at',{ascending:true}).limit(250);
  if(error)return[];
  await supabase.from('direct_messages').update({read_at:new Date().toISOString()})
    .eq('sender_id',peerId).eq('recipient_id',me).is('read_at',null);
  return Promise.all((data||[]).map(async m=>{
    if(!m.attachment_path)return m;
    const {data:signed}=await supabase.storage.from('avesso-chat').createSignedUrl(m.attachment_path,3600);
    return {...m,attachment_url:signed?.signedUrl||''};
  }));
}
function dmMessageHtml(m){
  const mine=m.sender_id===state.profile.id;
  if(m.message_kind==='attention')return `<article class="dm-attention-event">⚡ ${escapeHtml(m.body||'CHAMAR ATENÇÃO')} <small>${ago(m.created_at)}</small></article>`;
  const attachment=m.attachment_url?(m.message_kind==='image'
    ?`<a class="dm-image-link" href="${escapeAttr(m.attachment_url)}" target="_blank" rel="noopener"><img src="${escapeAttr(m.attachment_url)}" alt="${escapeAttr(m.attachment_name||'imagem')}"></a>`
    :m.message_kind==='audio'
      ?`<div class="dm-audio-card"><span>VOICE.MSG</span><audio controls preload="metadata" src="${escapeAttr(m.attachment_url)}"></audio></div>`
      :`<a class="dm-file-card" href="${escapeAttr(m.attachment_url)}" target="_blank" rel="noopener"><span>▤</span><b>${escapeHtml(m.attachment_name||'arquivo')}</b><small>${m.attachment_size?Math.ceil(m.attachment_size/1024)+' KB':''}</small></a>`):'';
  return `<article class="dm-bubble ${mine?'mine':'theirs'}">${m.body&&(!m.attachment_path||m.body!==m.attachment_name)?`<p>${escapeHtml(m.body)}</p>`:''}${attachment}<small>${ago(m.created_at)}${mine&&m.read_at?' · lida':''}</small></article>`;
}
async function renderMessagesPage(){
  if(state.tab!=='messages')return;
  const friends=await acceptedFriendProfiles();
  if(state.tab!=='messages')return;
  $('#feed-status').classList.add('hidden');
  $('#feed-list').innerHTML=`<section class="messages-hub">
    <header class="messages-hub-head"><div><span class="section-code">MSN.EXE // AMIZADES HUMANAS</span><h2>Amigos & cúmplices</h2><p>Sua lista de gente que você aceitou voluntariamente. Clique em alguém e a janela aparece, porque 2006 ainda tinha algumas ideias úteis.</p></div>
    <div class="messages-head-controls"><label class="presence-picker">aparecer como <select id="presence-mode-select"><option value="online">● online</option><option value="away">◐ ausente</option><option value="invisible">○ invisível</option></select></label><button id="notification-permission-button" class="notification-permission-button">${notificationPermissionLabel()}</button></div></header>
    <div class="compact-friend-grid">${friends.map(f=>{const p=presenceView(f),muted=isPeerMuted(f.id);return `<button class="compact-friend" data-open-chat="${f.id}"><span class="mini-avatar">${avatarHtml(f.avatar_url,f.display_name)}</span><span><b>${escapeHtml(f.display_name)}${muted?' <i class="muted-mark">🔇</i>':''}</b><small>@${escapeHtml(f.handle)}</small></span><i class="presence-dot ${p.mode}"></i><em>${p.label}${muted?' · mutado':''}</em></button>`}).join('')||'<div class="dm-empty">Nenhum amigo aceito. Uma lista de contatos vazia é muito minimalista até para nós.</div>'}</div>
  </section>`;
  $('#presence-mode-select').value=state.profile.presence_mode||'online';
  $('#presence-mode-select').onchange=e=>setPresenceMode(e.target.value);
  $('#notification-permission-button')?.addEventListener('click',async()=>{await requestBrowserNotifications();const b=$('#notification-permission-button');if(b)b.textContent=notificationPermissionLabel();});
  $$('[data-open-chat]').forEach(b=>b.onclick=()=>openChatWindow(b.dataset.openChat));
  startDirectRealtime();
}

document.addEventListener('pointerdown',e=>{
  const menu=$('#dm-options-menu');
  if(menu&&!menu.classList.contains('hidden')&&!e.target.closest('#dm-options-menu,#dm-options'))menu.classList.add('hidden');
  const emoji=$('#dm-emoticon-palette');
  if(emoji&&!emoji.classList.contains('hidden')&&!e.target.closest('#dm-emoticon-palette,#dm-emoticons'))emoji.classList.add('hidden');
  const postEmoji=$('#post-emoticon-palette');
  if(postEmoji&&!postEmoji.classList.contains('hidden')&&!e.target.closest('#post-emoticon-palette,#post-emoticons'))postEmoji.classList.add('hidden');
});

function preferredVoiceMime(){
  if(!window.MediaRecorder)return'';
  const candidates=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4','audio/webm','audio/ogg'];
  return candidates.find(type=>MediaRecorder.isTypeSupported?.(type))||'';
}
function voiceExtension(type=''){
  if(type.includes('ogg'))return'ogg';
  if(type.includes('mp4'))return'm4a';
  if(type.includes('mpeg'))return'mp3';
  return'webm';
}
function voiceElapsed(){
  if(!state.voiceStartedAt)return'0:00';
  const sec=Math.max(0,Math.floor((Date.now()-state.voiceStartedAt)/1000));
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}
function syncVoiceRecordingUI(){
  const btn=$('#dm-voice');
  const cancel=$('#dm-voice-cancel');
  const recording=state.voiceRecorder?.state==='recording';
  if(btn){
    btn.classList.toggle('recording',recording);
    btn.textContent=recording?`■ enviar ${voiceElapsed()}`:'🎙 voz';
    btn.title=recording?'Parar e enviar áudio':'Gravar mensagem de voz';
  }
  if(cancel)cancel.classList.toggle('hidden',!recording);
}
function clearVoiceRecordingState(){
  clearInterval(state.voiceTimer);
  state.voiceTimer=null;
  state.voiceRecorder=null;
  state.voiceStream?.getTracks?.().forEach(track=>track.stop());
  state.voiceStream=null;
  state.voiceChunks=[];
  state.voiceStartedAt=0;
  state.voicePeerId=null;
  syncVoiceRecordingUI();
}
function cancelVoiceRecording(quiet=false){
  if(!state.voiceRecorder)return;
  try{
    state.voiceRecorder.onstop=null;
    if(state.voiceRecorder.state!=='inactive')state.voiceRecorder.stop();
  }catch{}
  clearVoiceRecordingState();
  if(!quiet)toast('Gravação cancelada. O microfone voltou a fingir que não ouviu nada.');
}
async function toggleVoiceRecording(){
  if(state.voiceRecorder?.state==='recording'){
    try{state.voiceRecorder.stop();}catch{}
    return;
  }
  if(!state.directPeerId)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)return toast('Este navegador não oferece gravação de voz por aqui.');
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    const mime=preferredVoiceMime();
    const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    const peerId=state.directPeerId;
    state.voiceStream=stream;
    state.voiceRecorder=recorder;
    state.voiceChunks=[];
    state.voiceStartedAt=Date.now();
    state.voicePeerId=peerId;
    recorder.ondataavailable=e=>{if(e.data?.size)state.voiceChunks.push(e.data);};
    recorder.onerror=()=>{clearVoiceRecordingState();toast('A gravação tropeçou no próprio cabo.');};
    recorder.onstop=async()=>{
      const chunks=[...state.voiceChunks];
      const type=(recorder.mimeType||mime||'audio/webm').split(';')[0];
      clearInterval(state.voiceTimer);
      state.voiceTimer=null;
      stream.getTracks().forEach(track=>track.stop());
      const duration=Math.max(1,Math.round((Date.now()-state.voiceStartedAt)/1000));
      state.voiceRecorder=null;state.voiceStream=null;state.voiceChunks=[];state.voiceStartedAt=0;state.voicePeerId=null;
      syncVoiceRecordingUI();
      if(!chunks.length)return toast('O áudio terminou antes de começar. Um clássico.');
      const blob=new Blob(chunks,{type});
      if(blob.size>10*1024*1024)return toast('Áudio acima de 10 MB. Nem a nostalgia justifica um podcast inteiro.');
      const ext=voiceExtension(type);
      const file=new File([blob],`voz-${Date.now()}.${ext}`,{type});
      await sendDirectAttachment(file,{recipientId:peerId,voiceDuration:duration});
    };
    recorder.start(250);
    state.voiceTimer=setInterval(()=>{
      syncVoiceRecordingUI();
      if(Date.now()-state.voiceStartedAt>=180000&&state.voiceRecorder?.state==='recording')state.voiceRecorder.stop();
    },500);
    syncVoiceRecordingUI();
  }catch(err){
    clearVoiceRecordingState();
    if(String(err?.name)==='NotAllowedError')return toast('O microfone foi bloqueado. Libere a permissão do site para enviar voz.');
    toast('Não consegui abrir o microfone. A tecnologia continua com senso de humor.');
  }
}
function ensureChatWindow(){
  let win=$('#dm-floating-window');
  if(!win){win=document.createElement('section');win.id='dm-floating-window';win.className='dm-floating-window hidden';document.body.appendChild(win);}
  return win;
}
async function openChatWindow(peerId,{keepMinimized=false}={}){
  if(!peerId)return;
  if(state.voiceRecorder&&state.voicePeerId&&state.voicePeerId!==peerId)cancelVoiceRecording(true);
  const [peer,messages]=await Promise.all([profileById(peerId),loadDirectConversation(peerId)]);
  if(!peer)return toast('Essa pessoa sumiu da lista. Dramático.');
  state.directPeerId=peerId;state.chatWindowOpen=true;
  if(!keepMinimized)state.chatWindowMinimized=false;
  const p=presenceView(peer);
  const mePresence=presenceView(state.profile);
  const muted=isPeerMuted(peerId);
  const theme=state.profile?.chat_theme||'bbs_cyan';
  const chatWallpaper=state.profile?.chat_wallpaper||'none';
  const win=ensureChatWindow();
  win.className=`dm-floating-window ${chatThemeClass(theme)} ${state.chatWindowMinimized?'minimized':''}`;
  win.style.setProperty('--dm-chat-wallpaper',chatWallpaperCss(chatWallpaper));
  win.innerHTML=`<div class="dm-msn-titlebar" id="dm-floating-head">
      <span class="dm-msn-appmark">▓ AVESSO.MSG</span>
      <button id="dm-restore-name" class="dm-title-peer" title="Abrir conversa com ${escapeAttr(peer.display_name)}"><i class="presence-dot ${p.mode}"></i>${escapeHtml(peer.display_name)}${muted?' · 🔇':''}</button>
      <span class="dm-msn-era">56K // 2026</span>
      <div class="dm-window-controls"><button id="dm-minimize" title="${state.chatWindowMinimized?'Restaurar':'Minimizar'}">${state.chatWindowMinimized?'□':'_'}</button><button id="dm-close" title="Fechar">×</button></div>
    </div>
    <header class="dm-floating-head">
      <button class="mini-avatar profile-avatar-button" id="dm-peer-avatar">${avatarHtml(peer.avatar_url,peer.display_name)}</button>
      <div class="dm-peer-heading"><span class="dm-conversation-label">CONVERSANDO COM</span><button class="dm-peer-name" id="dm-peer-profile-name">${escapeHtml(peer.display_name)}</button><small><i class="presence-dot ${p.mode}"></i> ${p.label} · @${escapeHtml(peer.handle)}${muted?' · mutado':''}</small></div>
      <div class="dm-head-actions"><span class="dm-msn-status-orb ${p.mode}" title="${p.label}"></span><button id="dm-options" class="dm-kebab" aria-label="Opções da conversa" title="Opções da conversa">•••</button></div>
      <div id="dm-options-menu" class="dm-options-menu dm-options-menu-head hidden">
        <div class="dm-options-user"><span class="mini-avatar">${avatarHtml(peer.avatar_url,peer.display_name)}</span><div><b>${escapeHtml(peer.display_name)}</b><small>@${escapeHtml(peer.handle)}</small></div></div>
        <button id="dm-visit-profile">↗ visitar o Canto</button>
        <button id="dm-mute-peer">${muted?'🔊 desmutar':'🔇 mutar'} notificações</button>
        <button id="dm-block-peer" class="danger">⊘ bloquear usuário</button>
        <div class="dm-theme-section"><span>TEMA // PIXEL 199X → 2026</span><div class="dm-theme-grid">${CHAT_THEMES.map(([id,label,color])=>`<button type="button" class="chat-theme-choice ${theme===id?'active':''}" data-chat-theme="${id}" title="${escapeAttr(label)}"><i style="--theme-color:${color}"></i><b>${escapeHtml(label)}</b></button>`).join('')}</div></div>
        <div class="dm-wallpaper-section"><span>FUNDO // CONVERSA</span><div class="dm-chat-wallpaper-grid">${CHAT_WALLPAPERS.map(([slug,name])=>`<button type="button" class="dm-chat-wallpaper ${chatWallpaper===slug?'active':''}" data-chat-wallpaper="${escapeAttr(slug)}" title="${escapeAttr(name)}" style="${slug==='none'?'':'--chat-thumb:url(\''+wallpaperUrl(slug)+'\')'}"><i></i><b>${escapeHtml(name)}</b></button>`).join('')}</div></div>
      </div>
    </header>
    <div class="dm-window-body">
      <div class="dm-msn-conversation">
        <aside class="dm-msn-peer">
          <div class="dm-msn-peer-avatar">${avatarHtml(peer.avatar_url,peer.display_name)}</div>
          <b>${escapeHtml(peer.display_name)}</b>
          <small>${escapeHtml(peer.status_message||'online o suficiente')}</small>
          <span class="dm-msn-presence"><i class="presence-dot ${p.mode}"></i> ${p.label}${muted?' · 🔇 mutado':''}</span>
        </aside>
        <div class="dm-log" id="dm-log">${messages.map(dmMessageHtml).join('')||'<div class="dm-empty">Nenhuma mensagem ainda. O silêncio foi entregue com sucesso.</div>'}</div>
        <aside class="dm-msn-self" title="Seu perfil nesta conversa">
          <div class="dm-msn-self-avatar">${avatarHtml(state.profile.avatar_url,state.profile.display_name)}</div>
          <b>VOCÊ</b>
          <small>${escapeHtml(state.profile.display_name)}</small>
          <span class="dm-msn-presence"><i class="presence-dot ${mePresence.mode}"></i> ${mePresence.label}</span>
        </aside>
      </div>
      <div class="dm-tools">
        <button id="dm-attention" title="Chamar atenção">⚡ chamar atenção</button>
        <button id="dm-emoticons" title="Emoticons">☺ emoticons</button>
        <button id="dm-attach" title="Enviar arquivo ou imagem">📎 arquivo</button>
        <button id="dm-voice" class="dm-voice-button" title="Gravar mensagem de voz">🎙 voz</button>
        <button id="dm-voice-cancel" class="dm-voice-cancel hidden" title="Cancelar gravação">× cancelar</button>
        <input id="dm-file-input" type="file" hidden accept="image/*,audio/*,.pdf,.txt,.zip,.docx">
        <div id="dm-emoticon-palette" class="dm-emoticon-palette hidden">${avessoEmoticonButtons('data-emoticon')}</div>
      </div>
      <form id="dm-form"><input id="dm-input" maxlength="1000" autocomplete="off" placeholder="Digite uma mensagem... ou grave voz no celular sem fingir que 2006 tinha tudo."><button>Enviar</button></form>
    </div>`;
  $('#dm-minimize').onclick=toggleChatMinimize;
  $('#dm-close').onclick=()=>closeChatWindow();
  $('#dm-restore-name').onclick=e=>{e.stopPropagation();if(state.chatWindowMinimized)toggleChatMinimize();else $('#dm-input')?.focus();};
  $('#dm-peer-avatar').onclick=()=>openPublicProfile(peerId);
  $('#dm-peer-profile-name').onclick=()=>openPublicProfile(peerId);
  $('#dm-form').onsubmit=sendDirectMessage;
  $('#dm-attention').onclick=sendAttention;
  $('#dm-emoticons').onclick=()=>{$('#dm-emoticon-palette').classList.toggle('hidden');$('#dm-options-menu')?.classList.add('hidden');};
  $$('[data-emoticon]').forEach(b=>b.onclick=()=>{const input=$('#dm-input');input.value+=b.dataset.emoticon;input.focus();});
  $('#dm-attach').onclick=()=>$('#dm-file-input').click();
  $('#dm-file-input').onchange=e=>{const f=e.target.files?.[0];if(f)sendDirectAttachment(f);};
  $('#dm-voice').onclick=toggleVoiceRecording;
  $('#dm-voice-cancel').onclick=()=>cancelVoiceRecording();
  $('#dm-options').onclick=e=>{e.stopPropagation();$('#dm-options-menu').classList.toggle('hidden');$('#dm-emoticon-palette')?.classList.add('hidden');};
  $('#dm-visit-profile').onclick=()=>{openPublicProfile(peerId);$('#dm-options-menu')?.classList.add('hidden');};
  $('#dm-mute-peer').onclick=()=>toggleMutePeer(peerId);
  $('#dm-block-peer').onclick=()=>blockChatPeer(peerId);
  $$('.chat-theme-choice').forEach(b=>b.onclick=()=>setChatTheme(b.dataset.chatTheme));
  $$('[data-chat-wallpaper]').forEach(b=>b.onclick=()=>setChatWallpaper(b.dataset.chatWallpaper));
  $('#dm-floating-head').ondblclick=e=>{if(e.target.closest('.dm-window-controls,.dm-kebab,.dm-options-menu'))return;toggleChatMinimize();};
  syncVoiceRecordingUI();
  const log=$('#dm-log');if(log)log.scrollTop=log.scrollHeight;
}
async function refreshChatWindow(){
  if(!state.chatWindowOpen||!state.directPeerId)return;
  const minimized=state.chatWindowMinimized;
  await openChatWindow(state.directPeerId,{keepMinimized:true});
  state.chatWindowMinimized=minimized;
  ensureChatWindow().classList.toggle('minimized',minimized);
}
function toggleChatMinimize(){
  if(!state.chatWindowOpen)return;
  state.chatWindowMinimized=!state.chatWindowMinimized;
  const win=ensureChatWindow();
  win.classList.toggle('minimized',state.chatWindowMinimized);
  const button=$('#dm-minimize');
  if(button){button.textContent=state.chatWindowMinimized?'□':'_';button.title=state.chatWindowMinimized?'Restaurar':'Minimizar';}
  if(!state.chatWindowMinimized)setTimeout(()=>$('#dm-input')?.focus(),80);
}
function closeChatWindow(silent=false){
  if(state.voiceRecorder)cancelVoiceRecording(true);
  state.chatWindowOpen=false;state.chatWindowMinimized=false;state.directPeerId=null;
  const win=$('#dm-floating-window');if(win)win.classList.add('hidden');
  if(!silent)toast('Conversa fechada. Nenhum “tchau” automático foi enviado.');
}
function triggerScreenNudge(){
  const root=document.documentElement;
  root.classList.remove('msn-screen-nudge');
  void root.offsetWidth;
  root.classList.add('msn-screen-nudge');
  setTimeout(()=>root.classList.remove('msn-screen-nudge'),1250);
}
function triggerChatNudge(peerId){
  if(!state.chatWindowOpen||state.directPeerId!==peerId)return;
  const win=ensureChatWindow();win.classList.remove('nudge');void win.offsetWidth;win.classList.add('nudge');setTimeout(()=>win.classList.remove('nudge'),1100);
}
async function receiveAttention(peerId){
  if(!peerId)return;
  if(document.hidden)state.pendingAttentionPeerId=peerId;
  await openChatWindow(peerId);
  state.chatWindowMinimized=false;
  ensureChatWindow().classList.remove('minimized','hidden');
  triggerChatNudge(peerId);
  triggerScreenNudge();
  playUiSound('attention');
}
async function sendDirectMessage(e){
  e?.preventDefault();
  const input=$('#dm-input');const body=input?.value.trim()||'';
  if(!body||!state.directPeerId)return;
  input.value='';
  const {error}=await supabase.from('direct_messages').insert({sender_id:state.profile.id,recipient_id:state.directPeerId,body,message_kind:'text'});
  if(error){input.value=body;return toast('A mensagem não atravessou o fio. Confirme que vocês ainda são amigos.');}
  await refreshChatWindow();
}
async function sendAttention(){
  if(!state.directPeerId)return;
  const body=`${state.profile.display_name} chamou sua atenção. A internet acaba de voltar para 2006.`;
  const {error}=await supabase.from('direct_messages').insert({sender_id:state.profile.id,recipient_id:state.directPeerId,body,message_kind:'attention'});
  if(error)return toast('Nem chamar atenção chamou atenção.');
  playUiSound('attention');triggerChatNudge(state.directPeerId);triggerScreenNudge();await refreshChatWindow();
}
async function sendDirectAttachment(file,{recipientId=state.directPeerId,voiceDuration=0}={}){
  if(!recipientId||!file)return;
  if(file.size>10*1024*1024)return toast('Até 10 MB por arquivo. A nostalgia não inclui conexão discada real.');
  const allowed=/^(image\/(jpeg|png|webp|gif)|audio\/(webm|ogg|mp4|mpeg|wav|x-wav|aac|x-m4a)|application\/pdf|text\/plain|application\/(zip|x-zip-compressed)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i.test(file.type||'');
  if(!allowed)return toast('Formato não aceito nessa conversa.');
  const path=`${state.profile.id}/${recipientId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const {error:upErr}=await supabase.storage.from('avesso-chat').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(upErr)return toast('O arquivo caiu no chão antes de chegar.');
  const kind=file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file';
  const body=kind==='audio'?`Mensagem de voz${voiceDuration?' · '+voiceDuration+'s':''}`:file.name;
  const {error}=await supabase.from('direct_messages').insert({sender_id:state.profile.id,recipient_id:recipientId,body,message_kind:kind,attachment_path:path,attachment_name:file.name,attachment_type:file.type,attachment_size:file.size});
  if(error){await supabase.storage.from('avesso-chat').remove([path]);return toast('O banco recusou o pacote. Elegante.');}
  if(kind==='audio')toast('Mensagem de voz enviada. O modem imaginário sobreviveu.');
  if(state.chatWindowOpen&&state.directPeerId===recipientId)await refreshChatWindow();
}
function openFriendChat(peerId){
  state.tab='messages';bumpView();applyAppTabLayout();
  document.querySelectorAll('[data-app-tab]').forEach(x=>x.classList.toggle('active',x.dataset.appTab==='messages'));
  renderMessagesPage().then(()=>openChatWindow(peerId));
}
function openWallpaperDialog(target){
  state.wallpaperTarget=target;
  const grid=$('#wallpaper-modal-grid');
  const current=target==='profile'?state.profile.profile_wallpaper:state.profile.app_wallpaper;
  $('#wallpaper-dialog-title').textContent=target==='profile'?'Fundo do Meu Canto':'Fundo geral do AVESSO';
  grid.innerHTML=WALLPAPER_OPTIONS.map(([slug,name,tag])=>`<button class="wallpaper-choice ${slug===current?'active':''}" data-wallpaper="${slug}"><img src="${wallpaperUrl(slug)}" alt=""><b>${escapeHtml(name)}</b><small>${escapeHtml(tag)}</small></button>`).join('');
  $$('[data-wallpaper]').forEach(b=>b.onclick=()=>saveWallpaper(target,b.dataset.wallpaper));
  $('#wallpaper-dialog').showModal();
}
async function saveWallpaper(target,slug){
  if(!WALLPAPER_OPTIONS.some(x=>x[0]===slug))return;
  const column=target==='profile'?'profile_wallpaper':'app_wallpaper';
  const {data,error}=await supabase.from('profiles').update({[column]:slug,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error)return toast('O papel de parede se recusou a colar na parede.');
  state.profile=data;
  applyAppWallpaper();
  $('#wallpaper-dialog').close();
  renderProfile();
  toast(target==='profile'?'Seu Canto ganhou cenário novo.':'O AVESSO trocou de cenário. A realidade continua em beta.');
}

async function loadFriendPanel(){
  const host=$('#friends-panel'); if(!host||!state.profile)return;
  const {data:rels}=await supabase.from('friendships').select('*')
    .or(`requester_id.eq.${state.profile.id},addressee_id.eq.${state.profile.id}`)
    .order('created_at',{ascending:false});
  const list=rels||[];
  const ids=[...new Set(list.flatMap(r=>[r.requester_id,r.addressee_id]).filter(id=>id!==state.profile.id))];
  let profiles={};
  if(ids.length){
    const {data:ps}=await supabase.from('profiles').select('id,display_name,handle,avatar_url,status_message,presence_mode,last_seen').in('id',ids);
    profiles=Object.fromEntries((ps||[]).map(p=>[p.id,p]));
  }
  const incoming=list.filter(r=>r.status==='pending'&&r.addressee_id===state.profile.id);
  const outgoing=list.filter(r=>r.status==='pending'&&r.requester_id===state.profile.id);
  const accepted=list.filter(r=>r.status==='accepted');
  const card=(p,extra='')=>`<div class="friend-row"><button class="friend-avatar" data-profile-id="${p.id}">${avatarHtml(p.avatar_url,p.display_name)}</button><div><button class="user-link" data-profile-id="${p.id}">${escapeHtml(p.display_name)}</button><small>@${escapeHtml(p.handle)} ${p.status_message?'· '+escapeHtml(p.status_message):''}</small></div>${extra}</div>`;
  host.innerHTML=`
    <div class="friend-section"><h3>Pedidos recebidos <b>${incoming.length}</b></h3>${incoming.map(r=>{const p=profiles[r.requester_id];return p?card(p,`<div class="friend-actions"><button data-friend-accept="${r.id}">aceitar</button><button data-friend-decline="${r.id}">recusar</button></div>`):''}).join('')||'<p>Ninguém batendo na porta. Paz temporária.</p>'}</div>
    <div class="friend-section"><h3>Amigos <b>${accepted.length}</b></h3>${accepted.map(r=>{const id=r.requester_id===state.profile.id?r.addressee_id:r.requester_id;const p=profiles[id];return p?card(p,`<div class="friend-actions"><button data-friend-chat="${id}">mensagem</button><button data-friend-remove="${r.id}">remover</button></div>`):''}).join('')||'<p>Lista vazia. O MSN também começou assim.</p>'}</div>
    ${outgoing.length?`<div class="friend-section"><h3>Convites enviados <b>${outgoing.length}</b></h3>${outgoing.map(r=>{const p=profiles[r.addressee_id];return p?card(p,'<span class="pending-chip">pendente</span>'):''}).join('')}</div>`:''}`;
  $$('[data-friend-accept]').forEach(b=>b.onclick=()=>answerFriendRequest(b.dataset.friendAccept,true));
  $$('[data-friend-decline]').forEach(b=>b.onclick=()=>answerFriendRequest(b.dataset.friendDecline,false));
  document.querySelectorAll('[data-friend-remove]').forEach(b=>b.onclick=()=>removeFriendship(b.dataset.friendRemove));
  document.querySelectorAll('[data-friend-chat]').forEach(b=>b.onclick=()=>openFriendChat(b.dataset.friendChat));
  bindProfileLinks();
}
async function answerFriendRequest(id,accept){
  let result;
  if(accept)result=await supabase.from('friendships').update({status:'accepted',updated_at:new Date().toISOString()}).eq('id',id).select().single();
  else result=await supabase.from('friendships').delete().eq('id',id).select().single();
  if(result.error)return toast('A amizade tropeçou na burocracia.');
  if(accept&&result.data){
    const peerId=result.data.requester_id===state.profile.id?result.data.addressee_id:result.data.requester_id;
    const peer=await profileById(peerId);
    if(peer)state.friendPresence[peer.id]=cachedPresenceEntry(peer);
  }
  toast(accept?'Amizade aceita. Nenhum algoritmo comemorou.':'Pedido recusado. A civilização continua.');
  loadFriendPanel();
}
async function removeFriendship(id){
  if(!confirm('Remover esta amizade? Sem discurso de despedida obrigatório.'))return;
  const {error}=await supabase.from('friendships').delete().eq('id',id);
  if(error)return toast('Não foi possível remover agora.');
  toast('Amizade removida.');
  loadFriendPanel();
}
function openAvatarDialog(){
  const grid=$('#avatar-modal-grid');
  grid.innerHTML=AVATAR_OPTIONS.map(([label,url,kind])=>`<button class="avatar-choice-modal ${state.profile.avatar_url===url?'active':''}" data-avatar-url="${escapeAttr(url)}"><img src="${escapeAttr(url)}" alt="${escapeAttr(label)}"><b>${label}</b><small>${kind}</small></button>`).join('');
  $$('[data-avatar-url]').forEach(b=>b.onclick=()=>saveAvatar(b.dataset.avatarUrl));
  $('#avatar-dialog').showModal();
}
async function saveProfileSettings(){
  const display_name=String($('#profile-display-name').value||'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,80);
  const bio=String($('#profile-bio').value||'').slice(0,300);
  const status_message=String($('#profile-status').value||'').slice(0,140);
  if(!display_name)return toast('Seu nome pode ser estranho. Só não pode ser vazio.');
  const {data,error}=await supabase.from('profiles').update({display_name,bio,status_message,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error)return toast('O perfil resistiu à mudança. Tente novamente.');
  state.profile=data;
  await supabase.auth.updateUser({data:{display_name}}).catch(()=>{});
  $('#nav-name').textContent=data.display_name; renderNavAvatar();
  toast('Seu Canto foi atualizado. Identidade salva sem pedir aprovação do algoritmo.');
  renderProfile();
}
async function changePassword(){
  const password=$('#profile-password').value;
  const confirmPassword=$('#profile-password-confirm').value;
  if(password.length<8)return toast('Use pelo menos 8 caracteres. O 404 não precisa de ajuda.');
  if(password!==confirmPassword)return toast('As duas senhas discordaram publicamente.');
  const {error}=await supabase.auth.updateUser({password});
  if(error)return toast(humanError(error.message));
  $('#profile-password').value='';$('#profile-password-confirm').value='';
  toast('Senha alterada. A antiga pode se aposentar em paz.');
}
async function loadAlbum(userId,editable=false){
  const host=$(editable?'#profile-album':'#public-album');if(!host)return;
  const {data:photos,error}=await supabase.from('profile_photos').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(60);
  if(error){host.innerHTML='<p>O álbum caiu atrás do servidor.</p>';return;}
  const albumPhotos=(photos||[]).map(photo=>({...photo,_url:publicAlbumUrl(photo.storage_path)}));
  warmAlbumImages(albumPhotos.map(photo=>photo._url));
  const ids=albumPhotos.map(p=>p.id);
  let reactions=[];
  if(ids.length){const r=await supabase.from('photo_reactions').select('*').in('photo_id',ids);reactions=r.data||[];}
  host.innerHTML=albumPhotos.map((photo,index)=>{
    const rs=reactions.filter(r=>r.photo_id===photo.id);
    const buttons=PHOTO_REACTIONS.map(([id,icon,label])=>{const rows=rs.filter(r=>r.reaction===id);const active=rows.some(r=>r.user_id===state.profile.id);return `<button class="photo-reaction ${active?'active':''}" data-photo-react="${photo.id}" data-reaction="${id}">${icon} ${label}${rows.length?` <b>${rows.length}</b>`:''}</button>`}).join('');
    return `<article class="album-photo"><img src="${escapeAttr(photo._url)}" alt="${escapeAttr(photo.caption||'Foto do álbum')}" loading="${index<10?'eager':'lazy'}" decoding="async" fetchpriority="${index<4?'high':'auto'}"><div class="album-photo-meta"><p>${escapeHtml(photo.caption||'sem legenda. corajoso.')}</p><small>${ago(photo.created_at)}</small></div><div class="photo-reactions">${buttons}</div>${editable?`<button class="album-delete" data-photo-delete="${photo.id}" data-storage-path="${escapeAttr(photo.storage_path)}">apagar foto</button>`:''}</article>`;
  }).join('')||'<p class="album-empty">Álbum vazio. Nenhuma lembrança foi monetizada.</p>';
  $$('[data-photo-react]').forEach(b=>b.onclick=()=>togglePhotoReaction(b.dataset.photoReact,b.dataset.reaction,userId,editable));
  $$('[data-photo-delete]').forEach(b=>b.onclick=()=>deleteAlbumPhoto(b.dataset.photoDelete,b.dataset.storagePath));
}
async function uploadAlbumPhoto(){
  const file=$('#album-file')?.files?.[0];if(!file)return toast('Escolha uma foto primeiro. A telepatia continua em beta.');
  if(file.size>8*1024*1024)return toast('A foto precisa ter até 8 MB.');
  if(!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))return toast('Use JPG, PNG, WEBP ou GIF.');
  const caption=String($('#album-caption').value||'').slice(0,180);
  const path=`${state.profile.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const btn=$('#album-upload');btn.disabled=true;btn.textContent='enviando...';
  const {error:upErr}=await supabase.storage.from('avesso-albums').upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type});
  if(upErr){btn.disabled=false;btn.textContent='adicionar foto';return toast('A foto não conseguiu entrar no álbum.');}
  const {error}=await supabase.from('profile_photos').insert({user_id:state.profile.id,storage_path:path,caption});
  btn.disabled=false;btn.textContent='adicionar foto';
  if(error){await supabase.storage.from('avesso-albums').remove([path]);return toast('A foto chegou, o álbum fingiu que não conhece.');}
  $('#album-file').value='';$('#album-caption').value='';toast('Foto adicionada. Nenhum filtro de pôr do sol obrigatório.');loadAlbum(state.profile.id,true);
}
async function deleteAlbumPhoto(id,path){
  if(!confirm('Apagar esta foto do seu Canto?'))return;
  await supabase.from('profile_photos').delete().eq('id',id).eq('user_id',state.profile.id);
  await supabase.storage.from('avesso-albums').remove([path]);
  loadAlbum(state.profile.id,true);
}
async function togglePhotoReaction(photoId,reaction,userId,editable){
  if(!PHOTO_REACTIONS.some(x=>x[0]===reaction))return;
  const {data:existing}=await supabase.from('photo_reactions').select('reaction').eq('photo_id',photoId).eq('user_id',state.profile.id).maybeSingle();
  if(existing?.reaction===reaction)await supabase.from('photo_reactions').delete().eq('photo_id',photoId).eq('user_id',state.profile.id);
  else await supabase.from('photo_reactions').upsert({photo_id:photoId,user_id:state.profile.id,reaction},{onConflict:'photo_id,user_id'});
  loadAlbum(userId,editable);
}

async function renderProfile(){
  $('#feed-status').classList.add('hidden');
  const mode=state.world.preferences?.participation_mode||'world';
  const interferenceOnline=Boolean(state.world.settings?.world_interventions_enabled);
  $('#feed-list').innerHTML=`<section class="profile-control" style="--profile-wallpaper:url('${wallpaperUrl(state.profile.profile_wallpaper)}')">
    <header class="profile-control-hero">
      <div class="profile-avatar-large">${avatarHtml(state.profile.avatar_url,state.profile.display_name)}</div>
      <div><span class="section-code">MEU CANTO // IDENTIDADE</span><h2>${escapeHtml(state.profile.display_name)}</h2><p>@${escapeHtml(state.profile.handle)}</p><button id="open-avatar-picker">mudar foto de perfil</button></div>
    </header>
    <section class="profile-story-section">
      <div><span class="section-code">STORIES // SEU CANTO</span><h2>24 horas de contexto questionável</h2><p>Publique daqui também. Amigos e outros usuários podem reagir e comentar conforme a visibilidade escolhida.</p></div>
      <button id="profile-story-create">＋ postar story</button>
      <div id="profile-story-list" class="profile-story-list"><p class="story-empty">procurando coisas que ainda não expiraram...</p></div>
    </section>
    <div class="profile-settings-grid">
      <section class="profile-settings-card"><span class="section-code">PERFIL</span><label>Nome exibido <small>livre como nickname de MSN; símbolos e emojis são bem-vindos</small><input id="profile-display-name" maxlength="80" value="${escapeAttr(state.profile.display_name)}"></label><label>Mensagem de status<input id="profile-status" maxlength="140" value="${escapeAttr(state.profile.status_message||'')}" placeholder="online, mas discutivelmente disponível"></label><label>Aparecer como<select id="profile-presence"><option value="online">● online</option><option value="away">◐ ausente</option><option value="invisible">○ invisível</option></select></label><label>Bio<textarea id="profile-bio" maxlength="300">${escapeHtml(state.profile.bio||'')}</textarea></label><button id="save-profile-settings">salvar alterações</button></section>
      <section class="profile-settings-card security-card"><span class="section-code">CONTA // SEGURANÇA</span><p><b>E-mail</b><br>${escapeHtml(state.session?.user?.email||'')}</p><label>Nova senha<input id="profile-password" type="password" minlength="8" autocomplete="new-password"></label><label>Confirmar nova senha<input id="profile-password-confirm" type="password" minlength="8" autocomplete="new-password"></label><button id="change-password">alterar senha</button><small>Seu @ continua estável para links. Seu nome exibido pode trocar de personalidade quantas vezes quiser.</small></section>
    </div>
    <section class="wallpaper-control"><span class="section-code">AMBIENTE // 10 REALIDADES DISPONÍVEIS</span><h2>Seu Canto não precisa parecer aluguel mobiliado</h2><p>Escolha um cenário para o perfil e outro para o AVESSO inteiro. Porque até o caos merece papel de parede.</p><div class="wallpaper-current-grid"><button id="choose-profile-wallpaper" style="--thumb:url('${wallpaperUrl(state.profile.profile_wallpaper)}')"><span>MEU CANTO</span><b>${escapeHtml(WALLPAPER_OPTIONS.find(x=>x[0]===state.profile.profile_wallpaper)?.[1]||'Cidade 56K')}</b></button><button id="choose-app-wallpaper" style="--thumb:url('${wallpaperUrl(state.profile.app_wallpaper)}')"><span>AVESSO</span><b>${escapeHtml(WALLPAPER_OPTIONS.find(x=>x[0]===state.profile.app_wallpaper)?.[1]||'Cidade 56K')}</b></button></div></section>
    <section class="profile-album-control"><span class="section-code">ÁLBUM // FOTOS QUE VOCÊ DECIDIU NÃO APAGAR</span><h2>Seu álbum</h2><p>Poste imagens no seu Canto. Reações existem, mas continuam sem virar olimpíada social.</p><div class="album-upload-row"><input id="album-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><input id="album-caption" maxlength="180" placeholder="legenda opcional. autocontrole também."><button id="album-upload">adicionar foto</button></div><div id="profile-album" class="profile-album-grid"><p>carregando memórias...</p></div></section>
    <section class="guestbook-section guestbook-own"><span class="section-code">RECADOS // DEIXARAM ISSO AQUI</span><h2>Recados no seu Canto</h2><p>Amigos podem deixar texto, links, emojis e imagens. Você continua com a sofisticada tecnologia chamada “apagar”.</p><div id="profile-guestbook" class="guestbook-list"><p>procurando bilhetes na porta...</p></div></section>
    <section class="friends-control"><span class="section-code">PESSOAS // AMIGOS</span><h2>Lista de pessoas que você aceitou voluntariamente</h2><div id="friends-panel"><p>carregando relações humanas...</p></div></section>
    <section class="blocked-control"><span class="section-code">CONTROLE // BLOQUEADOS</span><h2>Porta fechada também é interface</h2><p>Bloquear encerra amizade e impede novas mensagens. Desbloquear não cria amizade de volta, porque nem botão deveria ter esse poder.</p><div id="blocked-panel"><p>consultando bloqueios...</p></div></section>
  </section>
  <section class="world-preferences">
    <span class="section-code">MUNDO // NÍVEL DE INTERFERÊNCIA</span>
    <h2>Quanto o AVESSO pode entrar no seu Canto?</h2>
    <p>Você escolhe o nível de bagunça. Porque consentimento continua sendo uma tecnologia surpreendentemente útil.</p>
    <div class="world-mode-grid">
      <button class="world-mode-option ${mode==='observer'?'active':''}" data-world-mode="observer"><strong>OBSERVADOR ${mode==='observer'?'<i>ATIVO</i>':''}</strong><small>O mundo acontece. Personagens mantêm as mãos longe do seu perfil.</small></button>
      <button class="world-mode-option ${mode==='world'?'active':''}" data-world-mode="world"><strong>MUNDO ${mode==='world'?'<i>ATIVO</i>':''}</strong><small>Visitas, falas e acontecimentos. Sem vandalismo cosmético pessoal.</small></button>
      <button class="world-mode-option ${mode==='chaos'?'active':''}" data-world-mode="chaos"><strong>CAOS ${mode==='chaos'?'<i>ATIVO</i>':''}</strong><small>404 pode interagir pessoalmente. A sabotagem visual continua controlada pelo sistema global.</small></button>
    </div>
    <div class="world-pref-foot"><span id="profile-world-status">carregando modo...</span><small>${interferenceOnline?'Interferências visuais globais estão online.':'O motor visual ainda está bloqueado globalmente.'} Personagens nunca reescrevem o que você publicou.</small></div>
  </section>`;
  $('#open-avatar-picker').onclick=openAvatarDialog;
  $('#profile-story-create').onclick=openStoryCreate;
  $('#save-profile-settings').onclick=saveProfileSettings;
  $('#change-password').onclick=changePassword;
  $('#profile-presence').value=state.profile.presence_mode||'online';
  $('#profile-presence').onchange=e=>setPresenceMode(e.target.value);
  $('#album-upload').onclick=uploadAlbumPhoto;
  $('#choose-profile-wallpaper').onclick=()=>openWallpaperDialog('profile');
  $('#choose-app-wallpaper').onclick=()=>openWallpaperDialog('app');
  document.querySelectorAll('[data-world-mode]').forEach(b=>b.onclick=()=>saveWorldMode(b.dataset.worldMode));
  setWorldModeLabel();
  loadFriendPanel();
  loadBlockedPanel();
  loadProfileStories(state.profile.id,'#profile-story-list');
  loadAlbum(state.profile.id,true);
  loadGuestbook(state.profile.id,'#profile-guestbook');
  algoSay('profile');
  setTimeout(()=>maybeWorldCharacter('profile',{surface:'profile'},.12,180000),900);
}
async function saveAvatar(url){
  if(!AVATAR_OPTIONS.some(x=>x[1]===url))return;
  const {data,error}=await supabase.from('profiles').update({avatar_url:url}).eq('id',state.profile.id).select().single();
  if(error)return toast('O avatar se recusou a cooperar. Dramático.');
  state.profile=data;renderNavAvatar();
  if($('#avatar-dialog').open)$('#avatar-dialog').close();
  renderProfile();
  trackAction('avatar_changed','profile',{avatar:url});
  askWorldCharacter('avatar_changed',{action_type:'avatar_changed',surface:'profile',metadata:{avatar:url}});
  toast('Avatar atualizado. A crise de identidade agora está em 16 bits.');
}
async function requestFriend(userId){
  if(!userId||userId===state.profile.id)return;
  const {data:ownBlock}=await supabase.from('blocks').select('blocked_id').eq('blocker_id',state.profile.id).eq('blocked_id',userId).maybeSingle();
  if(ownBlock)return toast('Você bloqueou esta pessoa. Desbloqueie antes de mandar amizade. Contradição social evitada.');
  const {error}=await supabase.from('friendships').insert({requester_id:state.profile.id,addressee_id:userId,status:'pending'});
  if(error){
    if(String(error.code)==='23505')return toast('Essa relação já existe em algum estado burocrático.');
    return toast('Não foi possível enviar o pedido.');
  }
  toast('Pedido de amizade enviado. Sem poke. Ainda.');
  openPublicProfile(userId);
}
async function getFriendshipWith(userId){
  const {data}=await supabase.from('friendships').select('*')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .limit(20);
  return (data||[]).find(r=>
    (r.requester_id===state.profile.id&&r.addressee_id===userId)||
    (r.addressee_id===state.profile.id&&r.requester_id===userId)
  )||null;
}
async function loadGuestbook(profileId,selector='#public-guestbook-list'){
  const host=$(selector);if(!host||!profileId)return;
  const {data:entries,error}=await supabase.from('guestbook_entries')
    .select('id,profile_id,author_id,body,image_path,created_at')
    .eq('profile_id',profileId)
    .order('created_at',{ascending:false})
    .limit(80);
  if(error){host.innerHTML='<p class="guestbook-empty">Os recados caíram atrás da estante.</p>';return;}
  const ids=[...new Set((entries||[]).map(x=>x.author_id))];
  let profiles={};
  if(ids.length){
    const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',ids);
    profiles=Object.fromEntries((data||[]).map(p=>[p.id,p]));
  }
  host.innerHTML=(entries||[]).map(entry=>{
    const author=profiles[entry.author_id]||{};
    const canDelete=entry.author_id===state.profile.id||entry.profile_id===state.profile.id;
    return `<article class="guestbook-card" data-recado-id="${entry.id}">
      <header>
        <button class="guestbook-avatar" data-profile-id="${entry.author_id}">${avatarHtml(author.avatar_url,author.display_name||'?')}</button>
        <div><button class="user-link" data-profile-id="${entry.author_id}">${escapeHtml(author.display_name||'alguém')}</button><small>@${escapeHtml(author.handle||'...')} · ${ago(entry.created_at)}</small></div>
        ${canDelete?`<button class="guestbook-delete" data-recado-delete="${entry.id}" data-recado-image="${escapeAttr(entry.image_path||'')}" title="Apagar recado">×</button>`:''}
      </header>
      ${entry.body?`<p>${richText(entry.body)}</p>`:''}
      ${entry.image_path?`<figure><img src="${escapeAttr(guestbookImageUrl(entry.image_path))}" alt="Imagem deixada no recado" loading="lazy"></figure>`:''}
    </article>`;
  }).join('')||'<p class="guestbook-empty">Nenhum recado ainda. A parede está limpa de um jeito suspeito.</p>';
  $$('[data-recado-delete]').forEach(b=>b.onclick=()=>deleteGuestbookEntry(b.dataset.recadoDelete,b.dataset.recadoImage,profileId,selector));
}
async function sendGuestbookEntry(profileId){
  if(!profileId||profileId===state.profile.id)return;
  const body=String($('#guestbook-body')?.value||'').trim().slice(0,1200);
  const file=$('#guestbook-image')?.files?.[0]||null;
  if(!body&&!file)return toast('Escreva alguma coisa ou escolha uma imagem. Telepatia segue fora do plano grátis.');
  if(file&&file.size>8*1024*1024)return toast('Imagem de até 8 MB. O mural não é um datacenter.');
  if(file&&!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))return toast('No recado, imagem precisa ser JPG, PNG, WEBP ou GIF.');
  const btn=$('#guestbook-submit');if(btn){btn.disabled=true;btn.textContent='pregando na parede...';}
  let imagePath=null;
  if(file){
    imagePath=`${state.profile.id}/${profileId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const {error:uploadError}=await supabase.storage.from('avesso-recados').upload(imagePath,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(uploadError){if(btn){btn.disabled=false;btn.textContent='deixar recado';}return toast('A imagem recusou a vida pública.');}
  }
  const {error}=await supabase.from('guestbook_entries').insert({profile_id:profileId,author_id:state.profile.id,body,image_path:imagePath});
  if(error){
    if(imagePath)await supabase.storage.from('avesso-recados').remove([imagePath]);
    if(btn){btn.disabled=false;btn.textContent='deixar recado';}
    return toast('O recado não foi deixado. Confirme se vocês ainda são amigos.');
  }
  if($('#guestbook-body'))$('#guestbook-body').value='';
  if($('#guestbook-image'))$('#guestbook-image').value='';
  if(btn){btn.disabled=false;btn.textContent='deixar recado';}
  toast('Recado deixado. A parede agora tem testemunhas.');
  trackAction('guestbook_post','public_profile',{profile_id:profileId,has_image:Boolean(file)});
  loadGuestbook(profileId,'#public-guestbook-list');
}
async function deleteGuestbookEntry(id,imagePath,profileId,selector){
  if(!id||!confirm('Apagar este recado? Sem cerimônia de encerramento.'))return;
  const {error}=await supabase.from('guestbook_entries').delete().eq('id',id);
  if(error)return toast('O recado se recusa a sair da parede.');
  if(imagePath)await supabase.storage.from('avesso-recados').remove([imagePath]);
  loadGuestbook(profileId,selector);
}
async function openPublicProfile(userId){
  if(!userId)return;
  if(userId===state.profile.id){document.querySelector('[data-app-tab="profile"]')?.click();return;}
  state.tab='public_profile';state.publicProfileId=userId;bumpView();
  document.querySelectorAll('[data-app-tab]').forEach(x=>x.classList.remove('active'));
  applyAppTabLayout();$('#feed-status').classList.add('hidden');
  const [profileRes,friendship]=await Promise.all([
    supabase.from('profiles').select('id,display_name,handle,bio,avatar_url,status_message,created_at,profile_wallpaper,presence_mode,last_seen').eq('id',userId).maybeSingle(),
    getFriendshipWith(userId)
  ]);
  if(state.tab!=='public_profile'||state.publicProfileId!==userId)return;
  const p=profileRes.data;if(!p){$('#feed-list').innerHTML='<div class="feed-status">Este Canto não foi encontrado. Talvez tenha virado lenda urbana.</div>';return;}
  let friendControl='';
  if(!friendship)friendControl=`<button data-add-friend="${p.id}">＋ adicionar amigo</button>`;
  else if(friendship.status==='accepted')friendControl=`<button data-message-friend="${p.id}">↔ mensagem</button><button data-unfriend-public="${friendship.id}">− desfazer amizade</button>`;
  else if(friendship.status==='pending'&&friendship.addressee_id===state.profile.id)friendControl=`<button data-accept-public="${friendship.id}">aceitar amizade</button>`;
  else friendControl='<span class="friend-status">pedido enviado</span>';
  const guestbookComposer=friendship?.status==='accepted'
    ? '<div class="guestbook-composer"><textarea id="guestbook-body" maxlength="1200" placeholder="deixe um recado sem transformar isso em campanha..."></textarea><div><label class="guestbook-file">＋ imagem<input id="guestbook-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><button id="guestbook-submit">deixar recado</button></div></div>'
    : '<div class="guestbook-locked">Recados são para amigos. Civilização mínima, aparentemente.</div>';
  $('#feed-list').innerHTML=`<section class="public-profile" style="--profile-wallpaper:url('${wallpaperUrl(p.profile_wallpaper)}')">
    <button id="back-from-profile" class="back-button">← voltar</button>
    <header><div class="public-profile-avatar">${avatarHtml(p.avatar_url,p.display_name)}</div><div><span class="section-code">CANTO // @${escapeHtml(p.handle)}</span><h1>${escapeHtml(p.display_name)}</h1><p class="public-presence"><i class="presence-dot ${presenceView(p).mode}"></i> ${presenceView(p).label}</p><p class="status-line">${escapeHtml(p.status_message||'sem mensagem de status')}</p><p>${escapeHtml(p.bio||'Sem bio. Uma pessoa que conseguiu parar de digitar.')}</p><div class="public-profile-actions">${friendControl}</div></div></header>
    <section class="public-story-section">
      <span class="section-code">STORIES // AINDA NÃO EXPIRARAM</span>
      <h2>Stories de ${escapeHtml(p.display_name)}</h2>
      <div id="public-story-list" class="profile-story-list"><p class="story-empty">checando o relógio...</p></div>
    </section>
    <section class="guestbook-section public-guestbook">
      <span class="section-code">RECADOS // ESCREVA NA PAREDE DE ALGUÉM</span>
      <h2>Recados para ${escapeHtml(p.display_name)}</h2>
      <p>Uma relíquia social anterior ao “engajamento”. Texto, emoji, link e imagem. Só amigos podem escrever.</p>
      ${guestbookComposer}
      <div id="public-guestbook-list" class="guestbook-list"><p>carregando recados...</p></div>
    </section>
    <section class="public-album"><h2>Álbum de ${escapeHtml(p.display_name)}</h2><div id="public-album" class="profile-album-grid"><p>abrindo gavetas...</p></div></section>
  </section>`;
  $('#back-from-profile').onclick=()=>document.querySelector('[data-app-tab="feed"]')?.click();
  $('[data-add-friend]')?.addEventListener('click',e=>requestFriend(e.currentTarget.dataset.addFriend));
  $('[data-accept-public]')?.addEventListener('click',async e=>{await answerFriendRequest(e.currentTarget.dataset.acceptPublic,true);openPublicProfile(userId);});
  $('[data-message-friend]')?.addEventListener('click',e=>openFriendChat(e.currentTarget.dataset.messageFriend));
  $('[data-unfriend-public]')?.addEventListener('click',async e=>{if(confirm('Desfazer amizade? Sem textão de despedida.')){await supabase.from('friendships').delete().eq('id',e.currentTarget.dataset.unfriendPublic);openPublicProfile(userId);}});
  $('#guestbook-submit')?.addEventListener('click',()=>sendGuestbookEntry(userId));
  loadGuestbook(userId,'#public-guestbook-list');
  loadAlbum(userId,false);
  loadProfileStories(userId,'#public-story-list');
}
function bindProfileLinks(){ /* links usam delegação global */ }
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-profile-id]');
  if(!el||!state.profile)return;
  e.preventDefault();e.stopPropagation();
  openPublicProfile(el.dataset.profileId);
});

$('#refresh-feed').onclick=()=>{ if(isFeedTab())loadFeed(); };
document.addEventListener('click',e=>{
  const target=e.target.closest('button,a,[data-app-tab]');
  if(!target||!state.profile)return;
  const label=(target.dataset.appTab||target.id||target.textContent||target.tagName).trim().slice(0,60);
  if(label){
    trackAction('screen_action',state.tab,{control:label});
    const worldSurface=!['tower','plaza'].includes(state.tab);
    const noisySurface=target.closest('.dm-floating-window,.social-notifications,dialog,form,.guestbook-composer,.plaza-chat-room');
    if(worldSurface&&!noisySurface){
      setTimeout(()=>maybeWorldCharacter('screen_action',{action_type:label,surface:state.tab,metadata:{control:label}},.10,180000),650);
    }
  }
},{passive:true});

function subscribeRealtime(){
  supabase.channel('avesso-feed')
    .on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>{if(isFeedTab())loadFeed();})
    .on('postgres_changes',{event:'*',schema:'public',table:'responses'},()=>{if(isFeedTab())loadFeed();})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'world_settings'},payload=>{
      state.world.settings=payload.new||state.world.settings;
      setWorldModeLabel();
      toast(state.world.settings?.world_interventions_enabled?'AVESSO.SYS: interferências liberadas. Péssima hora para perder o 404 de vista.':'AVESSO.SYS: interferências visuais suspensas.');
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'world_events'},payload=>{
      if(payload.new?.status==='active')toast(`EVENTO DO MUNDO // ${payload.new.title}`);
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'post_reactions'},()=>{if(isFeedTab())loadFeed();})
    .on('postgres_changes',{event:'*',schema:'public',table:'guestbook_entries'},payload=>{
      const row=payload.new?.profile_id?payload.new:(payload.old||{});
      if(state.tab==='profile'&&row.profile_id===state.profile?.id)loadGuestbook(state.profile.id,'#profile-guestbook');
      if(state.tab==='public_profile'&&row.profile_id===state.publicProfileId)loadGuestbook(state.publicProfileId,'#public-guestbook-list');
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'character_interactions'},payload=>{
      const row=payload.new||{};
      if(row.trigger_type==='plaza_chat')return;
      if(row.user_id&&row.user_id!==state.profile?.id&&row.visibility!=='world')return;
      const c=state.world.charactersById[row.character_id];
      if(state.tab==='plaza'&&c?.slug!=='npc')return;
      if(state.tab==='tower'&&c?.slug!=='rei_engajamento')return;
      if(c)showEncounter({character:c,interaction:{id:row.id,body:row.body,source:row.source}});
    })
    .subscribe();
}

function showAuthLinkError(){
  const query=new URLSearchParams(window.location.search);
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
  const errorCode=hash.get('error_code')||query.get('error_code');
  const error=hash.get('error')||query.get('error');
  if(!errorCode&&!error)return;
  window.history.replaceState(null,'',window.location.pathname);
  setAuthMode('login');
  const expired=errorCode==='otp_expired'||errorCode==='otp_disabled'||errorCode==='invalid_token';
  $('#auth-message').textContent=expired?'O link de confirmação expirou ou já foi usado. Se você já confirmou, entre com sua senha; caso contrário, solicite um novo link na aba de cadastro.':'Não foi possível concluir a confirmação. Tente entrar com a senha; caso ainda não tenha confirmado, solicite um novo link na aba de cadastro.';
  if(!$('#auth-dialog').open)$('#auth-dialog').showModal();
}

const {data:{session}}=await supabase.auth.getSession();state.session=session;if(session)enterApp();else showAuthLinkError();
