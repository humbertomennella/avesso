import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';
import { AVESSO_GIFS } from './gif-library.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const SITE_URL = new URL('./', import.meta.url).href;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { session:null, profile:null, isAdmin:false, adminRole:null, adminSnapshot:null, staffRole:null, staffRank:0, staffRoles:{}, staffSection:'overview', staffSnapshot:null, staffChannel:null, staffNotificationChannel:null, customAssets:{wallpaper:[],avatar:[],emoticon:[],character:[],landing:[],other:[]}, userBadges:{}, cmsBlocks:[], suspended:false, suspension:null, siteSettings:null, recipient:null, mode:'signup', tab:'feed', viewVersion:0, postImageFile:null, postGifUrl:'', postMediaFile:null, publicProfileId:null, plazaChannel:null, directChannel:null, directChannelStatus:'CLOSED', directReconnectTimer:null, directPollTimer:null, directWatchStartedAt:null, directSeenIds:new Set(), directAttachmentUrlCache:{}, directPeerId:null, chatWindowOpen:false, chatWindowMinimized:false, chatGeometry:null, chatMaximized:false, chatRestoreGeometry:null, presenceTimer:null, presenceWatchTimer:null, lastPresenceActivityAt:0, friendPresence:{}, friendPresenceReady:false, mutedPeers:{}, blockedPeers:{}, pendingAttentionPeerId:null, notificationPermissionArmed:false, notificationRegistration:null, wallpaperTarget:'profile', socialNotificationQueue:[], socialNotificationBusy:false, audioCtx:null, voiceRecorder:null, voiceStream:null, voiceChunks:[], voiceStartedAt:0, voiceTimer:null, voicePeerId:null, voiceHoldActive:false, voicePendingStart:false, storyChannel:null, storyBusy:false, storyTimer:null, storySequence:[], storyCurrentId:null, storyCameraStream:null, storyCameraFacing:'user', storyCameraRecorder:null, storyCameraChunks:[], storyCameraRecording:false, storyCapturedFile:null, storyPreviewUrl:'', storyRecordStopTimer:null, cornerMusicProfileId:null, cornerMusicGestureHandler:null, cornerMusicLocallyPaused:false, publicCornerMusicProfile:null, nowPlayingPushTimer:null, lastNowPlayingSignature:'', presenceBridgeSeen:false, presenceBridgeVersion:'', presenceBridgeWarned:false, browserContextBridgeSeen:false, onlineDockCollapsed:false, incomingMessagePulseTimer:null, onlineNoticeAt:{}, dmLongPressTimer:null, albumPreloaded:{}, albumUrlCache:{}, albumDataCache:{}, world:{preferences:null,settings:null,characters:{},charactersById:{},dialogues:[],idleTimer:null,encounterTimer:null,towerTimer:null,lastInteractionId:null,lastReactiveAt:0,lastAqueleAt:0,lastAqueleKey:'',pendingAquele:null,lastNotificationAt:0,recentNotificationKeys:[],notificationQueue:[],notificationBusy:false} };

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
  ['infelizmente_gostei','♥','infelizmente gostei'],
  ['isso_prestou','✓','isso prestou'],
  ['salvaria_disquete','▣','salvaria em disquete'],
  ['modem_aprovou','⌁','meu modem aprovou'],
  ['humano_detectado','◉','humano detectado'],
  ['li_me_arrependi','↩','li e me arrependi'],
  ['infelizmente_concordo','≋','infelizmente eu concordo'],
  ['pane_mas_gostei','⚡','deu pane, mas gostei']
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
  const native=AVESSO_EMOTICONS.map(value=>`<button type="button" ${attribute}="${escapeAttr(value)}" title="inserir ${escapeAttr(value)}">${escapeHtml(value)}</button>`).join('');
  const custom=(state.customAssets?.emoticon||[]).filter(x=>x.active!==false).map(asset=>{const token=asset.token||(':'+asset.slug+':');return `<button type="button" class="custom-emoticon-choice" ${attribute}="${escapeAttr(token)}" title="${escapeAttr(asset.name||asset.slug)}"><img src="${escapeAttr(assetPublicUrl(asset.storage_path))}" alt="${escapeAttr(asset.name||'emoticon')}"></button>`;}).join('');
  return native+custom;
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
  ['msn_classic','MSN Messenger 7.5','#62a9e8'],
  ['crt_void','CRT Vazio','#75ff91'],
  ['arcade_os','Arcade OS','#ff4fd8']
];
const CHAT_WALLPAPERS=[['none','Sem fundo','o vazio também é um layout'],...WALLPAPER_OPTIONS];
function assetPublicUrl(path){return path?supabase.storage.from('avesso-assets').getPublicUrl(path).data.publicUrl:'';}
function allWallpaperOptions(){const custom=(state.customAssets?.wallpaper||[]).filter(x=>x.active!==false).map(x=>[x.slug,x.name,x.metadata?.tagline||'arquivo do owner']);return [...WALLPAPER_OPTIONS,...custom.filter(row=>!WALLPAPER_OPTIONS.some(base=>base[0]===row[0]))];}
function allChatWallpapers(){return [['none','Sem fundo','o vazio também é um layout'],...allWallpaperOptions()];}
function allAvatarOptions(){const custom=(state.customAssets?.avatar||[]).filter(x=>x.active!==false).map(x=>[x.name,assetPublicUrl(x.storage_path),'custom']);return [...AVATAR_OPTIONS,...custom];}
function chatThemeClass(theme=state.profile?.chat_theme||'bbs_cyan'){
  return CHAT_THEMES.some(x=>x[0]===theme)?`theme-${theme}`:'theme-bbs_cyan';
}
function chatWallpaperCss(slug=state.profile?.chat_wallpaper||'none'){
  return allChatWallpapers().some(x=>x[0]===slug)&&slug!=='none'?`url("${wallpaperUrl(slug)}")`:'none';
}
function wallpaperUrl(slug){const custom=(state.customAssets?.wallpaper||[]).find(x=>x.slug===slug&&x.active!==false);return custom?assetPublicUrl(custom.storage_path):`assets/wallpapers/${slug||'cidade-56k'}.webp`;}
function applyAppWallpaper(){
  const useProfileWallpaper=state.tab==='profile';
  const slug=(useProfileWallpaper?state.profile?.profile_wallpaper:state.profile?.app_wallpaper)||'cidade-56k';
  document.documentElement.style.setProperty('--avesso-app-wallpaper',`url("${wallpaperUrl(slug)}")`);
  document.documentElement.dataset.wallpaperSurface=useProfileWallpaper?'profile':'app';
  document.body.classList.add('avesso-app-active');
}

function adminCrownHtml(extraClass=''){
  return '<span class="admin-crown-pixel '+escapeAttr(extraClass)+'" title="Administrador Geral do AVESSO" aria-label="Administrador Geral"><i></i></span>';
}
function staffRoleLabel(role=''){
  return ({owner:'Administrador Geral',senior_admin:'Administrador-Senior',moderator:'Moderador'})[role]||'';
}
function staffRankValue(role=''){
  return ({owner:30,senior_admin:20,moderator:10})[role]||0;
}
function badgeHtmlForUser(userId){
  return (state.userBadges?.[userId]||[]).slice(0,4).map(row=>{
    const badge=row.badge||row.badges||{};
    if(!badge.image_path)return'';
    return '<img class="identity-badge" src="'+escapeAttr(assetPublicUrl(badge.image_path))+'" alt="'+escapeAttr(badge.name||'emblema')+'" title="'+escapeAttr(badge.name||'Emblema')+'">';
  }).join('');
}
function decorateIdentityNodes(root=document){
  if(!root?.querySelectorAll)return;
  const nodes=[];
  if(root.matches?.('[data-profile-id],[data-identity-profile-id]'))nodes.push(root);
  nodes.push(...root.querySelectorAll('[data-profile-id],[data-identity-profile-id]'));
  nodes.forEach(el=>{
    const id=el.dataset.profileId||el.dataset.identityProfileId;
    if(!id)return;
    const role=state.staffRoles?.[id]||'';
    el.dataset.staffRole=role;
    const target=el.matches('.user-link,.dm-peer-name,.dm-title-peer,.identity-name,[data-identity-name]')?el:
      el.querySelector?.('.user-link,.identity-name,[data-identity-name],strong,b');
    if(!target)return;
    target.querySelectorAll?.(':scope > .identity-badges')?.forEach(x=>x.remove());
    target.querySelectorAll?.(':scope > .admin-crown-pixel')?.forEach(x=>x.remove());
    if(role==='owner')target.insertAdjacentHTML('beforeend',adminCrownHtml('identity-owner-crown'));
    const badges=badgeHtmlForUser(id);
    if(badges)target.insertAdjacentHTML('beforeend','<span class="identity-badges">'+badges+'</span>');
  });
}
function startIdentityDecoration(){
  decorateIdentityNodes(document);
  if(state.identityObserver)return;
  state.identityObserver=new MutationObserver(records=>{
    for(const record of records)record.addedNodes.forEach(node=>{if(node.nodeType===1)decorateIdentityNodes(node);});
  });
  state.identityObserver.observe(document.body,{childList:true,subtree:true});
}
function renderCustomEmoticons(text=''){
  let html=escapeHtml(text);
  for(const asset of (state.customAssets?.emoticon||[])){
    const token=asset.token||(':'+asset.slug+':');
    if(!token)continue;
    const escapedToken=escapeHtml(token);
    const img='<img class="inline-custom-emoticon" src="'+escapeAttr(assetPublicUrl(asset.storage_path))+'" alt="'+escapeAttr(token)+'" title="'+escapeAttr(asset.name||token)+'">';
    html=html.split(escapedToken).join(img);
  }
  return html;
}
async function loadPublicExperience(){
  const [assetsRes,cmsRes,userBadgesRes]=await Promise.all([
    supabase.from('asset_catalog').select('*').eq('active',true).order('sort_order').order('name'),
    supabase.from('site_content_blocks').select('*').eq('enabled',true).order('page_slug').order('sort_order'),
    supabase.from('user_badges').select('user_id,badge_id,badges(id,name,description,image_path,active)')
  ]);
  state.customAssets={wallpaper:[],avatar:[],emoticon:[],character:[],landing:[],other:[]};
  for(const asset of (assetsRes.data||[]))(state.customAssets[asset.kind]??=[]).push(asset);
  state.cmsBlocks=cmsRes.data||[];
  state.userBadges={};
  for(const row of (userBadgesRes.data||[])){
    const badge=row.badges;
    if(!badge?.active)continue;
    (state.userBadges[row.user_id]??=[]).push({...row,badge});
  }
  applyCmsBlocks();
  decorateIdentityNodes(document);
}
function cmsValue(page,key,fallback=''){
  return state.cmsBlocks?.find(x=>x.page_slug===page&&x.block_key===key&&x.enabled!==false)?.value??fallback;
}
function applyCmsBlocks(){
  const kicker=document.querySelector('#marketing-view .hero .eyebrow');
  if(kicker)kicker.innerHTML='<i></i> '+escapeHtml(cmsValue('home','hero.kicker','CONEXÃO RESTABELECIDA // 56K DE HUMANIDADE'));
  const title=document.querySelector('#marketing-view .hero h1');
  if(title)title.textContent=cmsValue('home','hero.title','A internet ficou do Avesso. A gente só admitiu.');
  const body=document.querySelector('#marketing-view .hero-copy>p');
  if(body)body.textContent=cmsValue('home','hero.body','Uma rede social onde você não publica sobre si mesmo, não coleciona seguidores e não ganha medalha por ter opinião em horário comercial.');
  const authTitle=document.querySelector('#auth-dialog .auth-brand h2');
  if(authTitle)authTitle.textContent=cmsValue('auth','title','Vire do Avesso');
  const authSub=document.querySelector('#auth-dialog .auth-brand p');
  if(authSub)authSub.textContent=cmsValue('auth','subtitle','Leva menos tempo que escolher uma bio “autêntica”.');
}
function applySiteSettings(settings=state.siteSettings||{}){
  if(!settings)return;
  const root=document.documentElement;
  const vars={
    '--bg':settings.color_bg,'--panel':settings.color_panel,'--panel2':settings.color_panel2,
    '--ink':settings.color_ink,'--muted':settings.color_muted,'--line':settings.color_line,
    '--acid':settings.color_acid,'--cyan':settings.color_cyan,'--coral':settings.color_coral,'--violet':settings.color_violet
  };
  Object.entries(vars).forEach(([name,value])=>{if(/^#[0-9a-f]{6}$/i.test(String(value||'')))root.style.setProperty(name,value);});
  const cssId='avesso-admin-custom-css';
  let style=document.getElementById(cssId);
  if(!style){style=document.createElement('style');style.id=cssId;document.head.appendChild(style);}
  style.textContent=String(settings.custom_css||'').slice(0,20000);
  const siteName=String(settings.site_name||'AVESSO').trim()||'AVESSO';
  const tagline=String(settings.tagline||'menos palco, mais presença').trim();
  document.title=tagline?siteName+' — '+tagline:siteName;
  document.querySelectorAll('.brand > span:not(.brand-mark)').forEach(el=>{el.textContent=siteName;});
  let bar=document.getElementById('site-admin-announcement');
  if(!bar){bar=document.createElement('div');bar.id='site-admin-announcement';bar.className='site-admin-announcement hidden';document.body.appendChild(bar);}
  const announcement=String(settings.announcement||'').trim();
  bar.textContent=announcement;
  bar.classList.toggle('hidden',!announcement);
  const layout=settings.layout_config||{};
  document.documentElement.dataset.avessoDensity=layout.density||'compact';
  document.documentElement.dataset.avessoFeedWidth=layout.feed_width||'normal';
  document.documentElement.dataset.avessoSidebar=layout.sidebar_mode||'fixed';
}
async function loadSiteSettings(){
  const {data,error}=await supabase.from('site_settings').select('*').eq('id','global').maybeSingle();
  if(error||!data)return;
  state.siteSettings=data;
  applySiteSettings(data);
}
async function loadOwnModeration(){
  state.suspended=false;state.suspension=null;
  if(!state.profile?.id)return;
  const {data}=await supabase.from('user_moderation').select('suspended,reason,suspended_until,updated_at').eq('user_id',state.profile.id).maybeSingle();
  if(!data)return;
  const active=Boolean(data.suspended)&&(!data.suspended_until||new Date(data.suspended_until)>new Date());
  state.suspended=active;
  state.suspension=data;
  document.body.classList.toggle('account-suspended',active);
  if(active){
    const until=data.suspended_until?' até '+new Date(data.suspended_until).toLocaleString('pt-BR'):'';
    toast('Conta suspensa'+until+'. Você ainda pode consultar seu histórico, mas novas ações sociais estão bloqueadas.');
  }
}


function ensureReportDialog(){
  let dialog=$('#report-user-dialog');
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='report-user-dialog';
  dialog.className='report-user-dialog';
  dialog.innerHTML=`<form id="report-user-form" method="dialog">
    <button class="dialog-close" type="button" id="report-user-close" aria-label="Fechar">×</button>
    <span class="section-code">DENÚNCIA // HUMANO → STAFF</span>
    <h2>Denunciar usuário</h2>
    <p id="report-user-target">carregando alvo...</p>
    <label>Motivo<select id="report-user-reason">
      <option value="assedio">assédio</option>
      <option value="odio">ódio / discriminação</option>
      <option value="spam">spam</option>
      <option value="risco">risco / ameaça</option>
      <option value="outro">outro</option>
    </select></label>
    <label>Detalhes<textarea id="report-user-details" maxlength="500" placeholder="explique o contexto. moderação sem contexto vira loteria."></textarea></label>
    <div class="report-user-actions"><button type="button" id="report-user-cancel">cancelar</button><button type="submit" class="danger">enviar denúncia</button></div>
  </form>`;
  document.body.appendChild(dialog);
  $('#report-user-close').onclick=()=>dialog.close();
  $('#report-user-cancel').onclick=()=>dialog.close();
  $('#report-user-form').onsubmit=submitUserReport;
  return dialog;
}
async function openReportUser(userId){
  if(!userId||!state.profile?.id)return;
  if(userId===state.profile.id)return toast('Denunciar a si mesmo seria uma eficiência administrativa admirável, mas não.');
  const profile=await profileById(userId);
  if(!profile)return toast('Esse usuário não foi encontrado.');
  const dialog=ensureReportDialog();
  dialog.dataset.reportedProfileId=userId;
  $('#report-user-target').innerHTML='Você está denunciando <b>'+escapeHtml(profile.display_name)+'</b> <small>@'+escapeHtml(profile.handle)+'</small>. A denúncia vai para a fila da Staff.';
  $('#report-user-reason').value='outro';
  $('#report-user-details').value='';
  if(!dialog.open)dialog.showModal();
}
async function submitUserReport(e){
  e.preventDefault();
  const dialog=$('#report-user-dialog');
  const reported_profile_id=dialog?.dataset.reportedProfileId;
  const reason=$('#report-user-reason')?.value||'outro';
  const details=String($('#report-user-details')?.value||'').trim().slice(0,500);
  if(!reported_profile_id)return;
  if(details.length<4)return toast('Inclua um pouco de contexto. Quatro caracteres já vencem a burocracia.');
  const submit=$('#report-user-form button[type="submit"]');if(submit)submit.disabled=true;
  const {error}=await supabase.from('reports').insert({
    reporter_id:state.profile.id,
    reported_profile_id,
    post_id:null,
    reason,
    details,
    status:'aberto',
    priority:reason==='risco'?'alta':'normal'
  });
  if(submit)submit.disabled=false;
  if(error){console.error('report user failed',error);return toast('A denúncia não conseguiu entrar na fila.');}
  dialog.close();
  toast('Denúncia enviada à Staff. Sem espetáculo público, como deve ser.');
}
async function loadStaffNotifications(){
  if(!state.profile?.id)return;
  const {data,error}=await supabase.from('staff_notifications').select('id,title,body,severity,created_at,read_at,sender_id').eq('recipient_id',state.profile.id).is('read_at',null).order('created_at',{ascending:true}).limit(20);
  if(error)return;
  for(const row of (data||[])){
    socialNotify({title:row.title,body:row.body,kind:row.severity==='critical'?'world':'message',sound:row.severity!=='info'});
    await supabase.from('staff_notifications').update({read_at:new Date().toISOString()}).eq('id',row.id).eq('recipient_id',state.profile.id);
  }
}
function startStaffNotificationRealtime(){
  if(state.staffNotificationChannel){supabase.removeChannel(state.staffNotificationChannel);state.staffNotificationChannel=null;}
  if(!state.profile?.id)return;
  state.staffNotificationChannel=supabase.channel('staff-notice-'+state.profile.id+'-'+Date.now())
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'staff_notifications',filter:'recipient_id=eq.'+state.profile.id},payload=>{
      const row=payload.new||{};
      socialNotify({title:row.title||'Mensagem da Staff',body:row.body||'',kind:row.severity==='critical'?'world':'message',sound:row.severity!=='info'});
      supabase.from('staff_notifications').update({read_at:new Date().toISOString()}).eq('id',row.id).eq('recipient_id',state.profile.id).then(()=>{});
    }).subscribe();
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
  const isVideo=story.media_type==='video';
  const style=story.image_url&&!isVideo?'--story-thumb:url(\''+escapeAttr(story.image_url)+'\')':'';
  return '<button class="story-card '+(compact?'compact ':'')+(isVideo?'has-video':'')+'" data-story-open="'+escapeAttr(story.id)+'" style="'+style+'">'+
    '<span class="story-ring"><i>'+avatarHtml(a.avatar_url,a.display_name||'?')+'</i></span>'+
    (isVideo?'<em class="story-card-media">▶ vídeo</em>':'')+
    '<span class="story-card-copy"><b class="identity-name" data-identity-profile-id="'+escapeAttr(story.author_id)+'">'+escapeHtml(a.display_name||'humano')+'</b><small>'+(story.visibility==='amigos'?'amigos':'público')+' · '+storyTimeLeft(story.expires_at)+'</small></span>'+
  '</button>';
}

async function loadStoriesStrip(){
  const host=$('#stories-zone');
  if(!host||!state.profile||state.tab!=='feed'||state.siteSettings?.feed_config?.show_stories===false){host?.classList.add('hidden');return;}
  host.classList.remove('hidden');
  const {data,error}=await supabase.from('stories').select('id,author_id,body,image_path,media_type,visibility,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(60);
  if(error){host.innerHTML='<div class="stories-error">stories deram tela azul.</div>';return;}
  const stories=await hydrateStories((data||[]).filter(s=>!isPeerBlocked(s.author_id)));
  const latestByAuthor=[],seen=new Set();
  for(const s of stories){if(!seen.has(s.author_id)){seen.add(s.author_id);latestByAuthor.push(s);}}
  const storyHours=Math.max(1,Math.min(24,Number(state.siteSettings?.story_config?.duration_hours)||24));
  host.innerHTML=`<div class="stories-head"><div><span class="section-code">STORIES // ${storyHours}H</span><b>temporário, como toda boa decisão na internet</b></div><button id="story-create-feed">＋ postar story</button></div><div class="stories-strip"><button class="story-new-card" id="story-create-feed-card"><span class="story-ring self"><i>${avatarHtml(state.profile.avatar_url,state.profile.display_name)}</i><em>＋</em></span><b>seu story</b><small>${storyHours}h e acabou</small></button>${latestByAuthor.map(s=>storyCardHtml(s,{compact:true})).join('')}</div>`;
  $('#story-create-feed')?.addEventListener('click',openStoryCreate);
  $('#story-create-feed-card')?.addEventListener('click',openStoryCreate);
  const storySequence=latestByAuthor.map(s=>s.id);
  host.querySelectorAll('[data-story-open]').forEach(b=>b.onclick=()=>openStory(b.dataset.storyOpen,{sequence:storySequence}));
}

function clearStoryPreview(){
  if(state.storyPreviewUrl){try{URL.revokeObjectURL(state.storyPreviewUrl);}catch{}}
  state.storyPreviewUrl='';
  const box=$('#story-image-preview');
  if(box){box.classList.add('hidden');box.innerHTML='';}
}
function stopStoryCamera(){
  clearTimeout(state.storyRecordStopTimer);state.storyRecordStopTimer=null;
  if(state.storyCameraRecorder&&state.storyCameraRecorder.state!=='inactive'){
    try{state.storyCameraRecorder.stop();}catch{}
  }
  state.storyCameraRecorder=null;
  state.storyCameraRecording=false;
  state.storyCameraChunks=[];
  if(state.storyCameraStream)state.storyCameraStream.getTracks().forEach(track=>track.stop());
  state.storyCameraStream=null;
  const video=$('#story-camera-preview');if(video)video.srcObject=null;
  $('#story-camera-panel')?.classList.add('hidden');
  const record=$('#story-camera-record');
  if(record){record.classList.remove('recording');record.textContent='● gravar vídeo';}
}
function storySelectedFile(){
  return state.storyCapturedFile||$('#story-image')?.files?.[0]||null;
}
function renderStoryMediaPreview(file){
  clearStoryPreview();
  if(!file)return;
  const box=$('#story-image-preview');if(!box)return;
  const url=URL.createObjectURL(file);state.storyPreviewUrl=url;
  const isVideo=file.type.startsWith('video/');
  if(isVideo){
    box.innerHTML='<video src="'+escapeAttr(url)+'" controls playsinline preload="metadata"></video><small>'+escapeHtml(file.name)+' · vídeo</small>';
  }else{
    box.innerHTML='<img src="'+escapeAttr(url)+'" alt="prévia do story"><small>'+escapeHtml(file.name)+' · imagem</small>';
  }
  box.classList.remove('hidden');
}
async function openStoryCamera(){
  if(!navigator.mediaDevices?.getUserMedia)return toast('Este navegador não liberou câmera para o AVESSO.');
  stopStoryCamera();
  const constraints={
    video:{facingMode:{ideal:state.storyCameraFacing},width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30,max:30}},
    audio:true
  };
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia(constraints);}
  catch{
    try{stream=await navigator.mediaDevices.getUserMedia({video:constraints.video,audio:false});}
    catch{return toast('A câmera não abriu. Confira a permissão do navegador e se outro aplicativo não sequestrou a lente.');}
  }
  state.storyCameraStream=stream;
  const video=$('#story-camera-preview');
  if(video){video.srcObject=stream;video.play().catch(()=>{});}
  $('#story-camera-panel')?.classList.remove('hidden');
  const status=$('#story-camera-status');
  if(status)status.textContent='CAMERA.SYS // '+(state.storyCameraFacing==='user'?'frontal':'traseira');
}
async function switchStoryCamera(){
  state.storyCameraFacing=state.storyCameraFacing==='user'?'environment':'user';
  await openStoryCamera();
}
function takeStoryPhoto(){
  const video=$('#story-camera-preview');
  if(!video||!state.storyCameraStream||!video.videoWidth)return toast('A câmera ainda está acordando.');
  const canvas=document.createElement('canvas');
  const max=1600,scale=Math.min(1,max/video.videoWidth);
  canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
  canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
  const ctx=canvas.getContext('2d');
  if(state.storyCameraFacing==='user'){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
  ctx.drawImage(video,0,0,canvas.width,canvas.height);
  canvas.toBlob(blob=>{
    if(!blob)return toast('A foto virou metafísica antes de virar arquivo.');
    state.storyCapturedFile=new File([blob],'avesso-story-'+Date.now()+'.jpg',{type:'image/jpeg'});
    const input=$('#story-image');if(input)input.value='';
    renderStoryMediaPreview(state.storyCapturedFile);
    stopStoryCamera();
  },'image/jpeg',.9);
}
function preferredStoryVideoMime(){
  const candidates=['video/webm;codecs=vp8,opus','video/webm','video/mp4'];
  return candidates.find(type=>window.MediaRecorder?.isTypeSupported?.(type))||'';
}
function toggleStoryRecording(){
  if(!state.storyCameraStream){openStoryCamera();return;}
  if(!window.MediaRecorder)return toast('Este navegador vê vídeo, mas decidiu não saber gravá-lo. Modernidade seletiva.');
  if(state.storyCameraRecorder?.state==='recording'){
    clearTimeout(state.storyRecordStopTimer);state.storyRecordStopTimer=null;
    state.storyCameraRecorder.stop();
    return;
  }
  const mime=preferredStoryVideoMime();
  let recorder;
  try{recorder=new MediaRecorder(state.storyCameraStream,mime?{mimeType:mime}:undefined);}
  catch{return toast('O gravador não conseguiu negociar um formato com este navegador.');}
  state.storyCameraRecorder=recorder;
  state.storyCameraChunks=[];
  recorder.ondataavailable=e=>{if(e.data?.size)state.storyCameraChunks.push(e.data);};
  recorder.onstop=()=>{
    clearTimeout(state.storyRecordStopTimer);state.storyRecordStopTimer=null;
    const type=recorder.mimeType||mime||'video/webm';
    const blob=new Blob(state.storyCameraChunks,{type});
    if(blob.size){
      const ext=type.includes('mp4')?'mp4':'webm';
      state.storyCapturedFile=new File([blob],'avesso-story-'+Date.now()+'.'+ext,{type});
      const input=$('#story-image');if(input)input.value='';
      renderStoryMediaPreview(state.storyCapturedFile);
    }
    state.storyCameraRecording=false;
    const button=$('#story-camera-record');
    if(button){button.classList.remove('recording');button.textContent='● gravar vídeo';}
    state.storyCameraRecorder=null;
    if(state.storyCameraStream)state.storyCameraStream.getTracks().forEach(track=>track.stop());
    state.storyCameraStream=null;
    const live=$('#story-camera-preview');if(live)live.srcObject=null;
    $('#story-camera-panel')?.classList.add('hidden');
  };
  recorder.start(250);
  state.storyCameraRecording=true;
  const button=$('#story-camera-record');
  if(button){button.classList.add('recording');button.textContent='■ parar gravação';}
  const status=$('#story-camera-status');
  const maxSeconds=Math.max(5,Math.min(30,Number(state.siteSettings?.story_config?.max_video_seconds)||15));
  if(status)status.textContent='REC // máximo '+maxSeconds+' segundos';
  state.storyRecordStopTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},maxSeconds*1000);
}
function openStoryCreate(){
  const dialog=$('#story-create-dialog');if(!dialog)return;
  stopStoryCamera();
  state.storyCapturedFile=null;
  clearStoryPreview();
  $('#story-create-message').textContent='';
  $('#story-body').value='';
  $('#story-image').value='';
  const storyCfg=state.siteSettings?.story_config||{};
  $('#story-visibility').value=storyCfg.default_visibility==='amigos'?'amigos':'publico';
  const camera=$('#story-camera-open');if(camera){camera.classList.toggle('hidden',storyCfg.camera_enabled===false);camera.disabled=storyCfg.camera_enabled===false;}
  const publish=$('#story-publish');if(publish)publish.textContent='publicar por '+Math.max(1,Math.min(24,Number(storyCfg.duration_hours)||24))+'h';
  if(!dialog.open)dialog.showModal();
  setTimeout(()=>$('#story-body')?.focus(),40);
}

async function publishStory(){
  if(state.storyBusy)return;
  const body=String($('#story-body')?.value||'').trim().slice(0,420);
  const file=storySelectedFile();
  const visibility=$('#story-visibility')?.value==='amigos'?'amigos':'publico';
  const mediaType=file?(file.type.startsWith('video/')?'video':'image'):null;
  if(!body&&!file)return toast('Story vazio dura zero horas. Eficiência admirável, utilidade discutível.');
  if(file&&mediaType==='image'&&file.size>8*1024*1024)return toast('Imagem de story: até 8 MB. Pixels também pagam aluguel.');
  if(file&&mediaType==='video'&&file.size>30*1024*1024)return toast('Vídeo de story: até 30 MB. Não vamos recriar um streaming dentro do feed.');
  if(file&&mediaType==='image'&&!/^image\/(jpeg|png|webp|gif)$/i.test(file.type))return toast('Imagem de story aceita JPG, PNG, WEBP ou GIF.');
  if(file&&mediaType==='video'&&!/^video\/(webm|mp4|quicktime)$/i.test(file.type))return toast('Vídeo de story aceita WEBM, MP4 ou MOV.');
  state.storyBusy=true;
  const btn=$('#story-publish');if(btn){btn.disabled=true;btn.textContent='subindo para a internet...';}
  let created=null,mediaPath=null;
  try{
    const storyHours=Math.max(1,Math.min(24,Number(state.siteSettings?.story_config?.duration_hours)||24));
    const expires_at=new Date(Date.now()+storyHours*3600000).toISOString();
    const ins=await supabase.from('stories').insert({author_id:state.profile.id,body,visibility,media_type:mediaType,expires_at}).select().single();
    if(ins.error)throw ins.error;
    created=ins.data;
    if(file){
      mediaPath=state.profile.id+'/'+created.id+'/'+crypto.randomUUID()+'-'+safeFileName(file.name);
      const up=await supabase.storage.from('avesso-stories').upload(mediaPath,file,{cacheControl:'86400',upsert:false,contentType:file.type});
      if(up.error)throw up.error;
      const upd=await supabase.from('stories').update({image_path:mediaPath,media_type:mediaType}).eq('id',created.id);
      if(upd.error)throw upd.error;
    }
    stopStoryCamera();
    clearStoryPreview();
    state.storyCapturedFile=null;
    $('#story-create-dialog')?.close();
    toast('Story publicado. O relógio de '+storyHours+'h já começou.');
    trackAction('story_posted','stories',{visibility,media_type:mediaType||'text'});
    await loadStoriesStrip();
    if(state.tab==='profile')loadProfileStories(state.profile.id,'#profile-story-list');
  }catch(err){
    if(mediaPath)await supabase.storage.from('avesso-stories').remove([mediaPath]);
    if(created?.id)await supabase.from('stories').delete().eq('id',created.id);
    console.error('story publish',err);
    toast('O story caiu antes de completar 24 horas.');
  }finally{
    state.storyBusy=false;
    if(btn){btn.disabled=false;btn.textContent='publicar por '+Math.max(1,Math.min(24,Number(state.siteSettings?.story_config?.duration_hours)||24))+'h';}
  }
}

async function loadProfileStories(userId,selector){
  const host=$(selector);if(!host||!userId)return;
  const {data,error}=await supabase.from('stories').select('id,author_id,body,image_path,media_type,visibility,created_at,expires_at').eq('author_id',userId).gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(20);
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
  const {data:story,error}=await supabase.from('stories').select('id,author_id,body,image_path,media_type,visibility,created_at,expires_at').eq('id',storyId).gt('expires_at',new Date().toISOString()).maybeSingle();
  if(error||!story){if(options.auto)closeStoryViewer();return toast('Este story expirou ou você não pode vê-lo. O tempo venceu outra vez.');}
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
  const storyIsVideo=story.media_type==='video';
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
    <div class="story-stage ${image_url?'has-image':''} ${storyIsVideo?'has-video':''}" style="${image_url&&!storyIsVideo?`--story-image:url('${escapeAttr(image_url)}')`:''}">${image_url?(storyIsVideo?`<video class="story-video" src="${escapeAttr(image_url)}" controls playsinline preload="metadata"></video>`:`<img src="${escapeAttr(image_url)}" alt="Story de ${escapeAttr(a.display_name||'usuário')}" decoding="async" fetchpriority="high">`):''}${story.body?`<p>${escapeHtml(story.body)}</p>`:''}</div>
    <div class="story-reactions">${reactionHtml}</div>
    <section class="story-comments"><h3>respostas // sem plateia</h3><div class="story-comment-list">${commentsHtml}</div><div class="story-comment-compose"><textarea id="story-comment-body" maxlength="420" placeholder="responda antes que isso desapareça..."></textarea><div><button id="story-comment-emoticons" type="button">☻ avessícones</button><button id="story-comment-send" type="button">responder</button></div><div id="story-comment-palette" class="feed-emoticon-palette hidden">${avessoEmoticonButtons('data-story-comment-emoticon')}</div></div></section>
  </article>`;
  const dialog=$('#story-view-dialog');if(!dialog.open)dialog.showModal();
  host.querySelectorAll('[data-story-react]').forEach(b=>b.onclick=()=>toggleStoryReaction(story.id,b.dataset.storyReact));
  $('#story-comment-send').onclick=()=>sendStoryComment(story.id);
  $('#story-comment-emoticons').onclick=()=>$('#story-comment-palette').classList.toggle('hidden');
  host.querySelectorAll('[data-story-comment-emoticon]').forEach(b=>b.onclick=()=>{const input=$('#story-comment-body');if(input){input.value+=`${input.value?' ':''}${b.dataset.storyCommentEmoticon}`;input.focus();}});
  const storyVideo=host.querySelector('.story-video');
  storyVideo?.addEventListener('play',pauseStoryTimer);
  storyVideo?.addEventListener('pause',resumeStoryTimer);
  storyVideo?.addEventListener('ended',resumeStoryTimer);
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
    state.notificationRegistration=await navigator.serviceWorker.register(new URL('sw.js',SITE_URL).href,{scope:new URL('./',SITE_URL).pathname,updateViaCache:'none'});
    state.notificationRegistration.update().catch(()=>{});
    return state.notificationRegistration;
  }catch{return null;}
}
async function browserNotify({title='AVESSO',body='',avatar='',kind='message',action=null}={}){
  if((!document.hidden&&document.hasFocus())||!('Notification' in window)||Notification.permission!=='granted')return;
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
const NOW_PLAYING_TTL_MS=35000;
function nowPlayingView(profile){
  if(!profile?.listening_visible||!profile.now_playing_title)return null;
  if(!profile.now_playing_manual){
    if(!profile.now_playing_updated_at)return null;
    const age=Date.now()-new Date(profile.now_playing_updated_at).getTime();
    if(!Number.isFinite(age)||age>NOW_PLAYING_TTL_MS)return null;
  }
  return {
    title:String(profile.now_playing_title||'').slice(0,180),
    artist:String(profile.now_playing_artist||'').slice(0,180),
    source:String(profile.now_playing_source||'').slice(0,80),
    url:String(profile.now_playing_url||'').slice(0,1000)
  };
}
function nowPlayingHtml(profile,{compact=false}={}){
  const np=nowPlayingView(profile);
  if(!np)return'';
  const label=np.artist?`${np.title} — ${np.artist}`:np.title;
  const content=`<span class="now-playing-eq" aria-hidden="true"><i></i><i></i><i></i></span><span><b>♫ ouvindo agora</b><small>${escapeHtml(label)}${np.source?` · ${escapeHtml(np.source)}`:''}</small></span>`;
  return np.url
    ?`<a class="now-playing-status ${compact?'compact':''}" href="${escapeAttr(np.url)}" target="_blank" rel="noopener noreferrer">${content}</a>`
    :`<div class="now-playing-status ${compact?'compact':''}">${content}</div>`;
}
function chatNowPlayingHtml(profile,{compact=false}={}){
  if(profile?.chat_listening_visible===false)return'';
  return nowPlayingHtml(profile,{compact});
}
function syncPresenceCompanionConfig(){
  if(!state.profile)return;
  window.postMessage({
    type:'AVESSO_PRESENCE_CONFIG',
    shareContext:Boolean(state.profile.ai_browser_context_visible)
  },location.origin);
  window.postMessage({type:'AVESSO_PRESENCE_REQUEST'},location.origin);
}
function refreshOwnNowPlayingPreview(){
  const host=$('#profile-now-playing-preview');
  if(!host)return;
  host.innerHTML=nowPlayingHtml(state.profile)||'<div class="now-playing-empty">nada detectado agora. o silêncio também tem presença.</div>';
  const hero=$('#profile-hero-listening');
  if(hero)hero.innerHTML=nowPlayingHtml(state.profile);
  const bridge=$('#listening-bridge-status');
  if(bridge)bridge.textContent=state.presenceBridgeSeen?`PONTE ATIVA${state.presenceBridgeVersion?' // v'+state.presenceBridgeVersion:''} // recebendo do navegador`:'PONTE AUSENTE // site sozinho não consegue ler outras abas ou apps';
}
async function saveListeningPrivacy(){
  if(!state.profile?.id)return;
  const visible=Boolean($('#listening-visible')?.checked);
  const chatVisible=Boolean($('#chat-listening-visible')?.checked);
  const patch={
    listening_visible:visible,
    chat_listening_visible:chatVisible,
    updated_at:new Date().toISOString()
  };
  if(!visible){
    Object.assign(patch,{now_playing_title:null,now_playing_artist:null,now_playing_source:null,now_playing_url:null,now_playing_updated_at:null,now_playing_manual:false});
  }
  const {data,error}=await supabase.from('profiles').update(patch).eq('id',state.profile.id).select().single();
  if(error)return toast('A privacidade do som tropeçou no banco.');
  state.profile=data;
  refreshOwnNowPlayingPreview();
  if(visible)window.postMessage({type:'AVESSO_PRESENCE_REQUEST'},location.origin);
  toast(visible?(chatVisible?'“Ouvindo agora” visível também nas conversas.':'Música visível no Canto e escondida nas conversas.'):'“Ouvindo agora” oculto. Ninguém precisa saber de tudo.');
}
async function pushNowPlaying(payload){
  if(!state.profile?.id||!state.profile.listening_visible)return;
  const clean=payload&&payload.title?{
    title:String(payload.title||'').trim().slice(0,180),
    artist:String(payload.artist||'').trim().slice(0,180),
    source:String(payload.source||'').trim().slice(0,80),
    url:String(payload.url||'').trim().slice(0,1000)
  }:null;
  const signature=clean?JSON.stringify(clean):'';
  const changed=signature!==state.lastNowPlayingSignature;
  if(!changed&&state.profile.now_playing_updated_at&&Date.now()-new Date(state.profile.now_playing_updated_at).getTime()<22000)return;
  state.lastNowPlayingSignature=signature;
  clearTimeout(state.nowPlayingPushTimer);
  state.nowPlayingPushTimer=setTimeout(async()=>{
    const patch=clean?{
      now_playing_title:clean.title,
      now_playing_artist:clean.artist||null,
      now_playing_source:clean.source||null,
      now_playing_url:clean.url||null,
      now_playing_updated_at:new Date().toISOString(),
      now_playing_manual:false,
      updated_at:new Date().toISOString()
    }:{
      now_playing_title:null,now_playing_artist:null,now_playing_source:null,now_playing_url:null,now_playing_updated_at:null,now_playing_manual:false,updated_at:new Date().toISOString()
    };
    const {data,error}=await supabase.from('profiles').update(patch).eq('id',state.profile.id).select().single();
    if(error)return;
    state.profile=data;
    refreshOwnNowPlayingPreview();
    if(changed&&clean){
      maybeAqueleReaction('music_changed',{
        music_title:clean.title,
        artist:clean.artist,
        source:clean.source
      },{chance:.52,cooldown:6*60*1000});
    }
  },260);
}
async function saveManualNowPlaying(){
  const input=$('#manual-now-playing-url');
  const raw=String(input?.value||'').trim();
  const parsed=parseExternalMediaLink(raw);
  if(!parsed)return toast('Cole um link válido do YouTube ou Spotify.');
  const metadata=await resolveMediaMetadata(parsed.canonical||raw);
  const title=metadata?.title||`${parsed.provider||'música'} sem título detectado`;
  const patch={
    listening_visible:true,
    now_playing_title:title,
    now_playing_artist:metadata?.author||null,
    now_playing_source:metadata?.provider||parsed.provider||null,
    now_playing_url:parsed.canonical||raw,
    now_playing_updated_at:new Date().toISOString(),
    now_playing_manual:true,
    updated_at:new Date().toISOString()
  };
  const {data,error}=await supabase.from('profiles').update(patch).eq('id',state.profile.id).select().single();
  if(error)return toast('O status musical caiu no meio do caminho.');
  state.profile=data;
  if($('#listening-visible'))$('#listening-visible').checked=true;
  refreshOwnNowPlayingPreview();
  toast('Ouvindo agora atualizado. Até o detector acordar, este link manda.');
}
async function stopNowPlayingStatus(){
  if(!state.profile?.id)return;
  const {data,error}=await supabase.from('profiles').update({
    now_playing_title:null,
    now_playing_artist:null,
    now_playing_source:null,
    now_playing_url:null,
    now_playing_updated_at:null,
    now_playing_manual:false,
    updated_at:new Date().toISOString()
  }).eq('id',state.profile.id).select().single();
  if(error)return toast('Nem parar de ouvir deveria ser tão burocrático.');
  state.profile=data;
  state.lastNowPlayingSignature='';
  if($('#manual-now-playing-url'))$('#manual-now-playing-url').value='';
  refreshOwnNowPlayingPreview();
  updateOwnListeningInChat();
  toast('Status musical encerrado.');
}
function updateOwnListeningInChat(){
  const option=$('#dm-show-listening');
  if(option)option.checked=state.profile?.chat_listening_visible!==false;
}
window.addEventListener('message',event=>{
  if(event.source!==window||event.origin!==location.origin)return;
  if(event.data?.type==='AVESSO_NOW_PLAYING'){
    state.presenceBridgeSeen=true;
    if(!state.presenceBridgeVersion&&!state.presenceBridgeWarned){
      state.presenceBridgeWarned=true;
      setTimeout(()=>{
        if(state.presenceBridgeSeen&&!state.presenceBridgeVersion){
          toast('AVESSO Presence antiga detectada. Recarregue a extensão para a versão 0.3.0; a internet não atualiza extensão local por telepatia.');
        }
      },1200);
    }
    refreshOwnNowPlayingPreview();
    pushNowPlaying(event.data.payload||null);
    if(state.chatWindowOpen)updateOwnListeningInChat();
    return;
  }
  if(event.data?.type==='AVESSO_PRESENCE_HELLO'){
    state.presenceBridgeSeen=true;
    state.presenceBridgeVersion=String(event.data.version||'').slice(0,24);
    refreshOwnNowPlayingPreview();
    return;
  }
  if(event.data?.type==='AVESSO_CONTEXT_EVENT'){
    state.browserContextBridgeSeen=true;
    const context=event.data.context||{};
    if(!state.profile?.ai_browser_context_visible)return;
    const host=String(context.host||'').slice(0,120);
    const tabTitle=String(context.title||'').slice(0,180);
    if(!host&&!tabTitle)return;
    maybeAqueleReaction('browser_tab_changed',{
      host,
      tab_title:tabTitle,
      audible:Boolean(context.audible)
    },{chance:.30,cooldown:6*60*1000});
  }
});

async function saveAIBrowserContextVisibility(){
  if(!state.profile?.id)return;
  const enabled=Boolean($('#ai-browser-context-visible')?.checked);
  const {data,error}=await supabase.from('profiles').update({
    ai_browser_context_visible:enabled,
    updated_at:new Date().toISOString()
  }).eq('id',state.profile.id).select().single();
  if(error)return toast('A configuração do observador caiu atrás da cortina.');
  state.profile=data;
  syncPresenceCompanionConfig();
  const status=$('#ai-browser-context-status');
  if(status)status.textContent=enabled
    ?'ATIVO // contexto mínimo liberado'
    :'DESLIGADO // só enxerga o que acontece dentro do AVESSO';
  const card=$('.ai-context-card');
  if(card){card.classList.toggle('enabled',enabled);card.classList.toggle('disabled',!enabled);}
  const flag=$('.ai-context-switch em');if(flag)flag.textContent=enabled?'ON':'OFF';
  toast(enabled?'Aquele pode notar trocas de aba. Não ganhou raio-X, felizmente.':'Contexto de outras abas desligado.');
}

function awayThresholdMs(profile){
  const minutes=Number(profile?.away_after_minutes);
  if(minutes===0)return Infinity;
  return (Number.isFinite(minutes)&&[5,10,15,20,30].includes(minutes)?minutes:10)*60*1000;
}
function presenceView(profile){
  if(!profile)return{mode:'offline',label:'offline'};
  if(profile.presence_mode==='invisible')return{mode:'offline',label:'offline'};
  const now=Date.now();
  const seen=profile.last_seen?new Date(profile.last_seen).getTime():0;
  const age=seen?now-seen:Infinity;
  const onlineUntil=profile.online_until?new Date(profile.online_until).getTime():0;
  const leaseOnline=Number.isFinite(onlineUntil)&&onlineUntil>now;
  const legacyGrace=!profile.online_until&&age<60000;
  if(!leaseOnline&&!legacyGrace)return{mode:'offline',label:'offline'};
  if(profile.presence_mode==='away')return{mode:'away',label:'ausente'};
  if(Number(profile.away_after_minutes)===0)return{mode:'online',label:'online'};
  return age<awayThresholdMs(profile)?{mode:'online',label:'online'}:{mode:'away',label:'ausente'};
}
async function saveAwayAfterMinutes(value){
  const away_after_minutes=Number(value);
  if(![0,5,10,15,20,30].includes(away_after_minutes)||!state.profile?.id)return;
  const {data,error}=await supabase.from('profiles').update({away_after_minutes,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error)return toast('A ausência automática se perdeu no caminho.');
  state.profile=data;
  renderOnlineFriendsDock();
  toast(away_after_minutes===0?'Ausência automática desligada. Você escolheu o modo fantasma persistente.':`Ausente após ${away_after_minutes} minutos sem atividade.`);
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
function presenceLeasePatch(){
  const now=Date.now();
  return {
    online_until:new Date(now+30000).toISOString(),
    updated_at:new Date(now).toISOString()
  };
}
function markPresenceActivity({force=false}={}){
  if(!state.profile?.id||state.profile.presence_mode==='invisible')return;
  const now=Date.now();
  if(!force&&now-state.lastPresenceActivityAt<15000)return;
  state.lastPresenceActivityAt=now;
  const patch={
    last_seen:new Date(now).toISOString(),
    online_until:new Date(now+30000).toISOString(),
    updated_at:new Date(now).toISOString()
  };
  state.profile={...state.profile,...patch};
  supabase.from('profiles').update(patch).eq('id',state.profile.id).then(()=>{});
}
async function markPresenceOffline({keepalive=false}={}){
  const profileId=state.profile?.id;
  if(!profileId)return;
  const now=new Date().toISOString();
  const patch={last_seen:now,online_until:new Date(Date.now()-1000).toISOString(),updated_at:now};
  if(keepalive&&state.session?.access_token){
    try{
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profileId)}`,{
        method:'PATCH',
        keepalive:true,
        headers:{
          apikey:SUPABASE_PUBLISHABLE_KEY,
          Authorization:`Bearer ${state.session.access_token}`,
          'Content-Type':'application/json',
          Prefer:'return=minimal'
        },
        body:JSON.stringify(patch)
      }).catch(()=>{});
      return;
    }catch{}
  }
  try{await supabase.from('profiles').update(patch).eq('id',profileId);}catch{}
}
function startPresenceHeartbeat(){
  clearInterval(state.presenceTimer);
  if(!state.profile?.id)return;
  const beat=()=>{
    if(!state.profile||state.profile.presence_mode==='invisible')return;
    const patch=presenceLeasePatch();
    state.profile={...state.profile,...patch};
    supabase.from('profiles').update(patch).eq('id',state.profile.id).then(()=>{});
  };
  beat();
  state.presenceTimer=setInterval(beat,10000);
}
document.addEventListener('visibilitychange',()=>{
  if(!state.profile)return;
  if(document.hidden){
    autoMinimizeChat();
    return;
  }
  markPresenceActivity({force:true});
  startPresenceHeartbeat();
  if(state.world.pendingAquele){
    const payload=state.world.pendingAquele;
    state.world.pendingAquele=null;
    setTimeout(()=>deliverAqueleReaction(payload),700);
  }
  if(state.pendingAttentionPeerId){
    const peerId=state.pendingAttentionPeerId;
    state.pendingAttentionPeerId=null;
    openChatWindow(peerId,{keepMinimized:false}).then(()=>{
      state.chatWindowMinimized=false;
      const win=ensureChatWindow();
      win.classList.remove('minimized','hidden','docked-minimized');
      applyChatGeometry();
      triggerChatNudge(peerId);
      triggerScreenNudge();
      playUiSound('attention');
    });
  }
});
window.addEventListener('blur',()=>{if(state.profile)autoMinimizeChat();});
// Não marcamos offline em pagehide/beforeunload: refresh também dispara esses eventos.
 // O lease curto expira sozinho se a aba realmente fechar; logout explícito continua imediato.
['pointerdown','keydown','touchstart'].forEach(type=>document.addEventListener(type,()=>markPresenceActivity(),{passive:true}));
window.addEventListener('focus',()=>markPresenceActivity({force:true}));
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
async function saveChatListeningVisibility(visible){
  if(!state.profile?.id)return;
  const {data,error}=await supabase.from('profiles').update({
    chat_listening_visible:Boolean(visible),
    updated_at:new Date().toISOString()
  }).eq('id',state.profile.id).select().single();
  if(error)return toast('A música se recusou a respeitar a cortina.');
  state.profile=data;
  const profileToggle=$('#chat-listening-visible');
  if(profileToggle)profileToggle.checked=Boolean(visible);
  toast(visible?'Música visível nas conversas.':'Música escondida nas conversas.');
}
async function saveQuickChatStatus(){
  if(!state.profile?.id)return;
  const input=$('#dm-status-message');
  const status_message=String(input?.value||'').replace(/[\u0000-\u001F\u007F]/g,'').trim().slice(0,140);
  const {data,error}=await supabase.from('profiles').update({
    status_message,
    updated_at:new Date().toISOString()
  }).eq('id',state.profile.id).select().single();
  if(error)return toast('O status entrou em crise de identidade.');
  state.profile=data;
  toast(status_message?'Status salvo. Agora ele pode ser julgado em silêncio.':'Status removido.');
}
function applyChatAppearance({theme=state.profile?.chat_theme||'bbs_cyan',wallpaper=state.profile?.chat_wallpaper||'none'}={}){
  const win=$('#dm-floating-window');
  if(!win)return;
  CHAT_THEMES.forEach(([id])=>win.classList.remove(`theme-${id}`));
  win.classList.add(chatThemeClass(theme));
  win.style.setProperty('--dm-chat-wallpaper',chatWallpaperCss(wallpaper));
  win.dataset.chatTheme=theme;
  win.dataset.chatWallpaper=wallpaper;
  win.querySelectorAll('[data-chat-theme]').forEach(b=>b.classList.toggle('active',b.dataset.chatTheme===theme));
  win.querySelectorAll('[data-chat-wallpaper]').forEach(b=>b.classList.toggle('active',b.dataset.chatWallpaper===wallpaper));
}
async function setChatTheme(theme){
  if(!CHAT_THEMES.some(x=>x[0]===theme)||!state.profile?.id)return;
  const previous=state.profile.chat_theme||'bbs_cyan';
  state.profile={...state.profile,chat_theme:theme};
  applyChatAppearance({theme,wallpaper:state.profile.chat_wallpaper||'none'});
  const {data,error}=await supabase.from('profiles').update({chat_theme:theme,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error){
    state.profile={...state.profile,chat_theme:previous};
    applyChatAppearance({theme:previous,wallpaper:state.profile.chat_wallpaper||'none'});
    return toast('A tinta digital derramou antes de chegar na janela.');
  }
  state.profile=data;
  applyChatAppearance();
}
async function setChatWallpaper(slug){
  if(!allChatWallpapers().some(x=>x[0]===slug)||!state.profile?.id)return;
  const previous=state.profile.chat_wallpaper||'none';
  state.profile={...state.profile,chat_wallpaper:slug};
  applyChatAppearance({theme:state.profile.chat_theme||'bbs_cyan',wallpaper:slug});
  const {data,error}=await supabase.from('profiles').update({chat_wallpaper:slug,updated_at:new Date().toISOString()}).eq('id',state.profile.id).select().single();
  if(error){
    state.profile={...state.profile,chat_wallpaper:previous};
    applyChatAppearance({theme:state.profile.chat_theme||'bbs_cyan',wallpaper:previous});
    return toast('O papel de parede caiu atrás do modem.');
  }
  state.profile=data;
  applyChatAppearance();
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
async function askAlgoFeedReview(trigger,postId){
  if(!postId||!state.session||!state.profile)return null;
  const payload=await askWorldCharacter(trigger,{
    character:'algo',
    post_id:postId,
    action_type:trigger,
    surface:'feed',
    silent:true
  });
  if(payload?.interaction&&isFeedTab())loadFeed();
  return payload;
}
function deliverAqueleReaction(payload){
  if(!payload?.character||!payload?.interaction?.body)return;
  if(payload.delivery==='message'){
    socialNotify({
      title:'Aquele que Lê Tudo',
      body:payload.interaction.body,
      kind:'world',
      sound:false
    });
  }else{
    showEncounter(payload);
  }
}
async function maybeAqueleReaction(trigger,metadata={},options={}){
  if(!state.session||!state.profile)return null;
  if(state.world.preferences?.participation_mode==='observer')return null;
  const chance=Number.isFinite(options.chance)?options.chance:.16;
  const cooldown=Number.isFinite(options.cooldown)?options.cooldown:5*60*1000;
  const stableMeta=Object.entries(metadata||{}).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${String(v).slice(0,100)}`).join('|');
  const key=`${trigger}|${stableMeta}`;
  const storedAt=Number(localStorage.getItem('avesso.aquele.lastAt')||0);
  const storedKey=localStorage.getItem('avesso.aquele.lastKey')||'';
  const lastAt=Math.max(state.world.lastAqueleAt||0,storedAt);
  if(Date.now()-lastAt<cooldown||key===state.world.lastAqueleKey||key===storedKey)return null;
  if(Math.random()>chance)return null;
  state.world.lastAqueleAt=Date.now();
  state.world.lastAqueleKey=key;
  try{
    localStorage.setItem('avesso.aquele.lastAt',String(state.world.lastAqueleAt));
    localStorage.setItem('avesso.aquele.lastKey',key);
  }catch{}
  const payload=await askWorldCharacter(trigger,{
    character:'aquele_le_tudo',
    action_type:trigger,
    surface:state.tab||'app',
    metadata,
    silent:true
  });
  if(!payload)return null;
  if(document.hidden)state.world.pendingAquele=payload;
  else deliverAqueleReaction(payload);
  return payload;
}
function scheduleIdleWorld(){
  clearTimeout(state.world.idleTimer);
  if(!state.session)return;
  const delay=(6+Math.random()*6)*60*1000;
  state.world.idleTimer=setTimeout(async()=>{
    if(state.tab==='tower') { /* O Rei publica na Torre; não invade a tela do usuário. */ }
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
$('.story-create-close').onclick=()=>{
  stopStoryCamera();
  clearStoryPreview();
  state.storyCapturedFile=null;
  $('#story-create-dialog').close();
};
$('.story-view-close').onclick=closeStoryViewer;
const storyViewDialog=$('#story-view-dialog');
storyViewDialog?.addEventListener('click',e=>{
  if(e.target===storyViewDialog)closeStoryViewer();
});
storyViewDialog?.addEventListener('close',()=>{
  clearStoryTimer();
  state.storyCurrentId=null;
});
const storyCreateDialog=$('#story-create-dialog');
storyCreateDialog?.addEventListener('close',()=>{
  stopStoryCamera();
  clearStoryPreview();
  state.storyCapturedFile=null;
});
$('#story-publish').onclick=publishStory;
$('#story-camera-open').onclick=openStoryCamera;
$('#story-camera-switch').onclick=switchStoryCamera;
$('#story-camera-photo').onclick=takeStoryPhoto;
$('#story-camera-record').onclick=toggleStoryRecording;
$('#story-camera-close').onclick=stopStoryCamera;
$('#story-image').onchange=e=>{
  const file=e.target.files?.[0]||null;
  state.storyCapturedFile=null;
  stopStoryCamera();
  if(!file){clearStoryPreview();return;}
  const allowed=/^(image\/(jpeg|png|webp|gif)|video\/(webm|mp4|quicktime))$/i.test(file.type||'');
  if(!allowed){e.target.value='';clearStoryPreview();return toast('Story aceita imagem, GIF, WEBM, MP4 ou MOV.');}
  renderStoryMediaPreview(file);
};
$$('[data-auth-mode]').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.authMode));
function setAuthMode(mode){ state.mode=mode; $$('[data-auth-mode]').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode)); $('#signup-fields').classList.toggle('hidden',mode==='login'); $('#resend-confirmation').classList.add('hidden'); $('#auth-submit').textContent=mode==='login'?'entrar':'criar meu canto'; $('#auth-message').textContent=''; }

$('#auth-form').addEventListener('submit',async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const email=f.get('email');const password=f.get('password');$('#auth-submit').disabled=true;$('#auth-message').textContent='conversando com os computadores...';let result;if(state.mode==='signup'){const handle=String(f.get('handle')||'').toLowerCase();const display_name=String(f.get('display_name')||'').trim().slice(0,80);if(!display_name){result={error:{message:'Escolha um nome exibido. Vale símbolo, emoji, drama e decisões questionáveis.'}}}else if(!/^[a-z0-9_]{3,24}$/.test(handle)){result={error:{message:'Seu @ precisa ter 3–24 letras minúsculas, números ou _.'}}}else{result=await supabase.auth.signUp({email,password,options:{data:{handle,display_name},emailRedirectTo:SITE_URL}});}}else result=await supabase.auth.signInWithPassword({email,password});$('#auth-submit').disabled=false;if(result.error){$('#auth-message').textContent=humanError(result.error.message);return}if(state.mode==='signup'&&!result.data.session){$('#auth-message').textContent='Confira seu e-mail e use o link mais recente. Se já confirmou a conta, abra a aba de entrar e use sua senha.';$('#resend-confirmation').classList.remove('hidden');return}$('#auth-dialog').close();toast('Você entrou. Tente não estragar tudo.');});

$('#resend-confirmation').onclick=async()=>{const email=new FormData($('#auth-form')).get('email');if(!email)return toast('Digite seu e-mail primeiro. Adivinhação ainda está em beta.');const button=$('#resend-confirmation');button.disabled=true;button.textContent='reenviando...';const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:SITE_URL}});button.disabled=false;button.textContent='reenviar confirmação de e-mail';if(error){$('#auth-message').textContent=humanError(error.message);return}$('#auth-message').textContent='Se a conta ainda estiver pendente, você receberá um novo link. Se já confirmou, entre com sua senha.';toast('Solicitação recebida. Confira seu e-mail ou tente entrar.');};

function humanError(m){const value=String(m||'');const lower=value.toLowerCase();if(lower.includes('email not confirmed'))return'Confirme seu e-mail antes de entrar. Use o link mais recente ou solicite outro na aba de cadastro.';if(lower.includes('invalid login'))return'E-mail ou senha não conferem. Se você já confirmou, use a senha do cadastro.';if(lower.includes('already registered'))return'Este e-mail já tem cadastro. Use a aba de entrar.';if(lower.includes('expired')||lower.includes('otp_expired'))return'Este link expirou ou já foi utilizado. Se já confirmou, entre com sua senha.';if(lower.includes('password'))return'A senha precisa atender aos requisitos de segurança.';return value;}
$('#logout').onclick=async()=>{
  await markPresenceOffline();
  await supabase.auth.signOut();
};
async function goToFeedHome(){
  if(!state.profile)return;
  const previousTab=state.tab;
  if(previousTab==='plaza')stopPlazaRealtime();
  if(previousTab==='public_profile')stopCornerMusic();
  autoMinimizeChat();
  state.tab='feed';
  bumpView();
  document.querySelectorAll('[data-app-tab]').forEach(x=>x.classList.toggle('active',x.dataset.appTab==='feed'));
  $('#feed-heading').textContent='Quem precisa ser visto?';
  applyAppTabLayout();
  try{history.replaceState(null,'',location.pathname+location.search+'#para-cuidar');}catch{}
  await loadStoriesStrip();
  await loadFeed();
}
$('#nav-home-link').onclick=e=>{e.preventDefault();e.stopPropagation();goToFeedHome();};
$('#nav-profile-link').onclick=()=>document.querySelector('[data-app-tab="profile"]')?.click();

supabase.auth.onAuthStateChange((_event,session)=>{state.session=session;if(session)enterApp();else leaveApp();});
async function loadAdminAccess(){
  if(!state.profile?.id){
    state.isAdmin=false;state.adminRole=null;state.staffRole=null;state.staffRank=0;state.staffRoles={};
    return false;
  }
  const {data,error}=await supabase.from('admin_users').select('user_id,role');
  const rows=error?[]:(data||[]);
  state.staffRoles=Object.fromEntries(rows.map(row=>[row.user_id,row.role]));
  state.staffRole=state.staffRoles[state.profile.id]||null;
  state.staffRank=staffRankValue(state.staffRole);
  state.isAdmin=state.staffRank>=10;
  state.adminRole=state.staffRole;
  const nav=$('#admin-nav-button');
  if(nav){
    nav.classList.toggle('hidden',!state.isAdmin);
    nav.textContent=state.isAdmin?'♛ dashboard':'dashboard';
    nav.title=state.isAdmin?staffRoleLabel(state.staffRole):'';
  }
  startIdentityDecoration();
  decorateIdentityNodes(document);
  return state.isAdmin;
}
async function enterApp(){
  $('#marketing-view').classList.add('hidden');
  $('.site-header').classList.add('hidden');
  $('.site-footer').classList.add('hidden');
  $('#app-view').classList.remove('hidden');
  const {data}=await supabase.from('profiles').select('*').eq('id',state.session.user.id).single();
  state.profile=data;
  if(!data){toast('Seu perfil ainda está acordando. Atualize em alguns segundos.');return;}
  await loadAdminAccess();
  await loadOwnModeration();
  $('#nav-name').innerHTML=escapeHtml(data.display_name)+(state.staffRole==='owner'?adminCrownHtml('nav-admin-crown'):'');
  $('#nav-handle').textContent='@'+data.handle;
  renderNavAvatar();
  applyAppWallpaper();
  setupOnlineFriendsDock();
  markPresenceActivity({force:true});
  startPresenceHeartbeat();
  syncPresenceCompanionConfig();
  await loadWorldState();
  await loadBlockedPeers();
  subscribeRealtime();
  startDirectRealtime();
  await primeFriendPresenceCache();
  startFriendPresenceWatch();
  startStaffNotificationRealtime();
  Promise.allSettled([loadFeed(),loadImpact(),loadStoriesStrip(),loadMutedPeers(),loadStaffNotifications()]).then(()=>{});
  registerNotificationWorker();
  armBrowserNotifications();
  startStoryRealtime();
  loadStoryNotifications();
  scheduleIdleWorld();
  scheduleTowerPulse();
  trackAction('login','app');
  setTimeout(notifyPendingFriendRequests,900);
  setTimeout(()=>askWorldCharacter('login',{action_type:'login',surface:'app'}),1400);
}
function leaveApp(){
  clearTimeout(state.world.idleTimer);
  clearTimeout(state.world.towerTimer);
  clearTimeout(state.nowPlayingPushTimer);
  clearInterval(state.presenceTimer);
  clearInterval(state.presenceWatchTimer);
  state.friendPresence={};
  state.friendPresenceReady=false;
  state.mutedPeers={};
  state.blockedPeers={};
  state.pendingAttentionPeerId=null;
  stopPlazaRealtime();
  stopDirectRealtime();
  stopStoryRealtime();
  if(state.staffChannel){supabase.removeChannel(state.staffChannel);state.staffChannel=null;}
  if(state.staffNotificationChannel){supabase.removeChannel(state.staffNotificationChannel);state.staffNotificationChannel=null;}
  stopCornerMusic();
  closeStoryViewer();
  closeChatWindow(true);
  document.body.classList.remove('avesso-app-active');
  $('#online-friends-dock')?.classList.add('hidden');
  state.profile=null;
  state.isAdmin=false;state.adminRole=null;state.adminSnapshot=null;state.staffRole=null;state.staffRank=0;state.staffRoles={};state.staffSnapshot=null;state.suspended=false;state.suspension=null;
  document.body.classList.remove('account-suspended');
  $('#admin-nav-button')?.classList.add('hidden');
  $('#app-view').classList.add('hidden');
  $('#marketing-view').classList.remove('hidden');
  $('.site-header').classList.remove('hidden');
  $('.site-footer').classList.remove('hidden');
}

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
$('#remove-image').onclick=()=>{
  state.postImageFile=null;
  state.postGifUrl='';
  $('#post-image').value='';
  if($('#post-gif-file'))$('#post-gif-file').value='';
  if($('#post-gif-url'))$('#post-gif-url').value='';
  $('#image-preview').classList.add('hidden');
};
function repoGifByRef(value=''){
  const match=String(value||'').match(/^avesso-gif:([a-z0-9_-]+)$/i);
  return match?AVESSO_GIFS.find(g=>g.id===match[1])||null:null;
}
function postImageSrc(value=''){
  return repoGifByRef(value)?.src||String(value||'');
}
function isGifPostImage(value=''){
  const raw=String(value||'');
  return Boolean(repoGifByRef(raw)||/^data:image\/gif/i.test(raw)||/\.gif(?:$|[?#])/i.test(raw)||/media\.giphy\.com|i\.giphy\.com|media\.tenor\.com|c\.tenor\.com/i.test(raw));
}
function directGifUrl(raw){
  const value=String(raw||'').trim();
  if(!value)return'';
  try{
    const url=new URL(value);
    if(!['http:','https:'].includes(url.protocol))return'';
    const host=url.hostname.toLowerCase();
    const gifPath=/\.gif(?:$|[?#])/i.test(url.href);
    const knownHost=['media.giphy.com','i.giphy.com','media.tenor.com','c.tenor.com'].some(x=>host===x||host.endsWith('.'+x));
    return gifPath||knownHost?url.href:'';
  }catch{return'';}
}
function renderRepoGifLibrary(){
  const host=$('#post-gif-library');
  if(!host||host.dataset.ready)return;
  host.dataset.ready='1';
  host.innerHTML=AVESSO_GIFS.map(g=>`<button type="button" class="repo-gif-choice" data-repo-gif="${escapeAttr(g.id)}" title="${escapeAttr(g.label)}"><img src="${g.src}" alt=""><span>${escapeHtml(g.label)}</span></button>`).join('');
  host.querySelectorAll('[data-repo-gif]').forEach(button=>button.onclick=()=>{
    const gif=AVESSO_GIFS.find(item=>item.id===button.dataset.repoGif);
    if(!gif)return;
    state.postGifUrl=`avesso-gif:${gif.id}`;
    state.postImageFile=null;
    $('#post-gif-file').value='';
    $('#post-gif-url').value='';
    $('#image-preview-img').src=gif.src;
    $('#image-preview-name').textContent=`GIF AVESSO // ${gif.label}`;
    $('#image-preview').classList.remove('hidden');
    $('#post-gif-status').textContent=`${gif.label} selecionado do repositório.`;
    host.querySelectorAll('.repo-gif-choice').forEach(x=>x.classList.toggle('active',x===button));
  });
}
$('#post-gif-toggle').onclick=()=>{
  const row=$('#post-gif-row');
  const open=row.classList.toggle('hidden')===false;
  $('#post-gif-toggle').classList.toggle('active',open);
  if(open){
    renderRepoGifLibrary();
    setTimeout(()=>$('#post-gif-url')?.focus(),40);
  }
};
$('#post-gif-file').onchange=e=>{
  const file=e.target.files?.[0]||null;
  if(!file)return;
  if(file.type!=='image/gif'){e.target.value='';return toast('Esse arquivo não é GIF. O nome do botão tentou avisar.');}
  if(file.size>8*1024*1024){e.target.value='';return toast('GIF acima de 8 MB. Até nostalgia precisa de limite.');}
  state.postImageFile=file;
  state.postGifUrl='';
  $('#post-image').value='';
  $('#post-gif-url').value='';
  const url=URL.createObjectURL(file);
  $('#image-preview-img').src=url;
  $('#image-preview-name').textContent=file.name;
  $('#image-preview').classList.remove('hidden');
  $('#post-gif-status').textContent='GIF local pronto para o feed.';
  $('#post-gif-library')?.querySelectorAll('.repo-gif-choice').forEach(x=>x.classList.remove('active'));
};
$('#post-gif-url').oninput=e=>{
  const url=directGifUrl(e.target.value);
  state.postGifUrl=url;
  const status=$('#post-gif-status');
  if(!e.target.value.trim()){status.textContent='arquivo ou link direto. GIF não precisa virar startup.';return;}
  if(!url){status.textContent='link não parece apontar para um GIF direto.';return;}
  state.postImageFile=null;
  $('#post-gif-file').value='';
  $('#post-image').value='';
  $('#image-preview-img').src=url;
  $('#image-preview-name').textContent='GIF por link';
  $('#image-preview').classList.remove('hidden');
  status.textContent='GIF reconhecido · pronto para se mexer inutilmente.';
  $('#post-gif-library')?.querySelectorAll('.repo-gif-choice').forEach(x=>x.classList.remove('active'));
};
$('#post-gif-clear').onclick=()=>{
  state.postGifUrl='';
  state.postImageFile=null;
  $('#post-gif-file').value='';
  $('#post-gif-url').value='';
  $('#post-gif-row').classList.add('hidden');
  $('#post-gif-toggle').classList.remove('active');
  $('#image-preview').classList.add('hidden');
  $('#post-gif-status').textContent='escolha um GIF do AVESSO, envie arquivo ou cole link direto.';
  $('#post-gif-library')?.querySelectorAll('.repo-gif-choice').forEach(x=>x.classList.remove('active'));
};
$('#post-media-link-toggle').onclick=()=>{
  const row=$('#post-media-link-row');
  const open=row.classList.toggle('hidden')===false;
  $('#post-media-link-toggle').classList.toggle('active',open);
  if(open)setTimeout(()=>$('#post-media-link')?.focus(),40);
};
$('#post-media-link-clear').onclick=()=>{
  $('#post-media-link').value='';
  $('#post-media-link-row').classList.add('hidden');
  $('#post-media-link-toggle').classList.remove('active');
  $('#post-media-link-status').textContent='link reconhecido vira player, não caça-clique';
};
function parseExternalMediaLink(raw){
  const value=String(raw||'').trim();
  if(!value)return null;
  let url;
  try{url=new URL(value);}catch{return null;}
  if(url.protocol!=='https:'&&url.protocol!=='http:')return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  if(['youtube.com','m.youtube.com','music.youtube.com','youtu.be','youtube-nocookie.com'].includes(host)){
    let id='';
    if(host==='youtu.be')id=url.pathname.split('/').filter(Boolean)[0]||'';
    else if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else{
      const parts=url.pathname.split('/').filter(Boolean);
      if(['shorts','embed','live'].includes(parts[0]))id=parts[1]||'';
    }
    if(!/^[A-Za-z0-9_-]{6,20}$/.test(id))return null;
    return {kind:'youtube',provider:'YouTube',url:`https://www.youtube-nocookie.com/embed/${id}`,canonical:`https://www.youtube.com/watch?v=${id}`};
  }
  if(host==='open.spotify.com'){
    const parts=url.pathname.split('/').filter(Boolean);
    let offset=parts[0]==='embed'?1:0;
    if(parts[offset]?.startsWith('intl-'))offset++;
    const type=parts[offset],id=parts[offset+1];
    if(!['track','album','playlist','episode','show','artist'].includes(type)||!/^[A-Za-z0-9]+$/.test(id||''))return null;
    return {kind:'spotify',provider:'Spotify',url:`https://open.spotify.com/embed/${type}/${id}`,canonical:`https://open.spotify.com/${type}/${id}`,spotifyType:type};
  }
  return null;
}
function externalMediaShareUrl(raw){
  const parsed=parseExternalMediaLink(raw);
  return parsed?.canonical||String(raw||'');
}
async function resolveMediaMetadata(raw){
  const parsed=parseExternalMediaLink(raw);
  if(!parsed)return null;
  try{
    const {data,error}=await supabase.functions.invoke('media-metadata',{body:{url:parsed.canonical||raw}});
    if(error)return{title:null,provider:parsed.provider||'',canonical:parsed.canonical||raw};
    return{
      title:String(data?.title||'').trim().slice(0,220)||null,
      author:String(data?.author||'').trim().slice(0,120)||null,
      provider:String(data?.provider||parsed.provider||'').trim().slice(0,40)||null,
      canonical:parsed.canonical||raw
    };
  }catch{
    return{title:null,provider:parsed.provider||'',canonical:parsed.canonical||raw};
  }
}
function cornerMusicLabel(profile){
  if(!profile?.corner_music_url)return'';
  return String(profile.corner_music_title||profile.corner_music_provider||parseExternalMediaLink(profile.corner_music_url)?.provider||'trilha do Canto');
}
function cornerMusicBadgeHtml(profile,{owner=false}={}){
  if(!profile?.corner_music_url)return'';
  const enabled=Boolean(profile.corner_music_enabled);
  if(!owner&&!enabled)return'';
  const label=cornerMusicLabel(profile);
  return `<div class="corner-music-badge ${enabled?'active':'off'}"><span class="now-playing-eq" aria-hidden="true"><i></i><i></i><i></i></span><span><b>♫ ${owner?'sua trilha':'deixou ouvindo'}</b><small>${escapeHtml(label)}</small></span>${owner?'':`<button id="public-corner-music-toggle" type="button">${state.cornerMusicLocallyPaused?'ouvir novamente':'parar de ouvir'}</button>`}</div>`;
}
function refreshPublicCornerMusicControl(profile=state.publicCornerMusicProfile){
  const host=$('#public-corner-music');
  if(!host||!profile)return;
  host.innerHTML=cornerMusicBadgeHtml(profile);
  const toggle=$('#public-corner-music-toggle');
  if(toggle)toggle.onclick=()=>state.cornerMusicLocallyPaused?resumeCornerMusicForVisitor():pauseCornerMusicForVisitor();
}
function pauseCornerMusicForVisitor(){
  if(!state.publicCornerMusicProfile)return;
  clearCornerMusicHost();
  if(state.cornerMusicGestureHandler){
    document.removeEventListener('pointerdown',state.cornerMusicGestureHandler,true);
    document.removeEventListener('keydown',state.cornerMusicGestureHandler,true);
  }
  state.cornerMusicGestureHandler=null;
  state.cornerMusicLocallyPaused=true;
  refreshPublicCornerMusicControl();
}
function resumeCornerMusicForVisitor(){
  const profile=state.publicCornerMusicProfile;
  if(!profile?.corner_music_enabled||!profile.corner_music_url)return;
  state.cornerMusicLocallyPaused=false;
  mountCornerMusic(profile);
  refreshPublicCornerMusicControl(profile);
}
function cornerMusicEmbed(raw){
  const parsed=parseExternalMediaLink(raw);
  if(!parsed)return null;
  if(parsed.kind==='youtube'){
    const match=parsed.url.match(/\/embed\/([A-Za-z0-9_-]+)/);
    const id=match?.[1]||'';
    if(!id)return null;
    const params=new URLSearchParams({
      autoplay:'1',
      controls:'0',
      loop:'1',
      playlist:id,
      playsinline:'1',
      rel:'0',
      modestbranding:'1'
    });
    return {kind:'youtube',src:`${parsed.url}?${params.toString()}`};
  }
  if(parsed.kind==='spotify'){
    const join=parsed.url.includes('?')?'&':'?';
    return {kind:'spotify',src:`${parsed.url}${join}autoplay=1&theme=0`};
  }
  return null;
}
function clearCornerMusicHost(){
  document.getElementById('corner-music-host')?.remove();
}
function stopCornerMusic({forgetProfile=true}={}){
  clearCornerMusicHost();
  if(state.cornerMusicGestureHandler){
    document.removeEventListener('pointerdown',state.cornerMusicGestureHandler,true);
    document.removeEventListener('keydown',state.cornerMusicGestureHandler,true);
  }
  state.cornerMusicGestureHandler=null;
  state.cornerMusicProfileId=null;
  state.cornerMusicLocallyPaused=false;
  if(forgetProfile)state.publicCornerMusicProfile=null;
}
function mountCornerMusic(profile){
  if(!profile?.corner_music_enabled||!profile.corner_music_url)return false;
  if(state.tab!=='public_profile'||state.publicProfileId!==profile.id)return false;
  const media=cornerMusicEmbed(profile.corner_music_url);
  if(!media)return false;
  clearCornerMusicHost();
  const host=document.createElement('div');
  host.id='corner-music-host';
  host.className='corner-music-host';
  host.setAttribute('aria-hidden','true');
  const iframe=document.createElement('iframe');
  iframe.src=media.src;
  iframe.title='';
  iframe.tabIndex=-1;
  iframe.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';
  iframe.referrerPolicy='strict-origin-when-cross-origin';
  host.appendChild(iframe);
  document.body.appendChild(host);
  return true;
}
function startCornerMusic(profile){
  stopCornerMusic();
  state.publicCornerMusicProfile=profile||null;
  state.cornerMusicLocallyPaused=false;
  refreshPublicCornerMusicControl(profile);
  if(!profile?.corner_music_enabled||!profile.corner_music_url)return;
  if(!cornerMusicEmbed(profile.corner_music_url))return;
  state.cornerMusicProfileId=profile.id;
  mountCornerMusic(profile);

  // Navegadores modernos podem bloquear áudio automático sem uma interação humana.
  // Se isso acontecer, a primeira interação do visitante tenta iniciar novamente,
  // mantendo o player completamente invisível.
  const retry=()=>{
    if(state.tab!=='public_profile'||state.publicProfileId!==profile.id){
      stopCornerMusic();return;
    }
    mountCornerMusic(profile);
    document.removeEventListener('pointerdown',retry,true);
    document.removeEventListener('keydown',retry,true);
    if(state.cornerMusicGestureHandler===retry)state.cornerMusicGestureHandler=null;
  };
  state.cornerMusicGestureHandler=retry;
  document.addEventListener('pointerdown',retry,{capture:true,once:true});
  document.addEventListener('keydown',retry,{capture:true,once:true});
}
async function saveCornerMusicSettings(){
  const input=$('#corner-music-url');
  const enabled=Boolean($('#corner-music-enabled')?.checked);
  const raw=String(input?.value||'').trim();
  const parsed=raw?parseExternalMediaLink(raw):null;
  if(raw&&!parsed)return toast('Use um link válido do YouTube ou Spotify.');
  if(enabled&&!parsed)return toast('Escolha uma música antes de ligar a trilha automática.');
  const corner_music_url=parsed?.canonical||null;
  const metadata=corner_music_url?await resolveMediaMetadata(corner_music_url):null;
  const corner_music_title=metadata?.title||null;
  const corner_music_provider=metadata?.provider||parsed?.provider||null;
  const {data,error}=await supabase.from('profiles')
    .update({corner_music_url,corner_music_enabled:enabled,corner_music_title,corner_music_provider,updated_at:new Date().toISOString()})
    .eq('id',state.profile.id)
    .select()
    .single();
  if(error)return toast('A trilha tropeçou nos próprios cabos.');
  state.profile=data;
  if(input)input.value=corner_music_url||'';
  const status=$('#corner-music-status');
  if(status)status.textContent=enabled&&corner_music_url?'ATIVA // visitantes recebem a trilha ao entrar':'DESLIGADA // o silêncio venceu esta rodada';
  const hero=$('#profile-hero-corner-music');if(hero)hero.innerHTML=cornerMusicBadgeHtml(state.profile,{owner:true});
  toast(enabled?'Trilha do Canto ativada. O player continuará invisível.':'Trilha automática desligada. O link foi preservado.');
}
async function clearCornerMusicSettings(){
  const {data,error}=await supabase.from('profiles')
    .update({corner_music_url:null,corner_music_enabled:false,corner_music_title:null,corner_music_provider:null,updated_at:new Date().toISOString()})
    .eq('id',state.profile.id)
    .select()
    .single();
  if(error)return toast('A música se recusou a sair da fita.');
  state.profile=data;
  if($('#corner-music-url'))$('#corner-music-url').value='';
  if($('#corner-music-enabled'))$('#corner-music-enabled').checked=false;
  if($('#corner-music-status'))$('#corner-music-status').textContent='SEM FITA // escolha um link quando quiser';
  const hero=$('#profile-hero-corner-music');if(hero)hero.innerHTML='';
  toast('Trilha removida do seu Canto.');
}

function mediaKindFromFile(file){
  if(!file?.type)return null;
  if(file.type.startsWith('audio/'))return'audio';
  if(file.type.startsWith('video/'))return'video';
  return null;
}
function mediaSizeLimit(kind){return kind==='video'?50*1024*1024:20*1024*1024;}
function mediaSizeLabel(kind){return kind==='video'?'50 MB':'20 MB';}
function publicMediaUrl(path){return supabase.storage.from('avesso-media').getPublicUrl(path).data.publicUrl;}
function feedMediaHtml(url,kind,{compact=false}={}){
  if(!url||!['audio','video','youtube','spotify'].includes(kind))return'';
  const cls=`post-media ${compact?'compact':''}`;
  if(kind==='audio')return `<figure class="${cls} post-audio"><div class="post-media-label">♫ ÁUDIO // dê play por sua conta</div><audio controls preload="metadata" src="${escapeAttr(url)}"></audio></figure>`;
  if(kind==='video')return `<figure class="${cls} post-video"><div class="post-media-label">▶ VÍDEO // movimento detectado</div><video controls playsinline preload="metadata" src="${escapeAttr(url)}"></video></figure>`;
  const external=parseExternalMediaLink(url);
  if(!external||external.kind!==kind)return'';
  if(kind==='youtube')return `<figure class="${cls} post-embed post-youtube"><div class="post-media-label">▶ YOUTUBE // janela para outro pedaço da internet</div><div class="embed-frame"><iframe src="${escapeAttr(external.url)}" title="Vídeo do YouTube" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div></figure>`;
  return `<figure class="${cls} post-embed post-spotify"><div class="post-media-label">♫ SPOTIFY // aperte play conscientemente</div><iframe src="${escapeAttr(external.url)}" title="Conteúdo do Spotify" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></figure>`;
}
async function uploadPostMedia(){
  const file=state.postMediaFile;if(!file)return{url:null,kind:null};
  const kind=mediaKindFromFile(file);
  if(!kind)throw new Error('unsupported media');
  if(file.size>mediaSizeLimit(kind))throw new Error('media too large');
  const ext=(file.name.split('.').pop()|| (kind==='video'?'mp4':'mp3')).replace(/[^a-z0-9]/gi,'').toLowerCase();
  const path=`${state.profile.id}/feed/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await supabase.storage.from('avesso-media').upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type});
  if(error)throw error;
  return{url:publicMediaUrl(path),kind};
}

async function uploadPostImage(){
  if(!state.postImageFile)return null;
  const ext=(state.postImageFile.name.split('.').pop()||'webp').replace(/[^a-z0-9]/gi,'').toLowerCase();
  const path=`${state.profile.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const {error}=await supabase.storage.from('post-images').upload(path,state.postImageFile,{cacheControl:'31536000',upsert:false});
  if(error)throw error;
  return supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
}
$('#post-media-link').addEventListener('input',e=>{
  const parsed=parseExternalMediaLink(e.target.value);
  const status=$('#post-media-link-status');
  if(!e.target.value.trim()){if(status)status.textContent='link reconhecido vira player, não caça-clique';return;}
  if(parsed){
    if(status)status.textContent=`${parsed.provider} reconhecido · pronto para incorporar`;
  }else if(status)status.textContent='use um link válido do YouTube ou Spotify';
});
$('#publish-post').onclick=async()=>{
  const body=$('#post-body').value.trim();
  const directed=$('#post-target').value==='person';
  const external=parseExternalMediaLink($('#post-media-link')?.value||'');
  if($('#post-media-link')?.value.trim()&&!external)return toast('Esse link não é um YouTube ou Spotify reconhecível.');
  if(directed&&!state.recipient)return toast('Escolha alguém na busca para direcionar sua mensagem.');
  if(directed&&$('#post-visibility').value==='privado'&&(state.postImageFile||state.postGifUrl||external))return toast('Imagem e mídia incorporada privadas ainda não entram aqui. Bucket público e intimidade são uma dupla ruim.');
  const minText=directed?2:12;
  if(body.length<minText&&!state.postImageFile&&!state.postGifUrl&&!external)return toast(directed?'Para alguém, 2 caracteres bastam. Milagre burocrático.':'No feed aberto, use pelo menos 12 caracteres ou anexe mídia.');
  $('#publish-post').disabled=true;
  let image_url=state.postGifUrl||null,media_url=external?.url||null,media_kind=external?.kind||null;
  try{
    if(!image_url)image_url=await uploadPostImage();
  }catch(e){
    $('#publish-post').disabled=false;
    console.error('media upload failed',e);
    return toast('A mídia tropeçou no upload. A internet fingiu que era 1998 de novo.');
  }
  const gifSelected=Boolean(state.postGifUrl||state.postImageFile?.type==='image/gif');
  const {data:createdPost,error}=await supabase.from('posts').insert({
    author_id:state.profile.id,
    recipient_id:directed?state.recipient.id:null,
    body:body||(media_kind==='youtube'?'Vídeo do YouTube publicado no AVESSO.':media_kind==='spotify'?'Spotify publicado no AVESSO.':media_kind==='video'?'Vídeo publicado no AVESSO.':media_kind==='audio'?'Áudio publicado no AVESSO.':gifSelected?'GIF publicado no AVESSO.':'Imagem publicada no AVESSO.'),
    image_url,
    media_url,
    media_kind,
    visibility:directed?$('#post-visibility').value:'publico'
  }).select('id').single();
  $('#publish-post').disabled=false;
  if(error){console.error('post insert failed',error);return toast(error.code==='23514'?'A publicação não passou pelas regras de tamanho/visibilidade.':'Não foi possível publicar. Tente novamente.');}
  $('#post-body').value='';$('#recipient-search').value='';$('#char-count').textContent='420';state.recipient=null;
  state.postImageFile=null;state.postGifUrl='';$('#post-image').value='';$('#image-preview').classList.add('hidden');
  if($('#post-gif-file'))$('#post-gif-file').value='';
  if($('#post-gif-url'))$('#post-gif-url').value='';
  if($('#post-gif-row'))$('#post-gif-row').classList.add('hidden');
  if($('#post-gif-toggle'))$('#post-gif-toggle').classList.remove('active');
  if($('#post-gif-status'))$('#post-gif-status').textContent='escolha um GIF do AVESSO, envie arquivo ou cole link direto.';
  state.postMediaFile=null;
  if($('#post-media-link'))$('#post-media-link').value='';
  if($('#post-media-link-row'))$('#post-media-link-row').classList.add('hidden');
  if($('#post-media-link-toggle'))$('#post-media-link-toggle').classList.remove('active');
  if($('#post-media-link-status'))$('#post-media-link-status').textContent='link reconhecido vira player, não caça-clique';
  const mediaLabel=media_kind==='youtube'?'Vídeo do YouTube incorporado ao feed.':media_kind==='spotify'?'Spotify incorporado ao feed.':media_kind==='video'?'Vídeo entregue ao feed.':media_kind==='audio'?'Áudio entregue ao feed.':gifSelected?'GIF entregue ao feed. A internet de 2004 exigiu royalties emocionais.':image_url?'Imagem entregue ao feed. Sem moldura de influencer.':(directed?'Mensagem entregue.':'Publicado para a comunidade. Sem placar, com conversa.');
  toast(mediaLabel);
  trackAction(media_kind?`${media_kind}_posted`:gifSelected?'gif_posted':image_url?'image_posted':'post_created','composer',{directed,media_kind});
  if(isFeedTab())loadFeed();
  loadImpact();
  if(createdPost?.id)setTimeout(()=>askAlgoFeedReview(image_url?'image_posted':'post_created',createdPost.id),900);
};

async function loadThreadData(posts){
  const ids=posts.map(p=>p.id);
  if(!ids.length)return{responses:{},characters:{},reactions:{}};
  const [responsesRes,reactionsRes,characterRes]=await Promise.all([
    supabase.from('responses').select('id,post_id,author_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true}),
    supabase.from('post_reactions').select('post_id,user_id,reaction,created_at').in('post_id',ids),
    supabase.from('character_interactions').select('id,post_id,character_id,body,created_at,source,visibility,metadata,expires_at').in('post_id',ids).or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`).order('created_at',{ascending:true})
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
  status.textContent='carregando o que acabou de acontecer...';
  algoSay('feed_loading');

  let query=supabase.from('feed_attention').select('*');
  if(requestedTab==='quiet')query=query.eq('response_count',0);
  if(requestedTab==='sent')query=query.eq('author_id',state.profile.id);

  const feedLimit=Math.max(10,Math.min(60,Number(state.siteSettings?.feed_config?.page_size)||40));
  const {data,error}=await query.order('created_at',{ascending:false}).limit(feedLimit);

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
    if(state.tab==='feed')setTimeout(()=>{
      if(state.tab==='feed'&&viewVersion===state.viewVersion)
        maybeWorldCharacter('feed_attention',{character:'algo',surface:'feed',action_type:'feed_attention'},.035,12*60*1000);
    },2600);
  }else if(posts.length)algoSay('feed_default');
}
function renderFeed(posts,threadData={responses:{},characters:{},reactions:{}}){
  if(!isFeedTab())return;
  const list=$('#feed-list');
  if(!posts.length){
    list.innerHTML='<div class="feed-status">Nada aqui. Talvez as pessoas estejam vivendo. Estranho, mas permitido.</div>';
    algoSay('feed_empty');return;
  }
  list.innerHTML=posts.map((p,postIndex)=>{
    const responses=threadData.responses[p.id]||[];
    const characterReplies=threadData.characters[p.id]||[];
    const characterReactions=characterReplies.filter(x=>x.metadata?.interaction_kind==='reaction'&&x.metadata?.reaction);
    const characterComments=characterReplies.filter(x=>x.metadata?.interaction_kind!=='reaction');
    const reactionRows=threadData.reactions[p.id]||[];
    const conversation=[
      ...responses.map(x=>({...x,type:'human'})),
      ...characterComments.map(x=>({...x,type:'character'}))
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
      const botRows=characterReactions.filter(x=>x.metadata?.reaction===id);
      const active=rows.some(x=>x.user_id===state.profile.id);
      const total=rows.length+botRows.length;
      return `<button class="acid-reaction ${active?'active':''}" data-react-post="${p.id}" data-reaction="${id}" aria-pressed="${active}"><span>${icon}</span>${label}${total?` <b>${total}</b>`:''}${botRows.length?'<i class="character-reaction-mark" title="ALGO reagiu">ALGO</i>':''}</button>`;
    }).join('');
    const turned=Boolean(p.reshare_post_id||p.reshare_photo_id);
    const ownerActions=p.author_id===state.profile.id?`<div class="post-owner-actions">${turned?'':'<button data-post-edit="'+p.id+'">editar</button>'}<button class="danger" data-post-delete="${p.id}">apagar</button></div>`:'';
    const turnedBadge=turned?`<div class="post-turned-badge"><span>↻ VIRADO DO AVESSO</span><b>original: @${escapeHtml(p.reshare_author_handle||'alguém')}</b><small>virado por @${escapeHtml(p.author_handle||'alguém')}</small></div>`:'';
    const effectiveImage=p.image_url?postImageSrc(p.image_url):(p.reshare_photo_storage_path?publicAlbumUrl(p.reshare_photo_storage_path):'');
    const effectiveGif=Boolean(p.image_url&&isGifPostImage(p.image_url));
    return `<article class="post-card" data-post-card="${p.id}">
      <div class="post-route"><button class="mini-avatar profile-avatar-button" data-profile-id="${p.author_id}">${avatarHtml(p.author_avatar_url,p.author_name)}</button><button class="user-link" data-profile-id="${p.author_id}">${escapeHtml(p.author_name)}</button><span class="arrow">→</span><span>${p.recipient_id?escapeHtml(p.recipient_name||'pessoa'):'comunidade'}</span><span class="post-meta">${ago(p.created_at)} · ${p.response_count} resposta${p.response_count===1?'':'s'}</span></div>
      ${ownerActions}
      ${turnedBadge}
      <p class="post-body" data-post-body="${p.id}">${escapeHtml(p.body)}</p>
      ${p.author_id===state.profile.id?`<div class="post-edit-panel hidden" data-post-edit-panel="${p.id}"><textarea maxlength="420">${escapeHtml(p.body)}</textarea>${['youtube','spotify'].includes(p.media_kind)?`<input type="url" data-post-media-link-edit="${p.id}" value="${escapeAttr(externalMediaShareUrl(p.media_url))}" placeholder="link do YouTube ou Spotify">`:''}<div><button data-post-save="${p.id}">salvar edição</button><button data-post-cancel="${p.id}">cancelar</button></div></div>`:''}
      ${effectiveImage?`<figure class="post-image ${effectiveGif?'post-gif':''}"><img class="post-image-open" ${p.reshare_photo_id?`data-photo-open="${p.reshare_photo_id}"`:`data-feed-image-open="${p.id}"`} src="${escapeAttr(effectiveImage)}" alt="${effectiveGif?'GIF':'Imagem'} publicado por ${escapeAttr(p.author_name)}" loading="${postIndex<8?'eager':'lazy'}" decoding="async" fetchpriority="${postIndex<4?'high':'auto'}"></figure>`:''}
      ${feedMediaHtml(p.media_url,p.media_kind)}
      <div class="acid-reactions" aria-label="Reações do Avesso">${reactionHtml}</div>
      ${conversationHtml}
      <div class="post-actions"><button data-reply-toggle="${p.id}">↳ entrar na conversa</button><button class="turn-feed-button" data-turn-post="${p.id}">↻ virar no feed</button>${p.response_count===0?'<span class="need-tag">PRECISA DE ATENÇÃO</span>':''}</div>
      <div class="inline-reply hidden" data-reply-box="${p.id}"><label>RESPOSTA // fale com a pessoa, não com a métrica</label><textarea maxlength="420" placeholder="Escreva algo que valha o espaço que ocupa."></textarea><div class="reply-emoticon-row"><button type="button" data-reply-emoticons="${p.id}">☻ avessícones</button><div class="feed-emoticon-palette hidden" data-reply-emoticon-palette="${p.id}">${avessoEmoticonButtons('data-reply-emoticon')}</div></div><div><button data-reply-send="${p.id}">publicar resposta</button><button data-reply-cancel="${p.id}">cancelar</button></div></div>
    </article>`;
  }).join('');
  $$('[data-reply-toggle]').forEach(b=>b.onclick=()=>{
    const box=document.querySelector(`[data-reply-box="${b.dataset.replyToggle}"]`);
    box?.classList.toggle('hidden');box?.querySelector('textarea')?.focus();
  });
  $$('[data-reply-cancel]').forEach(b=>b.onclick=()=>document.querySelector(`[data-reply-box="${b.dataset.replyCancel}"]`)?.classList.add('hidden'));
  $$('[data-reply-emoticons]').forEach(b=>b.onclick=()=>document.querySelector(`[data-reply-emoticon-palette="${b.dataset.replyEmoticons}"]`)?.classList.toggle('hidden'));
  $$('[data-reply-emoticon]').forEach(b=>b.onclick=()=>{const box=b.closest('[data-reply-box]'),input=box?.querySelector('textarea');if(input){input.value+=`${input.value?' ':''}${b.dataset.replyEmoticon}`;input.focus();}});
  $$('[data-reply-send]').forEach(b=>b.onclick=()=>sendReply(b.dataset.replySend));
  $$('[data-react-post]').forEach(b=>b.onclick=()=>toggleReaction(b.dataset.reactPost,b.dataset.reaction,b.classList.contains('active')));
  $$('[data-post-edit]').forEach(b=>b.onclick=()=>document.querySelector(`[data-post-edit-panel="${b.dataset.postEdit}"]`)?.classList.remove('hidden'));
  $$('[data-post-cancel]').forEach(b=>b.onclick=()=>document.querySelector(`[data-post-edit-panel="${b.dataset.postCancel}"]`)?.classList.add('hidden'));
  $$('[data-post-save]').forEach(b=>b.onclick=()=>savePostEdit(b.dataset.postSave));
  $('[data-post-delete]').forEach(b=>b.onclick=()=>deleteOwnPost(b.dataset.postDelete));
  $('[data-turn-post]').forEach(b=>b.onclick=()=>turnPostToFeed(b.dataset.turnPost));
  $('[data-photo-open]').forEach(img=>img.onclick=()=>openAlbumPhotoViewer(img.dataset.photoOpen));
  $('[data-feed-image-open]').forEach(img=>img.onclick=()=>openFeedImageViewer(img.dataset.feedImageOpen));
}
async function savePostEdit(postId){
  const panel=document.querySelector(`[data-post-edit-panel="${CSS.escape(postId)}"]`);
  const body=String(panel?.querySelector('textarea')?.value||'').trim();
  if(body.length<1)return toast('A postagem precisa ter pelo menos 1 caractere.');
  if(body.length>420)return toast('Até 420 caracteres. A parede do AVESSO não virou tese.');
  const patch={body,edited_at:new Date().toISOString()};
  const linkInput=panel?.querySelector('[data-post-media-link-edit]');
  if(linkInput){
    const parsed=parseExternalMediaLink(linkInput.value);
    if(!parsed)return toast('O link editado precisa ser do YouTube ou Spotify.');
    patch.media_url=parsed.url;patch.media_kind=parsed.kind;
  }
  const {error}=await supabase.from('posts').update(patch).eq('id',postId).eq('author_id',state.profile.id);
  if(error)return toast('A edição não foi salva.');
  toast('Post editado. A internet aceitou uma rara correção.');
  if(isFeedTab())loadFeed();
}
function storagePathFromPublicUrl(raw,bucket){
  try{
    const url=new URL(raw);
    const marker=`/storage/v1/object/public/${bucket}/`;
    const index=url.pathname.indexOf(marker);
    if(index<0)return null;
    return decodeURIComponent(url.pathname.slice(index+marker.length));
  }catch{return null;}
}
async function deleteOwnPost(postId){
  if(!postId||!confirm('Apagar esta postagem? Respostas e reações ligadas a ela também podem desaparecer.'))return;
  const {data:post,error:fetchError}=await supabase.from('posts').select('id,author_id,image_url,media_url,media_kind').eq('id',postId).eq('author_id',state.profile.id).maybeSingle();
  if(fetchError||!post)return toast('Não encontrei essa postagem como sua.');
  const {error}=await supabase.from('posts').delete().eq('id',postId).eq('author_id',state.profile.id);
  if(error)return toast('A postagem se recusou a desaparecer.');
  const imagePath=storagePathFromPublicUrl(post.image_url,'post-images');
  if(imagePath?.startsWith(`${state.profile.id}/`))supabase.storage.from('post-images').remove([imagePath]).catch(()=>{});
  if(['audio','video'].includes(post.media_kind)){
    const mediaPath=storagePathFromPublicUrl(post.media_url,'avesso-media');
    if(mediaPath?.startsWith(`${state.profile.id}/`))supabase.storage.from('avesso-media').remove([mediaPath]).catch(()=>{});
  }
  toast('Postagem apagada. Sem cerimônia de despedida.');
  if(isFeedTab())loadFeed();
  loadImpact();
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
  setTimeout(()=>askAlgoFeedReview('reply_created',post_id),1100);
}

async function loadImpact(){const {count}=await supabase.from('posts').select('*',{count:'exact',head:true}).eq('author_id',state.profile.id);$('#impact-number').textContent=count||0;}
function adminPresenceLabel(profile){
  const view=presenceView(profile||{});
  return view.mode==='online'?'online':view.mode==='away'?'ausente':'offline';
}
function adminReportStatusOptions(current){
  return ['aberto','em_analise','resolvido','descartado'].map(value=>{
    const label={aberto:'aberto',em_analise:'em análise',resolvido:'resolvido',descartado:'descartado'}[value];
    return '<option value="'+value+'" '+(current===value?'selected':'')+'>'+label+'</option>';
  }).join('');
}
async function setAdminReportStatus(reportId,status){
  if(!state.isAdmin||!reportId)return;
  const {error}=await supabase.rpc('admin_set_report_status',{p_report_id:reportId,p_status:status});
  if(error)return toast('O status da denúncia não foi salvo.');
  toast('Denúncia atualizada.');
  renderAdminDashboard();
}
async function saveAdminWorldControls(){
  if(!state.isAdmin)return;
  const events=Boolean($('#admin-world-events')?.checked);
  const interventions=Boolean($('#admin-world-interventions')?.checked);
  const message=String($('#admin-world-message')?.value||'').trim().slice(0,240);
  const button=$('#admin-world-save');if(button)button.disabled=true;
  const {data,error}=await supabase.rpc('admin_set_world_controls',{
    p_events:events,
    p_interventions:interventions,
    p_message:message
  });
  if(button)button.disabled=false;
  if(error)return toast('Os controles do mundo recusaram autoridade. Poético, mas inadequado.');
  state.world.settings=data||state.world.settings;
  toast('Controles do Mundo do AVESSO atualizados.');
  renderAdminDashboard();
}

function adminApplyPreset(name){
  const presets={
    avesso:{bg:'#090b0c',panel:'#111517',panel2:'#191f21',ink:'#f5f3e8',muted:'#8e9999',line:'#293235',acid:'#d8ff3e',cyan:'#22d9ee',coral:'#ff5c4d',violet:'#9b7cff'},
    phosphor:{bg:'#020503',panel:'#07100a',panel2:'#0b170e',ink:'#dfffe6',muted:'#78a383',line:'#1e4b2a',acid:'#74ff4b',cyan:'#45ffc7',coral:'#ff695c',violet:'#9e7cff'},
    cyan:{bg:'#04080a',panel:'#071319',panel2:'#0c2028',ink:'#e8fbff',muted:'#7da5ad',line:'#1f4b56',acid:'#d8ff3e',cyan:'#28e8ff',coral:'#ff6a5f',violet:'#758dff'},
    magenta:{bg:'#0b050c',panel:'#160b18',panel2:'#231027',ink:'#fff0fb',muted:'#ad83a8',line:'#53204d',acid:'#d8ff3e',cyan:'#29e4ff',coral:'#ff655b',violet:'#ff59d6'}
  };
  const p=presets[name];if(!p)return;
  Object.entries(p).forEach(([key,value])=>{const input=$('#admin-color-'+key);if(input)input.value=value;});
  const preview={...(state.siteSettings||{}),
    color_bg:p.bg,color_panel:p.panel,color_panel2:p.panel2,color_ink:p.ink,color_muted:p.muted,
    color_line:p.line,color_acid:p.acid,color_cyan:p.cyan,color_coral:p.coral,color_violet:p.violet
  };
  applySiteSettings(preview);
}
async function saveAdminSiteSettings(){
  if(!state.isAdmin)return;
  const args={
    p_site_name:String($('#admin-site-name')?.value||'AVESSO').trim(),
    p_tagline:String($('#admin-site-tagline')?.value||'').trim(),
    p_color_bg:$('#admin-color-bg')?.value||'#090b0c',
    p_color_panel:$('#admin-color-panel')?.value||'#111517',
    p_color_panel2:$('#admin-color-panel2')?.value||'#191f21',
    p_color_ink:$('#admin-color-ink')?.value||'#f5f3e8',
    p_color_muted:$('#admin-color-muted')?.value||'#8e9999',
    p_color_line:$('#admin-color-line')?.value||'#293235',
    p_color_acid:$('#admin-color-acid')?.value||'#d8ff3e',
    p_color_cyan:$('#admin-color-cyan')?.value||'#22d9ee',
    p_color_coral:$('#admin-color-coral')?.value||'#ff5c4d',
    p_color_violet:$('#admin-color-violet')?.value||'#9b7cff',
    p_custom_css:String($('#admin-custom-css')?.value||'').slice(0,20000),
    p_announcement:String($('#admin-announcement')?.value||'').slice(0,240)
  };
  const btn=$('#admin-site-save');if(btn)btn.disabled=true;
  const {data,error}=await supabase.rpc('admin_update_site_settings',args);
  if(btn)btn.disabled=false;
  if(error)return toast('A aparência global não foi salva. O CSS ganhou consciência.');
  state.siteSettings=data||args;
  applySiteSettings(data||state.siteSettings);
  toast('Aparência global atualizada.');
  renderAdminDashboard();
}
async function adminToggleSuspension(userId,suspended){
  if(!state.isAdmin||!userId)return;
  let reason='';
  if(suspended){
    reason=prompt('Motivo da suspensão (fica no registro administrativo):','violação das regras do AVESSO')||'';
    if(!reason.trim())return;
  }
  const {error}=await supabase.rpc('admin_set_user_suspension',{p_user_id:userId,p_suspended:suspended,p_reason:reason,p_until:null});
  if(error)return toast('Não foi possível alterar a suspensão deste usuário.');
  toast(suspended?'Usuário suspenso. A rede continua sem tribunal de praça pública.':'Usuário reativado.');
  renderAdminDashboard();
}
async function adminSetRole(userId,role){
  if(state.adminRole!=='owner'||!userId)return;
  const {error}=await supabase.rpc('admin_set_user_role',{p_user_id:userId,p_role:role});
  if(error)return toast('A função administrativa não foi alterada.');
  toast(role==='none'?'Acesso administrativo removido.':'Papel administrativo atualizado.');
  renderAdminDashboard();
}
async function adminDeleteContent(kind,id){
  if(!state.isAdmin||!id)return;
  const rpc={post:'admin_delete_post',response:'admin_delete_response',photo:'admin_delete_photo',story:'admin_delete_story'}[kind];
  if(!rpc)return;
  if(!confirm('Remover este conteúdo da rede? A ação será registrada no log administrativo.'))return;
  const {error}=await supabase.rpc(rpc,{p_id:id});
  if(error)return toast('A moderação não conseguiu remover o conteúdo.');
  toast('Conteúdo removido pela moderação.');
  if(isFeedTab())loadFeed();
  renderAdminDashboard();
}
function adminContentCard(kind,row){
  const author='@'+escapeHtml(row.author_handle||'...');
  const body=escapeHtml(row.body||row.caption||('[ '+kind+' ]'));
  const media=kind==='photo'&&row.storage_path?'<img src="'+escapeAttr(publicAlbumUrl(row.storage_path))+'" alt="">':'';
  return '<article class="admin-content-card">'+media+'<div><header><b>'+author+'</b><small>'+ago(row.created_at)+'</small></header><p>'+body+'</p></div><button class="danger" data-admin-delete-kind="'+kind+'" data-admin-delete-id="'+escapeAttr(row.id)+'">remover</button></article>';
}
function adminAuditRow(row){
  const labels={
    update_site_settings:'aparência alterada',suspend_user:'usuário suspenso',restore_user:'usuário reativado',
    set_admin_role:'papel administrativo',delete_post:'post removido',delete_response:'resposta removida',
    delete_photo:'foto removida',delete_story:'story removido'
  };
  return '<div class="admin-audit-row"><b>'+escapeHtml(labels[row.action]||row.action||'ação')+'</b><span>'+escapeHtml(row.target_type||'sistema')+(row.target_id?' · '+escapeHtml(String(row.target_id).slice(0,12)):'')+'</span><time>'+ago(row.created_at)+'</time></div>';
}


const STAFF_SECTION_META={
  overview:['◫','Visão geral'],
  reports:['⚑','Denúncias'],
  users:['◎','Usuários & conteúdo'],
  monitor:['⌁','Monitor 24h'],
  plaza:['⌂','Praça'],
  chat:['↔','Chat Staff'],
  team:['♜','Equipe'],
  appearance:['▣','Aparência & layout'],
  pages:['▤','Páginas & login'],
  assets:['▧','Assets & mídia'],
  badges:['✦','Emblemas'],
  inhabitants:['◉','Habitantes & IA'],
  database:['⌘','Banco de dados'],
  world:['◇','Mundo do AVESSO'],
  audit:['≡','Auditoria']
};
function staffSectionsForRole(role=state.staffRole){
  const common=['overview','reports','users','monitor','plaza','chat'];
  if(role==='moderator')return common;
  if(role==='senior_admin')return [...common,'team','audit'];
  return [...common,'team','appearance','pages','assets','badges','inhabitants','database','world','audit'];
}
function staffSectionButton(id){
  const meta=STAFF_SECTION_META[id]||['·',id];
  return '<button class="'+(state.staffSection===id?'active':'')+'" data-staff-section="'+id+'"><span>'+meta[0]+'</span><b>'+escapeHtml(meta[1])+'</b></button>';
}
function staffUserMap(snapshot=state.staffSnapshot||{}){
  return Object.fromEntries((snapshot.users||[]).map(x=>[x.id,x]));
}
function staffPeopleOptions(selected='',{includeEmpty=true,minRank=10}={}){
  const staff=(state.staffSnapshot?.staff||[]).filter(x=>staffRankValue(x.role)>=minRank);
  return (includeEmpty?'<option value="">sem responsável</option>':'')+
    staff.map(x=>'<option value="'+escapeAttr(x.user_id)+'" '+(x.user_id===selected?'selected':'')+'>'+escapeHtml(x.display_name||x.handle)+' · '+escapeHtml(staffRoleLabel(x.role))+'</option>').join('');
}
function staffRoleChip(role=''){
  if(!role)return '<span class="staff-role-chip user">usuário</span>';
  return '<span class="staff-role-chip '+escapeAttr(role)+'">'+escapeHtml(staffRoleLabel(role))+'</span>';
}
function staffStatusOptions(current='aberto'){
  const values=[['aberto','aberto'],['em_analise','em análise'],['encaminhado','encaminhado'],['resolvido','resolvido'],['descartado','descartado'],['arquivado','arquivado']];
  return values.map(([value,label])=>'<option value="'+value+'" '+(current===value?'selected':'')+'>'+label+'</option>').join('');
}
function staffPriorityOptions(current='normal'){
  return ['baixa','normal','alta','critica'].map(v=>'<option value="'+v+'" '+(current===v?'selected':'')+'>'+v+'</option>').join('');
}
function staffHitStatusOptions(current='novo'){
  const values=[['novo','novo'],['revisando','revisando'],['encaminhado','encaminhado'],['ignorado','ignorado'],['acao_tomada','ação tomada']];
  return values.map(([v,l])=>'<option value="'+v+'" '+(current===v?'selected':'')+'>'+l+'</option>').join('');
}
function staffDashboardHero(){
  const role=staffRoleLabel(state.staffRole);
  const crown=state.staffRole==='owner'?adminCrownHtml('staff-dashboard-crown'):'';
  return '<header class="staff-dashboard-hero"><div><span class="section-code">AVESSO.STAFF // '+escapeHtml(role.toUpperCase())+'</span>'+
    '<h1>Dashboard '+crown+'</h1><p>Ferramentas de moderação, operação e configuração separadas por responsabilidade. Poder sem organização é só um acidente com permissões.</p></div>'+
    '<button id="staff-dashboard-refresh" type="button">↻ atualizar</button></header>';
}
function staffDashboardStats(snapshot){
  const c=snapshot.counts||{};
  const cards=[
    ['habitantes',c.users??0,'contas'],
    ['online',c.online??0,'agora'],
    ['denúncias',c.reports_open??0,'em fluxo'],
    ['sinais 24h',c.hits_open??0,'para revisar'],
    ['banidos',c.banned??0,'ativos'],
    ['staff',c.staff??0,'pessoas']
  ];
  return '<div class="staff-stat-grid">'+cards.map(([a,b,c])=>'<article><span>'+a+'</span><strong>'+escapeHtml(String(b))+'</strong><small>'+c+'</small></article>').join('')+'</div>';
}
function renderStaffOverview(snapshot){
  const reports=(snapshot.reports||[]).filter(x=>['aberto','em_analise','encaminhado'].includes(x.status)).slice(0,6);
  const hits=(snapshot.hits||[]).filter(x=>['novo','revisando','encaminhado'].includes(x.status)).slice(0,6);
  const reportRows=reports.map(x=>'<button class="staff-mini-row" data-staff-jump="reports"><span class="staff-priority '+escapeAttr(x.priority||'normal')+'">'+escapeHtml(x.priority||'normal')+'</span><b>'+escapeHtml(x.reason||'denúncia')+'</b><small>'+escapeHtml(x.reported_handle?'@'+x.reported_handle:(x.post_id?'post '+String(x.post_id).slice(0,8):'conteúdo'))+' · '+ago(x.created_at)+'</small></button>').join('')||'<p class="staff-empty">Nenhuma denúncia pendente.</p>';
  const hitRows=hits.map(x=>'<button class="staff-mini-row" data-staff-jump="monitor"><span class="staff-priority '+escapeAttr(x.severity||'media')+'">'+escapeHtml(x.severity||'media')+'</span><b>'+escapeHtml(x.matched_term||'termo')+'</b><small>'+escapeHtml(x.source_type||'conteúdo')+' · '+escapeHtml(x.user_handle?'@'+x.user_handle:'sem perfil')+'</small></button>').join('')||'<p class="staff-empty">Nenhum sinal pendente.</p>';
  return staffDashboardStats(snapshot)+
    '<div class="staff-two-col"><section class="staff-card"><header><span class="section-code">DENÚNCIAS // AGORA</span><h2>Fila que precisa de gente</h2></header>'+reportRows+'</section>'+
    '<section class="staff-card"><header><span class="section-code">MONITOR // 24H</span><h2>Sinais automáticos</h2></header>'+hitRows+'</section></div>'+
    '<section class="staff-card staff-privacy-note"><b>PRIVACIDADE</b><p>O monitor cobre conteúdo público e perfis. Mensagens privadas entre usuários não entram nesta dashboard. Moderação não precisa virar leitura de correspondência.</p></section>';
}
function renderStaffReports(snapshot){
  const reports=snapshot.reports||[];
  const cards=reports.map(r=>{
    const target=r.reported_handle?'@'+r.reported_handle:(r.post_id?'post '+String(r.post_id).slice(0,12):'conteúdo');
    return '<article class="staff-report-card" data-report-card="'+r.id+'"><header><div><span class="staff-priority '+escapeAttr(r.priority||'normal')+'">'+escapeHtml(r.priority||'normal')+'</span><b>'+escapeHtml(r.reason||'denúncia')+'</b><small>por '+escapeHtml(r.reporter_handle?'@'+r.reporter_handle:'usuário')+' · '+ago(r.created_at)+'</small></div><strong>'+escapeHtml(target)+'</strong></header>'+
      '<p>'+escapeHtml(r.details||'sem detalhes')+'</p>'+
      '<div class="staff-report-grid"><label>Status<select data-report-field="status">'+staffStatusOptions(r.status)+'</select></label><label>Prioridade<select data-report-field="priority">'+staffPriorityOptions(r.priority)+'</select></label>'+
      '<label class="wide">Responsável<select data-report-field="assigned_to">'+staffPeopleOptions(r.assigned_to||'')+'</select></label>'+
      '<label class="wide">Notas internas<textarea data-report-field="staff_notes" maxlength="3000">'+escapeHtml(r.staff_notes||'')+'</textarea></label>'+
      '<label class="wide">Resolução<textarea data-report-field="resolution" maxlength="2000">'+escapeHtml(r.resolution||'')+'</textarea></label></div>'+
      '<footer><span>'+(r.assigned_handle?'com @'+escapeHtml(r.assigned_handle):'ainda sem responsável')+'</span><div><button data-report-claim="'+r.id+'">assumir</button><button class="primary" data-report-save="'+r.id+'">salvar / encaminhar</button></div></footer></article>';
  }).join('')||'<p class="staff-empty">Nenhuma denúncia. Humanos em manutenção preventiva.</p>';
  return '<section class="staff-card"><header class="staff-section-head"><div><span class="section-code">DENÚNCIAS // FILA DISTRIBUÍDA</span><h2>Receber, assumir e encaminhar</h2><p>Moderadores podem encaminhar para outro moderador, Administrador-Senior ou Administrador Geral.</p></div><b>'+reports.length+'</b></header><div class="staff-report-list">'+cards+'</div></section>';
}
async function loadStaffPublicContent(){
  const [postsRes,photosRes,storiesRes]=await Promise.all([
    supabase.from('feed_attention').select('*').order('created_at',{ascending:false}).limit(40),
    supabase.from('profile_photos').select('id,user_id,storage_path,caption,created_at').order('created_at',{ascending:false}).limit(40),
    supabase.from('stories').select('id,author_id,body,image_path,media_type,created_at,expires_at').gt('expires_at',new Date().toISOString()).order('created_at',{ascending:false}).limit(40)
  ]);
  const photos=photosRes.data||[],stories=storiesRes.data||[];
  const ids=[...new Set([...photos.map(x=>x.user_id),...stories.map(x=>x.author_id)].filter(Boolean))];
  let profiles={};
  if(ids.length){
    const {data}=await supabase.from('profiles').select('id,handle,display_name,avatar_url').in('id',ids);
    profiles=Object.fromEntries((data||[]).map(p=>[p.id,p]));
  }
  state.staffPublicContent={
    posts:postsRes.data||[],
    photos:photos.map(x=>({...x,author:profiles[x.user_id]||{}})),
    stories:stories.map(x=>({...x,author:profiles[x.author_id]||{}}))
  };
}
function staffBanLabel(user){
  if(!user.banned)return'ativo';
  if(!user.suspended_until)return'ban permanente';
  return'ban até '+new Date(user.suspended_until).toLocaleString('pt-BR');
}
function renderStaffUsers(snapshot){
  const users=snapshot.users||[];
  const canManageRoles=state.staffRank>=20;
  const userRows=users.map(u=>{
    const targetRank=staffRankValue(u.staff_role);
    const canBan=u.id!==state.profile.id&&targetRank<state.staffRank;
    return '<article class="staff-user-row '+(u.banned?'banned':'')+'"><button class="staff-user-main" data-profile-id="'+u.id+'"><span class="mini-avatar">'+avatarHtml(u.avatar_url,u.display_name||'?')+'</span><span><b class="identity-name" data-identity-profile-id="'+u.id+'">'+escapeHtml(u.display_name||'sem nome')+'</b><small>@'+escapeHtml(u.handle||'...')+' · '+escapeHtml(u.status_message||'sem status')+'</small></span></button>'+
      '<div class="staff-user-state">'+staffRoleChip(u.staff_role)+'<em>'+escapeHtml(staffBanLabel(u))+'</em></div>'+
      '<div class="staff-user-actions"><button data-staff-notify-user="'+u.id+'">notificar</button>'+(canBan?(u.banned?'<button class="restore" data-staff-unban="'+u.id+'">reativar</button>':'<button class="danger" data-staff-ban="'+u.id+'">banir</button>'):'')+
      (canManageRoles&&u.id!==state.profile.id?'<button data-staff-team-jump="'+u.id+'">cargo</button>':'')+'</div></article>';
  }).join('');
  const content=state.staffPublicContent||{posts:[],photos:[],stories:[]};
  const postCards=(content.posts||[]).map(p=>'<article class="staff-content-row"><div><b>@'+escapeHtml(p.author_handle||'...')+'</b><small>'+ago(p.created_at)+'</small><p>'+escapeHtml(p.body||'')+'</p></div><button class="danger" data-staff-delete-kind="post" data-staff-delete-id="'+p.id+'">apagar</button></article>').join('')||'<p class="staff-empty">Carregando publicações...</p>';
  const photoCards=(content.photos||[]).map(p=>'<article class="staff-media-row"><img src="'+escapeAttr(publicAlbumUrl(p.storage_path))+'" alt=""><div><b>@'+escapeHtml(p.author?.handle||'...')+'</b><p>'+escapeHtml(p.caption||'sem legenda')+'</p></div><button class="danger" data-staff-delete-kind="photo" data-staff-delete-id="'+p.id+'">apagar</button></article>').join('')||'<p class="staff-empty">Carregando fotos...</p>';
  const storyCards=(content.stories||[]).map(p=>'<article class="staff-content-row"><div><b>@'+escapeHtml(p.author?.handle||'...')+'</b><small>'+ago(p.created_at)+'</small><p>'+escapeHtml(p.body||'[story com mídia]')+'</p></div><button class="danger" data-staff-delete-kind="story" data-staff-delete-id="'+p.id+'">apagar</button></article>').join('')||'<p class="staff-empty">Carregando stories...</p>';
  return '<section class="staff-card"><header class="staff-section-head"><div><span class="section-code">USUÁRIOS // MODERAÇÃO</span><h2>Perfis, bans e notificações</h2></div><b>'+users.length+'</b></header><div class="staff-user-list">'+userRows+'</div></section>'+
    '<section class="staff-card"><header><span class="section-code">CONTEÚDO PÚBLICO // MODERAÇÃO</span><h2>Posts, fotos e stories</h2></header><div class="staff-content-tabs"><div><h3>Publicações</h3>'+postCards+'</div><div><h3>Fotos</h3>'+photoCards+'</div><div><h3>Stories</h3>'+storyCards+'</div></div></section>';
}
function renderStaffMonitor(snapshot){
  const terms=snapshot.terms||[],hits=snapshot.hits||[];
  const termRows=terms.map(t=>'<article class="staff-term-row"><div><b>'+escapeHtml(t.term)+'</b><small>'+escapeHtml(t.category)+' · '+escapeHtml(t.severity)+'</small></div><span class="'+(t.enabled?'on':'off')+'">'+(t.enabled?'ATIVO':'PAUSADO')+'</span><button data-term-edit="'+t.id+'">editar</button></article>').join('')||'<p class="staff-empty">Nenhum termo configurado.</p>';
  const hitRows=hits.map(h=>'<article class="staff-hit-card '+escapeAttr(h.severity||'media')+'"><header><div><b>'+escapeHtml(h.matched_term||'termo')+'</b><small>'+escapeHtml(h.category||'outro')+' · '+escapeHtml(h.source_type||'conteúdo')+' · '+ago(h.created_at)+'</small></div><span>'+escapeHtml(h.severity||'media')+'</span></header><blockquote>'+escapeHtml(h.excerpt||'')+'</blockquote><footer><button data-profile-id="'+escapeAttr(h.user_id||'')+'">'+escapeHtml(h.user_handle?'@'+h.user_handle:'perfil indisponível')+'</button><select data-hit-status="'+h.id+'">'+staffHitStatusOptions(h.status)+'</select><select data-hit-assignee="'+h.id+'">'+staffPeopleOptions(h.assigned_to||'')+'</select><button class="primary" data-hit-save="'+h.id+'">salvar</button></footer></article>').join('')||'<p class="staff-empty">Nenhum sinal. O monitor continua acordado mesmo assim.</p>';
  return '<div class="staff-two-col monitor-grid"><section class="staff-card"><header><span class="section-code">WATCHLIST // 24H</span><h2>Termos monitorados</h2><p>O servidor registra correspondências em conteúdo público mesmo com ninguém conectado. Correspondência é sinal para revisão, não sentença automática.</p></header>'+
    '<form id="staff-term-form" class="staff-term-form"><input id="staff-term-id" type="hidden"><label>termo ou frase<input id="staff-term-text" maxlength="160" required></label><label>categoria<input id="staff-term-category" maxlength="60" value="outro"></label><label>gravidade<select id="staff-term-severity"><option>baixa</option><option selected>media</option><option>alta</option><option>critica</option></select></label><label class="check"><input id="staff-term-enabled" type="checkbox" checked> ativo</label><label class="wide">nota<input id="staff-term-notes" maxlength="500"></label><button class="primary" type="submit">salvar termo</button></form><div class="staff-term-list">'+termRows+'</div></section>'+
    '<section class="staff-card"><header><span class="section-code">SINAIS // CONTEXTO ANTES DE AÇÃO</span><h2>Ocorrências</h2></header><div class="staff-hit-list">'+hitRows+'</div></section></div>';
}
function renderStaffPlaza(snapshot){
  const rows=(snapshot.plaza||[]).map(m=>'<article class="staff-plaza-row"><button data-profile-id="'+m.user_id+'"><b class="identity-name" data-identity-profile-id="'+m.user_id+'">'+escapeHtml(m.display_name||m.handle||'usuário')+'</b><small>@'+escapeHtml(m.handle||'...')+' · '+ago(m.created_at)+'</small></button><p>'+escapeHtml(m.body||'')+'</p><button class="danger" data-staff-delete-kind="plaza" data-staff-delete-id="'+m.id+'">apagar</button></article>').join('')||'<p class="staff-empty">Praça quieta. Provavelmente temporário.</p>';
  return '<section class="staff-card"><header class="staff-section-head"><div><span class="section-code">PRAÇA // PÚBLICO</span><h2>Monitor de conversa pública</h2><p>Somente a Praça pública. Conversas privadas entre usuários continuam fora da Staff.</p></div></header><div class="staff-plaza-list">'+rows+'</div></section>';
}
async function loadStaffChat(scope=state.staffChatScope||'all'){
  if(!state.isAdmin)return;
  state.staffChatScope=scope;
  const {data,error}=await supabase.from('staff_messages').select('id,sender_id,scope,body,created_at').eq('scope',scope).order('created_at',{ascending:false}).limit(80);
  if(error)return;
  const rows=[...(data||[])].reverse();
  const staff=Object.fromEntries((state.staffSnapshot?.staff||[]).map(x=>[x.user_id,x]));
  const host=$('#staff-chat-log');if(!host)return;
  host.innerHTML=rows.map(m=>{const p=staff[m.sender_id]||{};return '<article class="staff-chat-message '+(m.sender_id===state.profile.id?'mine':'')+'"><header><b class="identity-name" data-identity-profile-id="'+m.sender_id+'">'+escapeHtml(p.display_name||p.handle||'staff')+'</b><small>'+escapeHtml(staffRoleLabel(p.role))+' · '+ago(m.created_at)+'</small></header><p>'+escapeHtml(m.body)+'</p></article>';}).join('')||'<p class="staff-empty">Canal vazio. A Staff descobriu o silêncio.</p>';
  host.scrollTop=host.scrollHeight;
  decorateIdentityNodes(host);
}
function startStaffChatRealtime(){
  if(state.staffChannel){supabase.removeChannel(state.staffChannel);state.staffChannel=null;}
  if(!state.isAdmin)return;
  state.staffChannel=supabase.channel('avesso-staff-chat-'+state.profile.id+'-'+Date.now())
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'staff_messages'},payload=>{
      if(state.tab==='admin'&&state.staffSection==='chat'&&payload.new?.scope===state.staffChatScope)loadStaffChat(state.staffChatScope);
    }).subscribe();
}
function renderStaffChat(){
  const scopes=[['all','todos']];
  if(['moderator','owner'].includes(state.staffRole))scopes.push(['moderators','moderadores']);
  if(['senior_admin','owner'].includes(state.staffRole))scopes.push(['senior','administrador-senior']);
  if(!scopes.some(x=>x[0]===state.staffChatScope))state.staffChatScope='all';
  return '<section class="staff-card staff-chat-card"><header><span class="section-code">STAFF.MSG // INTERNO</span><h2>Chat da equipe</h2><p>Canais separados por cargo. Não aparece para usuários comuns.</p></header><div class="staff-chat-scopes">'+scopes.map(([id,label])=>'<button class="'+(state.staffChatScope===id?'active':'')+'" data-staff-chat-scope="'+id+'">'+label+'</button>').join('')+'</div><div id="staff-chat-log" class="staff-chat-log"><p class="staff-empty">carregando...</p></div><form id="staff-chat-form"><textarea id="staff-chat-input" maxlength="1600" placeholder="mensagem interna..."></textarea><button class="primary" type="submit">enviar</button></form></section>';
}
function renderStaffTeam(snapshot){
  const staff=snapshot.staff||[];
  const warnings=snapshot.warnings||[];
  const rows=staff.map(person=>{
    const rank=staffRankValue(person.role),canManage=person.user_id!==state.profile.id&&rank<state.staffRank;
    let roleControl=staffRoleChip(person.role);
    if(canManage){
      const allowed=state.staffRole==='owner'
        ?[['none','usuário'],['moderator','Moderador'],['senior_admin','Administrador-Senior']]
        :[['none','usuário'],['moderator','Moderador']];
      roleControl='<select data-staff-role-user="'+person.user_id+'">'+allowed.map(([v,l])=>'<option value="'+v+'" '+((person.role||'none')===v?'selected':'')+'>'+l+'</option>').join('')+'</select>';
    }
    return '<article class="staff-team-row"><span class="mini-avatar">'+avatarHtml(person.avatar_url,person.display_name||'?')+'</span><div><b class="identity-name" data-identity-profile-id="'+person.user_id+'">'+escapeHtml(person.display_name||person.handle)+'</b><small>@'+escapeHtml(person.handle||'...')+' · '+person.warnings+' advertência(s)</small></div>'+roleControl+(canManage?'<button data-staff-warning="'+person.user_id+'">advertir</button>':'')+'</article>';
  }).join('');
  const warningRows=warnings.map(w=>'<article class="staff-warning-row"><b>@'+escapeHtml(w.staff_handle||'staff')+'</b><p>'+escapeHtml(w.reason)+'</p><small>por @'+escapeHtml(w.issuer_handle||'...')+' · '+ago(w.created_at)+'</small></article>').join('')||'<p class="staff-empty">Nenhuma advertência ativa.</p>';
  return '<div class="staff-two-col"><section class="staff-card"><header><span class="section-code">EQUIPE // HIERARQUIA</span><h2>Moderadores e administradores</h2></header><div class="staff-team-list">'+rows+'</div></section><section class="staff-card"><header><span class="section-code">ADVERTÊNCIAS // INTERNO</span><h2>Histórico recente</h2></header>'+warningRows+'</section></div>';
}
function ownerAppearanceSection(snapshot){
  const site=snapshot.site||state.siteSettings||{},feed=site.feed_config||{},story=site.story_config||{},layout=site.layout_config||{};
  const colors=[['bg','fundo',site.color_bg||'#090b0c'],['panel','painel',site.color_panel||'#111517'],['panel2','painel 2',site.color_panel2||'#191f21'],['ink','texto',site.color_ink||'#f5f3e8'],['muted','apagado',site.color_muted||'#8e9999'],['line','linhas',site.color_line||'#293235'],['acid','ácido',site.color_acid||'#d8ff3e'],['cyan','ciano',site.color_cyan||'#22d9ee'],['coral','coral',site.color_coral||'#ff5c4d'],['violet','violeta',site.color_violet||'#9b7cff']];
  return '<section class="staff-card owner-master-card"><header><span class="section-code">OWNER // APARÊNCIA GLOBAL</span><h2>Tema, estilo e layout</h2></header>'+
    '<div class="owner-copy-grid"><label>nome da rede<input id="admin-site-name" maxlength="40" value="'+escapeAttr(site.site_name||'AVESSO')+'"></label><label>tagline<input id="admin-site-tagline" maxlength="120" value="'+escapeAttr(site.tagline||'menos palco, mais presença')+'"></label><label class="wide">aviso global<textarea id="admin-announcement" maxlength="240">'+escapeHtml(site.announcement||'')+'</textarea></label></div>'+
    '<div class="admin-presets"><span>PRESETS</span><button data-admin-preset="avesso">AVESSO</button><button data-admin-preset="phosphor">Fósforo</button><button data-admin-preset="cyan">Ciano</button><button data-admin-preset="magenta">Magenta CRT</button></div>'+
    '<div class="owner-color-grid">'+colors.map(([k,l,v])=>'<label><span>'+l+'</span><input id="admin-color-'+k+'" data-admin-color-var="--'+k+'" type="color" value="'+escapeAttr(v)+'"></label>').join('')+'</div>'+
    '<label class="owner-css-editor">CSS GLOBAL<textarea id="admin-custom-css" spellcheck="false">'+escapeHtml(site.custom_css||'')+'</textarea><small>CSS é global. JavaScript e HTML arbitrários não são executados por este campo.</small></label><button id="admin-site-save" class="primary">salvar aparência global</button></section>'+
    '<section class="staff-card"><header><span class="section-code">EXPERIÊNCIA // FEED + STORIES + LAYOUT</span><h2>Comportamento global</h2></header><form id="owner-experience-form" class="owner-experience-grid">'+
    '<label>posts carregados<input id="owner-feed-page-size" type="number" min="10" max="60" value="'+escapeAttr(feed.page_size??40)+'"></label>'+
    '<label class="check"><input id="owner-feed-stories" type="checkbox" '+(feed.show_stories!==false?'checked':'')+'> mostrar stories no feed</label>'+
    '<label class="check"><input id="owner-feed-tower" type="checkbox" '+(feed.show_tower!==false?'checked':'')+'> mostrar Torre</label>'+
    '<label>duração story (h)<input id="owner-story-hours" type="number" min="1" max="24" value="'+escapeAttr(story.duration_hours??24)+'"></label>'+
    '<label>vídeo máximo (s)<input id="owner-story-video" type="number" min="5" max="30" value="'+escapeAttr(story.max_video_seconds??15)+'"></label>'+
    '<label class="check"><input id="owner-story-camera" type="checkbox" '+(story.camera_enabled!==false?'checked':'')+'> câmera habilitada</label>'+
    '<label>visibilidade padrão<select id="owner-story-visibility"><option value="publico" '+(story.default_visibility!=='amigos'?'selected':'')+'>público</option><option value="amigos" '+(story.default_visibility==='amigos'?'selected':'')+'>amigos</option></select></label>'+
    '<label>densidade<select id="owner-layout-density"><option value="compact" '+(layout.density!=='comfortable'?'selected':'')+'>compacta</option><option value="comfortable" '+(layout.density==='comfortable'?'selected':'')+'>confortável</option></select></label>'+
    '<label>largura do feed<select id="owner-layout-width"><option value="narrow" '+(layout.feed_width==='narrow'?'selected':'')+'>estreito</option><option value="normal" '+(!['narrow','wide'].includes(layout.feed_width)?'selected':'')+'>normal</option><option value="wide" '+(layout.feed_width==='wide'?'selected':'')+'>amplo</option></select></label>'+
    '<label>barra lateral<select id="owner-layout-sidebar"><option value="fixed" '+(layout.sidebar_mode!=='compact'?'selected':'')+'>fixa</option><option value="compact" '+(layout.sidebar_mode==='compact'?'selected':'')+'>compacta</option></select></label>'+
    '<button class="primary wide" type="submit">salvar experiência global</button></form></section>';
}
function ownerPagesSection(snapshot){
  const blocks=snapshot.cms||[];
  const rows=blocks.map(b=>'<article class="cms-block-row" data-cms-row="'+b.id+'"><div><b>'+escapeHtml(b.page_slug)+' / '+escapeHtml(b.block_key)+'</b><small>'+escapeHtml(b.kind)+' · '+(b.enabled?'ativo':'oculto')+'</small></div><textarea data-cms-value="'+b.id+'" maxlength="20000">'+escapeHtml(b.value||'')+'</textarea><button data-cms-save="'+b.id+'" data-page="'+escapeAttr(b.page_slug)+'" data-key="'+escapeAttr(b.block_key)+'" data-kind="'+escapeAttr(b.kind)+'">salvar</button></article>').join('');
  return '<section class="staff-card"><header><span class="section-code">CMS // PÁGINAS</span><h2>Página inicial, registro/login e blocos</h2><p>Os blocos abaixo são persistidos no banco. A página inicial e o modal de registro/login já consomem esses valores.</p></header><div class="cms-block-list">'+rows+'</div>'+
    '<form id="cms-new-form" class="cms-new-form"><h3>Novo bloco</h3><label>página<input id="cms-new-page" value="home"></label><label>chave<input id="cms-new-key" placeholder="secao.chave"></label><label>tipo<select id="cms-new-kind"><option>text</option><option>image</option><option>toggle</option><option>json</option></select></label><label class="wide">valor<textarea id="cms-new-value" maxlength="20000"></textarea></label><button class="primary" type="submit">adicionar / substituir</button></form></section>';
}
function ownerAssetsSection(snapshot){
  const assets=snapshot.assets||[];
  const rows=assets.map(a=>'<article class="owner-asset-row"><div class="asset-preview">'+(a.storage_path?'<img src="'+escapeAttr(assetPublicUrl(a.storage_path))+'" alt="">':'')+'</div><div><b>'+escapeHtml(a.name)+'</b><small>'+escapeHtml(a.kind)+' · '+escapeHtml(a.slug)+(a.token?' · '+escapeHtml(a.token):'')+'</small></div><span>'+(a.active?'ATIVO':'OCULTO')+'</span></article>').join('')||'<p class="staff-empty">Nenhum asset enviado.</p>';
  return '<section class="staff-card"><header><span class="section-code">ASSETS // ARQUIVOS DO OWNER</span><h2>Wallpapers, avatares, emoticons e imagens</h2><p>PNG, JPG, WEBP, GIF ou SVG até 10 MB. Upload vai para o bucket público <code>avesso-assets</code>.</p></header>'+
    '<form id="owner-asset-form" class="owner-upload-form"><label>tipo<select id="owner-asset-kind"><option value="wallpaper">wallpaper</option><option value="avatar">avatar</option><option value="emoticon">emoticon</option><option value="character">habitante</option><option value="landing">landing/login</option><option value="other">outro</option></select></label><label>nome<input id="owner-asset-name" maxlength="80"></label><label>slug<input id="owner-asset-slug" maxlength="60" placeholder="meu-asset"></label><label>token do emoticon<input id="owner-asset-token" maxlength="40" placeholder=":meu_emote:"></label><label class="wide">arquivo<input id="owner-asset-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" required></label><button class="primary" type="submit">enviar ao banco</button></form><div class="owner-asset-list">'+rows+'</div></section>';
}
function ownerBadgesSection(snapshot){
  const badges=snapshot.badges||[],users=snapshot.users||[];
  const rows=badges.map(b=>'<article class="owner-badge-row"><img src="'+escapeAttr(assetPublicUrl(b.image_path))+'" alt=""><div><b>'+escapeHtml(b.name)+'</b><small>:'+escapeHtml(b.slug)+' · '+escapeHtml(b.description||'')+'</small></div></article>').join('')||'<p class="staff-empty">Nenhum emblema criado.</p>';
  return '<div class="staff-two-col"><section class="staff-card"><header><span class="section-code">EMBLEMAS // CATÁLOGO</span><h2>Criar por arquivo</h2></header><form id="owner-badge-form" class="owner-upload-form"><label>nome<input id="owner-badge-name" maxlength="60"></label><label>slug<input id="owner-badge-slug" maxlength="50" placeholder="veterano"></label><label class="wide">descrição<input id="owner-badge-description" maxlength="300"></label><label class="wide">imagem<input id="owner-badge-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" required></label><button class="primary" type="submit">criar emblema</button></form><div class="owner-badge-list">'+rows+'</div></section>'+
    '<section class="staff-card"><header><span class="section-code">EMBLEMAS // USUÁRIOS</span><h2>Conceder ou retirar</h2></header><form id="owner-badge-grant-form" class="owner-badge-grant"><label>usuário<select id="owner-badge-user">'+users.map(u=>'<option value="'+u.id+'">@'+escapeHtml(u.handle)+'</option>').join('')+'</select></label><label>emblema<select id="owner-badge-id">'+badges.map(b=>'<option value="'+b.id+'">'+escapeHtml(b.name)+'</option>').join('')+'</select></label><div><button class="primary" type="submit" data-grant="1">conceder</button><button type="button" id="owner-badge-revoke">retirar</button></div></form></section></div>';
}
function ownerInhabitantsSection(snapshot){
  const rows=(snapshot.characters||[]).map(entry=>{
    const c=entry.character||{},ai=entry.ai||{},dialogs=entry.dialogues||[];
    return '<article class="owner-character-card" data-character-card="'+c.id+'"><header><div class="character-admin-avatar">'+(characterImage(c)?'<img src="'+escapeAttr(characterImage(c))+'" alt="">':'')+'</div><div><b>'+escapeHtml(c.name||c.slug)+'</b><small>'+escapeHtml(c.slug||'')+' · '+(c.is_active?'ATIVO':'INATIVO')+'</small></div><label class="check"><input data-char-active type="checkbox" '+(c.is_active?'checked':'')+'> ativo</label></header>'+
      '<div class="owner-character-grid"><label>nome<input data-char-name value="'+escapeAttr(c.name||'')+'"></label><label>função<input data-char-role value="'+escapeAttr(c.role||'')+'"></label><label>cor<input data-char-color type="color" value="'+escapeAttr(c.accent_color||'#d8ff3e')+'"></label><label>raridade<input data-char-rarity type="number" min="1" max="1000" value="'+escapeAttr(c.rarity??50)+'"></label><label class="wide">bio<textarea data-char-bio>'+escapeHtml(c.bio||'')+'</textarea></label><label class="wide">personalidade<textarea data-char-personality>'+escapeHtml(c.personality||'')+'</textarea></label><label class="wide">system prompt<textarea data-char-prompt>'+escapeHtml(c.system_prompt||'')+'</textarea></label><label>URL/imagem<input data-char-avatar value="'+escapeAttr(c.avatar_url||c.image_path||'')+'"></label><label>local<input data-char-location value="'+escapeAttr(c.home_location||'')+'"></label><label class="check"><input data-char-ai type="checkbox" '+(c.ai_enabled?'checked':'')+'> IA ligada</label></div><button class="primary" data-char-save="'+c.id+'">salvar habitante</button>'+
      '<details class="owner-ai-panel"><summary>IA avançada</summary><div class="owner-character-grid"><label>modelo<input data-ai-model value="'+escapeAttr(ai.model||'')+'"></label><label>máx. caracteres<input data-ai-max type="number" min="80" max="1200" value="'+escapeAttr(ai.max_output_chars??420)+'"></label><label class="wide">resumo da persona<textarea data-ai-persona>'+escapeHtml(ai.persona_summary||'')+'</textarea></label><label class="wide">prompt da IA<textarea data-ai-prompt>'+escapeHtml(ai.system_prompt||'')+'</textarea></label></div><button data-ai-save="'+c.id+'">salvar IA</button></details>'+
      '<details class="owner-dialogue-panel"><summary>Frases roteirizadas ('+dialogs.length+')</summary><div class="owner-dialogue-list">'+dialogs.map(d=>'<div><code>'+escapeHtml(d.context)+'</code><span>'+escapeHtml(d.body)+'</span><small>peso '+d.weight+(d.enabled?' · ativo':' · pausado')+'</small></div>').join('')+'</div><form data-dialogue-form="'+c.id+'"><input data-dialogue-context placeholder="contexto" required><textarea data-dialogue-body maxlength="420" placeholder="frase" required></textarea><input data-dialogue-weight type="number" min="1" max="100" value="10"><button type="submit">adicionar frase</button></form></details></article>';
  }).join('');
  return '<section class="staff-card"><header><span class="section-code">HABITANTES // PERSONALIDADE + IA + FRASES</span><h2>Mundo editável</h2></header><form id="owner-character-create" class="owner-character-create"><input id="new-char-slug" placeholder="slug" required><input id="new-char-name" placeholder="nome" required><input id="new-char-role" placeholder="função" required><button class="primary" type="submit">novo habitante</button></form><div class="owner-character-list">'+rows+'</div></section>';
}
function ownerDatabaseSection(){
  const tables=['profiles','posts','reports','moderation_hits','characters','asset_catalog','badges','site_content_blocks','admin_audit_log'];
  return '<section class="staff-card"><header><span class="section-code">DATABASE // OWNER SAFE MODE</span><h2>Explorador do banco</h2><p>Consulta direta às tabelas permitidas. SQL arbitrário e chave service-role não são expostos no navegador, porque isso seria entregar a sala-cofre junto com o crachá.</p></header><div class="owner-db-toolbar"><select id="owner-db-table">'+tables.map(t=>'<option>'+t+'</option>').join('')+'</select><input id="owner-db-limit" type="number" min="1" max="100" value="50"><button id="owner-db-load" class="primary">consultar</button></div><pre id="owner-db-output">selecione uma tabela.</pre></section>';
}
function ownerWorldSection(){
  const w=state.world.settings||{};
  return '<section class="staff-card"><header><span class="section-code">MUNDO // OWNER</span><h2>Controles globais dos habitantes</h2></header><label class="staff-switch"><input id="admin-world-events" type="checkbox" '+(w.world_events_enabled?'checked':'')+'><span><b>eventos do mundo</b><small>habilita eventos globais</small></span></label><label class="staff-switch"><input id="admin-world-interventions" type="checkbox" '+(w.world_interventions_enabled?'checked':'')+'><span><b>interferências visuais</b><small>permite intervenções do Mundo</small></span></label><label class="wide">mensagem do sistema<textarea id="admin-world-message" maxlength="240">'+escapeHtml(w.message||'')+'</textarea></label><button id="admin-world-save" class="primary">salvar Mundo</button></section>';
}
function renderStaffAudit(snapshot){
  const rows=(snapshot.audit||[]).map(a=>'<article class="staff-audit-row"><b>'+escapeHtml(a.action||'ação')+'</b><span>'+escapeHtml(a.target_type||'sistema')+' · '+escapeHtml(String(a.target_id||'').slice(0,20))+'</span><time>'+ago(a.created_at)+'</time></article>').join('')||'<p class="staff-empty">Nenhum registro disponível para seu cargo.</p>';
  return '<section class="staff-card"><header><span class="section-code">AUDITORIA // STAFF</span><h2>Registro administrativo</h2></header><div class="staff-audit-list">'+rows+'</div></section>';
}
async function staffSaveReport(reportId,claimSelf=false){
  const card=document.querySelector('[data-report-card="'+CSS.escape(reportId)+'"]');
  if(!card)return;
  const get=name=>card.querySelector('[data-report-field="'+name+'"]');
  const assigned=claimSelf?state.profile.id:(get('assigned_to')?.value||null);
  const status=claimSelf?'em_analise':(get('status')?.value||'aberto');
  const {error}=await supabase.rpc('staff_update_report',{
    p_report_id:reportId,p_status:status,p_assigned_to:assigned,
    p_priority:get('priority')?.value||null,p_staff_notes:get('staff_notes')?.value||null,p_resolution:get('resolution')?.value||null
  });
  if(error)return toast('A denúncia recusou a atualização.');
  toast(claimSelf?'Denúncia assumida.':'Denúncia atualizada.');
  renderAdminDashboard();
}
function ensureStaffUserDialog(){
  let d=$('#staff-user-action-dialog');if(d)return d;
  d=document.createElement('dialog');d.id='staff-user-action-dialog';d.className='staff-action-dialog';
  d.innerHTML='<form id="staff-user-action-form"><button type="button" class="dialog-close" id="staff-action-close">×</button><span class="section-code" id="staff-action-code">STAFF</span><h2 id="staff-action-title">Ação</h2><div id="staff-action-fields"></div><div class="staff-action-buttons"><button type="button" id="staff-action-cancel">cancelar</button><button class="primary" type="submit">confirmar</button></div></form>';
  document.body.appendChild(d);$('#staff-action-close').onclick=()=>d.close();$('#staff-action-cancel').onclick=()=>d.close();return d;
}
function openStaffBanDialog(userId){
  const d=ensureStaffUserDialog(),u=staffUserMap()[userId]||{};
  d.dataset.mode='ban';d.dataset.userId=userId;
  $('#staff-action-code').textContent='MODERAÇÃO // BAN';
  $('#staff-action-title').textContent='Banir @'+(u.handle||'usuário');
  $('#staff-action-fields').innerHTML='<label>motivo<textarea id="staff-ban-reason" maxlength="500" required></textarea></label><label>duração<select id="staff-ban-duration"><option value="1">1 hora</option><option value="24">24 horas</option><option value="168">7 dias</option><option value="720">30 dias</option><option value="permanent">permanente</option></select></label>';
  $('#staff-user-action-form').onsubmit=submitStaffUserAction;if(!d.open)d.showModal();
}
function openStaffNotifyDialog(userId){
  const d=ensureStaffUserDialog(),u=staffUserMap()[userId]||{};
  d.dataset.mode='notify';d.dataset.userId=userId;
  $('#staff-action-code').textContent='STAFF // NOTIFICAÇÃO DIRETA';
  $('#staff-action-title').textContent='Notificar @'+(u.handle||'usuário');
  $('#staff-action-fields').innerHTML='<label>título<input id="staff-notify-title" maxlength="100" value="Mensagem da Staff"></label><label>gravidade<select id="staff-notify-severity"><option value="info">informação</option><option value="warning">advertência</option><option value="critical">crítica</option></select></label><label>mensagem<textarea id="staff-notify-body" maxlength="600" required></textarea></label>';
  $('#staff-user-action-form').onsubmit=submitStaffUserAction;if(!d.open)d.showModal();
}
async function submitStaffUserAction(e){
  e.preventDefault();const d=$('#staff-user-action-dialog'),mode=d.dataset.mode,userId=d.dataset.userId;if(!userId)return;
  let result;
  if(mode==='ban'){
    const reason=String($('#staff-ban-reason')?.value||'').trim(),duration=$('#staff-ban-duration')?.value||'24';
    if(reason.length<2)return toast('Informe o motivo.');
    const until=duration==='permanent'?null:new Date(Date.now()+Number(duration)*3600000).toISOString();
    result=await supabase.rpc('staff_set_user_ban',{p_user_id:userId,p_banned:true,p_reason:reason,p_until:until});
  }else{
    const title=String($('#staff-notify-title')?.value||'').trim(),body=String($('#staff-notify-body')?.value||'').trim(),severity=$('#staff-notify-severity')?.value||'info';
    if(title.length<2||body.length<2)return toast('Título e mensagem são obrigatórios.');
    result=await supabase.rpc('staff_notify_user',{p_user_id:userId,p_title:title,p_body:body,p_severity:severity});
  }
  if(result.error)return toast(mode==='ban'?'O ban não foi aplicado.':'A notificação não foi enviada.');
  d.close();toast(mode==='ban'?'Ban aplicado e registrado.':'Notificação enviada diretamente.');renderAdminDashboard();
}
async function staffUnban(userId){
  const {error}=await supabase.rpc('staff_set_user_ban',{p_user_id:userId,p_banned:false,p_reason:'',p_until:null});
  if(error)return toast('Não foi possível reativar o usuário.');toast('Usuário reativado.');renderAdminDashboard();
}
async function staffDeleteContent(kind,id){
  if(!confirm('Remover este conteúdo público? A ação ficará na auditoria.'))return;
  const {error}=await supabase.rpc('staff_delete_public_content',{p_kind:kind,p_id:id});
  if(error)return toast('A Staff não conseguiu remover esse conteúdo.');
  toast('Conteúdo removido.');await loadStaffPublicContent();renderAdminDashboard();
}
async function staffSaveTerm(e){
  e.preventDefault();
  const id=$('#staff-term-id')?.value||null,term=String($('#staff-term-text')?.value||'').trim();
  const {error}=await supabase.rpc('staff_upsert_moderation_term',{p_id:id||null,p_term:term,p_category:$('#staff-term-category')?.value||'outro',p_severity:$('#staff-term-severity')?.value||'media',p_enabled:Boolean($('#staff-term-enabled')?.checked),p_notes:$('#staff-term-notes')?.value||''});
  if(error)return toast('O termo não foi salvo.');
  toast('Watchlist atualizada. O servidor não dorme, invejável.');renderAdminDashboard();
}
function staffEditTerm(id){
  const t=(state.staffSnapshot?.terms||[]).find(x=>x.id===id);if(!t)return;
  $('#staff-term-id').value=t.id;$('#staff-term-text').value=t.term;$('#staff-term-category').value=t.category;$('#staff-term-severity').value=t.severity;$('#staff-term-enabled').checked=t.enabled;$('#staff-term-notes').value=t.notes||'';$('#staff-term-text').focus();
}
async function staffSaveHit(id){
  const status=document.querySelector('[data-hit-status="'+id+'"]')?.value||'novo',assigned=document.querySelector('[data-hit-assignee="'+id+'"]')?.value||null;
  const {error}=await supabase.rpc('staff_update_moderation_hit',{p_hit_id:Number(id),p_status:status,p_assigned_to:assigned});
  if(error)return toast('O sinal não foi atualizado.');toast('Sinal atualizado.');renderAdminDashboard();
}
async function staffSendChat(e){
  e.preventDefault();const input=$('#staff-chat-input'),body=String(input?.value||'').trim();if(!body)return;
  const {error}=await supabase.from('staff_messages').insert({sender_id:state.profile.id,scope:state.staffChatScope||'all',body});
  if(error)return toast('A mensagem interna não foi enviada.');
  input.value='';loadStaffChat(state.staffChatScope);
}
async function staffSetRole(userId,role){
  const {error}=await supabase.rpc('staff_set_role',{p_user_id:userId,p_role:role});
  if(error)return toast('Seu cargo não permite essa alteração.');
  toast('Cargo atualizado.');await loadAdminAccess();renderAdminDashboard();
}
async function staffWarn(userId){
  const reason=prompt('Motivo da advertência ao membro da Staff:','')||'';if(reason.trim().length<2)return;
  const {error}=await supabase.rpc('staff_warn_staff',{p_user_id:userId,p_reason:reason.trim()});
  if(error)return toast('Não foi possível aplicar a advertência.');toast('Advertência registrada.');renderAdminDashboard();
}
async function saveOwnerExperience(e){
  e.preventDefault();
  const feed={page_size:Number($('#owner-feed-page-size').value),show_stories:$('#owner-feed-stories').checked,show_tower:$('#owner-feed-tower').checked};
  const stories={duration_hours:Number($('#owner-story-hours').value),camera_enabled:$('#owner-story-camera').checked,max_video_seconds:Number($('#owner-story-video').value),default_visibility:$('#owner-story-visibility').value};
  const layout={density:$('#owner-layout-density').value,feed_width:$('#owner-layout-width').value,sidebar_mode:$('#owner-layout-sidebar').value};
  const {data,error}=await supabase.rpc('owner_update_experience_settings',{p_feed_config:feed,p_story_config:stories,p_layout_config:layout});
  if(error)return toast('As configurações de experiência não foram salvas.');
  state.siteSettings=data;applySiteSettings(data);toast('Feed, stories e layout atualizados globalmente.');renderAdminDashboard();
}
async function saveCmsBlock(page,key,kind,value){
  const {error}=await supabase.rpc('owner_save_cms_block',{p_page_slug:page,p_block_key:key,p_kind:kind,p_value:value,p_enabled:true,p_sort_order:100});
  if(error)return toast('O bloco CMS não foi salvo.');
  await loadPublicExperience();toast('Página atualizada globalmente.');renderAdminDashboard();
}
async function ownerUploadToAssets(file,folder){
  if(!file)return null;
  if(file.size>10*1024*1024)throw new Error('file_too_large');
  const safe=safeFileName(file.name),path=state.profile.id+'/'+folder+'/'+Date.now()+'-'+crypto.randomUUID()+'-'+safe;
  const {error}=await supabase.storage.from('avesso-assets').upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type});
  if(error)throw error;return path;
}
async function submitOwnerAsset(e){
  e.preventDefault();const file=$('#owner-asset-file')?.files?.[0];if(!file)return;
  const kind=$('#owner-asset-kind').value,name=String($('#owner-asset-name').value||file.name).trim(),slug=String($('#owner-asset-slug').value||name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,60),token=String($('#owner-asset-token').value||'').trim()||null;
  try{
    const storage=await ownerUploadToAssets(file,kind);
    const {error}=await supabase.rpc('owner_upsert_asset',{p_id:null,p_kind:kind,p_slug:slug,p_name:name,p_storage_path:storage,p_token:token,p_metadata:{},p_active:true});
    if(error)throw error;
    await loadPublicExperience();toast('Asset enviado e registrado.');renderAdminDashboard();
  }catch(err){console.error(err);toast('O asset não foi salvo. Verifique arquivo e slug.');}
}
async function submitOwnerBadge(e){
  e.preventDefault();const file=$('#owner-badge-file')?.files?.[0];if(!file)return;
  const name=String($('#owner-badge-name').value||'').trim(),slug=String($('#owner-badge-slug').value||name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,50);
  try{
    const storage=await ownerUploadToAssets(file,'badges');
    const {error}=await supabase.rpc('owner_upsert_badge',{p_id:null,p_slug:slug,p_name:name,p_description:$('#owner-badge-description').value||'',p_image_path:storage,p_active:true});
    if(error)throw error;
    await loadPublicExperience();toast('Emblema criado.');renderAdminDashboard();
  }catch(err){console.error(err);toast('O emblema não foi criado.');}
}
async function ownerToggleBadge(grant){
  const user=$('#owner-badge-user')?.value,badge=$('#owner-badge-id')?.value;if(!user||!badge)return;
  const {error}=await supabase.rpc('owner_grant_badge',{p_user_id:user,p_badge_id:badge,p_grant:grant});
  if(error)return toast('O emblema não foi alterado.');await loadPublicExperience();toast(grant?'Emblema concedido.':'Emblema retirado.');renderAdminDashboard();
}
async function ownerSaveCharacter(id){
  const card=document.querySelector('[data-character-card="'+id+'"]');if(!card)return;
  const patch={name:card.querySelector('[data-char-name]').value,role:card.querySelector('[data-char-role]').value,bio:card.querySelector('[data-char-bio]').value,personality:card.querySelector('[data-char-personality]').value,system_prompt:card.querySelector('[data-char-prompt]').value,accent_color:card.querySelector('[data-char-color]').value,avatar_url:card.querySelector('[data-char-avatar]').value,home_location:card.querySelector('[data-char-location]').value,rarity:Number(card.querySelector('[data-char-rarity]').value),ai_enabled:card.querySelector('[data-char-ai]').checked,is_active:card.querySelector('[data-char-active]').checked};
  const {error}=await supabase.rpc('owner_update_character',{p_character_id:id,p_patch:patch});
  if(error)return toast('O habitante resistiu à reprogramação.');toast('Habitante atualizado.');await loadWorldState();renderAdminDashboard();
}
async function ownerSaveCharacterAi(id){
  const card=document.querySelector('[data-character-card="'+id+'"]');if(!card)return;
  const current=(state.staffSnapshot?.characters||[]).find(x=>x.character?.id===id)?.ai||{};
  const {error}=await supabase.rpc('owner_upsert_character_ai',{p_character_id:id,p_model:card.querySelector('[data-ai-model]').value||'gpt-5.6',p_persona_summary:card.querySelector('[data-ai-persona]').value||'',p_system_prompt:card.querySelector('[data-ai-prompt]').value||'',p_behavior_rules:current.behavior_rules||{},p_voice_rules:current.voice_rules||{},p_max_output_chars:Number(card.querySelector('[data-ai-max]').value)||420,p_ai_enabled:card.querySelector('[data-char-ai]').checked});
  if(error)return toast('A configuração da IA não foi salva.');toast('IA do habitante atualizada.');renderAdminDashboard();
}
async function ownerCreateCharacter(e){
  e.preventDefault();const {error}=await supabase.rpc('owner_create_character',{p_slug:$('#new-char-slug').value,p_name:$('#new-char-name').value,p_role:$('#new-char-role').value,p_bio:'',p_accent_color:'#d8ff3e'});
  if(error)return toast('Não foi possível criar o habitante. Verifique o slug.');toast('Novo habitante criado.');await loadWorldState();renderAdminDashboard();
}
async function ownerAddDialogue(e){
  e.preventDefault();const form=e.currentTarget,id=form.dataset.dialogueForm;
  const {error}=await supabase.rpc('owner_save_character_dialogue',{p_id:null,p_character_id:id,p_context:form.querySelector('[data-dialogue-context]').value,p_body:form.querySelector('[data-dialogue-body]').value,p_weight:Number(form.querySelector('[data-dialogue-weight]').value)||10,p_enabled:true});
  if(error)return toast('A frase não foi salva.');toast('Frase adicionada.');await loadWorldState();renderAdminDashboard();
}
async function ownerLoadDb(){
  const table=$('#owner-db-table')?.value,limit=Number($('#owner-db-limit')?.value)||50,out=$('#owner-db-output');if(!out)return;
  out.textContent='consultando...';
  const {data,error}=await supabase.rpc('owner_db_table_rows',{p_table:table,p_limit:limit});
  out.textContent=error?'ERRO // '+error.message:JSON.stringify(data,null,2);
}
async function renderAdminDashboard(){
  if(state.tab!=='admin')return;
  if(!state.isAdmin){await goToFeedHome();return;}
  $('#feed-status').classList.add('hidden');
  const host=$('#feed-list');
  host.innerHTML='<section class="staff-dashboard-shell"><div class="admin-loading">STAFF.SYS // carregando permissões e separando poderes antes que humanos descubram outro menu...</div></section>';
  const {data,error}=await supabase.rpc('staff_dashboard_snapshot');
  if(state.tab!=='admin')return;
  if(error){
    console.error('staff dashboard',error);
    host.innerHTML='<section class="staff-dashboard-shell"><div class="admin-error">A dashboard não conseguiu validar seu cargo.</div></section>';
    return;
  }
  state.staffSnapshot=data||{};
  state.staffRole=data?.role||state.staffRole;
  state.staffRank=staffRankValue(state.staffRole);
  state.adminRole=state.staffRole;
  const allowed=staffSectionsForRole();
  if(!allowed.includes(state.staffSection))state.staffSection='overview';
  if(state.staffSection==='users')await loadStaffPublicContent();
  const sectionRender={
    overview:()=>renderStaffOverview(state.staffSnapshot),
    reports:()=>renderStaffReports(state.staffSnapshot),
    users:()=>renderStaffUsers(state.staffSnapshot),
    monitor:()=>renderStaffMonitor(state.staffSnapshot),
    plaza:()=>renderStaffPlaza(state.staffSnapshot),
    chat:()=>renderStaffChat(),
    team:()=>renderStaffTeam(state.staffSnapshot),
    appearance:()=>ownerAppearanceSection(state.staffSnapshot),
    pages:()=>ownerPagesSection(state.staffSnapshot),
    assets:()=>ownerAssetsSection(state.staffSnapshot),
    badges:()=>ownerBadgesSection(state.staffSnapshot),
    inhabitants:()=>ownerInhabitantsSection(state.staffSnapshot),
    database:()=>ownerDatabaseSection(),
    world:()=>ownerWorldSection(),
    audit:()=>renderStaffAudit(state.staffSnapshot)
  };
  const roleText=staffRoleLabel(state.staffRole);
  host.innerHTML='<section class="staff-dashboard-shell">'+staffDashboardHero()+
    '<div class="staff-dashboard-layout"><aside class="staff-dashboard-nav"><div class="staff-nav-role"><span>'+escapeHtml(roleText)+'</span><small>@'+escapeHtml(state.profile.handle)+'</small></div>'+
    allowed.map(staffSectionButton).join('')+'</aside><main class="staff-dashboard-content" id="staff-dashboard-content">'+(sectionRender[state.staffSection]?.()||'')+'</main></div></section>';

  $('#staff-dashboard-refresh')?.addEventListener('click',()=>renderAdminDashboard());
  host.querySelectorAll('[data-staff-section]').forEach(b=>b.onclick=()=>{state.staffSection=b.dataset.staffSection;renderAdminDashboard();});
  host.querySelectorAll('[data-staff-jump]').forEach(b=>b.onclick=()=>{state.staffSection=b.dataset.staffJump;renderAdminDashboard();});
  host.querySelectorAll('[data-report-save]').forEach(b=>b.onclick=()=>staffSaveReport(b.dataset.reportSave,false));
  host.querySelectorAll('[data-report-claim]').forEach(b=>b.onclick=()=>staffSaveReport(b.dataset.reportClaim,true));
  host.querySelectorAll('[data-staff-ban]').forEach(b=>b.onclick=()=>openStaffBanDialog(b.dataset.staffBan));
  host.querySelectorAll('[data-staff-unban]').forEach(b=>b.onclick=()=>staffUnban(b.dataset.staffUnban));
  host.querySelectorAll('[data-staff-notify-user]').forEach(b=>b.onclick=()=>openStaffNotifyDialog(b.dataset.staffNotifyUser));
  host.querySelectorAll('[data-staff-delete-kind]').forEach(b=>b.onclick=()=>staffDeleteContent(b.dataset.staffDeleteKind,b.dataset.staffDeleteId));
  host.querySelectorAll('[data-staff-team-jump]').forEach(b=>b.onclick=()=>{state.staffSection='team';renderAdminDashboard();});
  $('#staff-term-form')?.addEventListener('submit',staffSaveTerm);
  host.querySelectorAll('[data-term-edit]').forEach(b=>b.onclick=()=>staffEditTerm(b.dataset.termEdit));
  host.querySelectorAll('[data-hit-save]').forEach(b=>b.onclick=()=>staffSaveHit(b.dataset.hitSave));
  host.querySelectorAll('[data-staff-role-user]').forEach(select=>select.onchange=()=>staffSetRole(select.dataset.staffRoleUser,select.value));
  host.querySelectorAll('[data-staff-warning]').forEach(b=>b.onclick=()=>staffWarn(b.dataset.staffWarning));
  host.querySelectorAll('[data-staff-chat-scope]').forEach(b=>b.onclick=()=>{state.staffChatScope=b.dataset.staffChatScope;loadStaffChat(state.staffChatScope);host.querySelectorAll('[data-staff-chat-scope]').forEach(x=>x.classList.toggle('active',x===b));});
  $('#staff-chat-form')?.addEventListener('submit',staffSendChat);

  if(state.staffRole==='owner'){
    $('#admin-site-save')?.addEventListener('click',saveAdminSiteSettings);
    host.querySelectorAll('[data-admin-preset]').forEach(b=>b.onclick=()=>adminApplyPreset(b.dataset.adminPreset));
    host.querySelectorAll('[data-admin-color-var]').forEach(input=>input.oninput=()=>document.documentElement.style.setProperty(input.dataset.adminColorVar,input.value));
    $('#owner-experience-form')?.addEventListener('submit',saveOwnerExperience);
    host.querySelectorAll('[data-cms-save]').forEach(b=>b.onclick=()=>{const row=b.closest('[data-cms-row]');saveCmsBlock(b.dataset.page,b.dataset.key,b.dataset.kind,row?.querySelector('[data-cms-value]')?.value||'');});
    $('#cms-new-form')?.addEventListener('submit',e=>{e.preventDefault();saveCmsBlock($('#cms-new-page').value,$('#cms-new-key').value,$('#cms-new-kind').value,$('#cms-new-value').value);});
    $('#owner-asset-form')?.addEventListener('submit',submitOwnerAsset);
    $('#owner-badge-form')?.addEventListener('submit',submitOwnerBadge);
    $('#owner-badge-grant-form')?.addEventListener('submit',e=>{e.preventDefault();ownerToggleBadge(true);});
    $('#owner-badge-revoke')?.addEventListener('click',()=>ownerToggleBadge(false));
    host.querySelectorAll('[data-char-save]').forEach(b=>b.onclick=()=>ownerSaveCharacter(b.dataset.charSave));
    host.querySelectorAll('[data-ai-save]').forEach(b=>b.onclick=()=>ownerSaveCharacterAi(b.dataset.aiSave));
    host.querySelectorAll('[data-dialogue-form]').forEach(form=>form.onsubmit=ownerAddDialogue);
    $('#owner-character-create')?.addEventListener('submit',ownerCreateCharacter);
    $('#owner-db-load')?.addEventListener('click',ownerLoadDb);
    $('#admin-world-save')?.addEventListener('click',saveAdminWorldControls);
  }
  bindProfileLinks();
  decorateIdentityNodes(host);
  if(state.staffSection==='chat'){
    startStaffChatRealtime();
    loadStaffChat(state.staffChatScope||'all');
  }
}

function applyAppTabLayout(){
  const worldOpen=['residents','plaza','tower','profile','public_profile','messages','admin'].includes(state.tab);
  document.body.classList.toggle('avesso-feed-home',state.tab==='feed');
  document.body.classList.toggle('avesso-own-corner',state.tab==='profile');
  $('#app-view')?.classList.toggle('inhabitants-open',worldOpen);
  $('.composer')?.classList.toggle('hidden',worldOpen||state.tab==='profile');
  $('#stories-zone')?.classList.toggle('hidden',state.tab!=='feed');
  $('.feed-header')?.classList.toggle('hidden',worldOpen);
  $('#refresh-feed')?.classList.toggle('hidden',worldOpen||state.tab==='profile');
  applyAppWallpaper();
}
document.querySelectorAll('[data-app-tab]').forEach(b=>b.onclick=async()=>{
  const previousTab=state.tab;
  const nextTab=b.dataset.appTab;
  if(nextTab==='admin'&&!state.isAdmin){toast('Painel administrativo restrito. O porteiro digital finalmente tem uma função.');return;}
  if(previousTab==='plaza'&&nextTab!=='plaza')stopPlazaRealtime();
  if(previousTab==='public_profile'&&nextTab!=='public_profile')stopCornerMusic();
  if(nextTab!=='messages')autoMinimizeChat();
  state.tab=nextTab;
  applyAppWallpaper();
  bumpView();
  document.querySelectorAll('[data-app-tab]').forEach(x=>x.classList.toggle('active',x===b));
  const headings={feed:'Quem precisa ser visto?',quiet:'Quem ficou falando sozinho?',sent:'O que você entregou',profile:'Seu canto, sem palco',residents:'Mundo deles',plaza:'Praça Central',tower:'Torre do Engajamento',messages:'Amigos & cúmplices',admin:'Painel do administrador'};
  $('#feed-heading').textContent=headings[state.tab]||'AVESSO';
  applyAppTabLayout();
  trackAction('tab_view',state.tab,{tab:state.tab});
  if(!['plaza','tower'].includes(state.tab))maybeWorldCharacter('tab_view',{action_type:'tab_view',surface:state.tab,metadata:{tab:state.tab}},.14,180000);
  if(state.tab==='profile')renderProfile();
  else if(state.tab==='residents')await renderInhabitantsPage();
  else if(state.tab==='plaza')await renderPlaza();
  else if(state.tab==='tower')await renderTowerPage();
  else if(state.tab==='messages')await renderMessagesPage();
  else if(state.tab==='admin')await renderAdminDashboard();
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
function towerFallbackEvent(){
  return {title:'VIDA REAL É BETA',description:'O produto final segue sem previsão. O Rei recomenda conversar com alguém antes que isso vire feature paga.',config:{kind:'campanha',cta:'subir na torre',importance:'normal'}};
}
function kingEventKind(event){return String(event?.config?.kind||'campanha').toUpperCase();}
function renderTowerEventCard(event=towerFallbackEvent()){
  const box=$('#tower-live');if(!box)return;
  const safeEvent=event||towerFallbackEvent();
  box.innerHTML=`<div class="tower-crown">♛</div><span class="section-code">TORRE DO ENGAJAMENTO // ${escapeHtml(kingEventKind(safeEvent))}</span><h3>${escapeHtml(safeEvent.title||'Mensagem do Rei')}</h3><p>${escapeHtml(safeEvent.description||'O Rei está preparando uma campanha desnecessariamente estratégica.')}</p><small class="tower-event-cta">→ ${escapeHtml(safeEvent.config?.cta||'subir na torre')}</small><button id="open-tower">subir na torre →</button>`;
  $('#open-tower').onclick=()=>document.querySelector('[data-app-tab="tower"]')?.click();
}
async function latestKingEvents(limit=6){
  const {data}=await supabase.from('world_events').select('*')
    .eq('status','active')
    .contains('config',{creator:'rei_engajamento'})
    .order('created_at',{ascending:false})
    .limit(limit);
  return data||[];
}
async function refreshKingBroadcast({ensure=false}={}){
  if(!state.session||!state.profile)return null;
  let event=null;
  if(ensure){
    try{
      const {data,error}=await supabase.functions.invoke('king-broadcast',{body:{}});
      if(!error)event=data?.event||null;
    }catch{}
  }
  if(!event)event=(await latestKingEvents(1))[0]||null;
  renderTowerEventCard(event||towerFallbackEvent());
  return event;
}
function scheduleTowerPulse(){
  clearTimeout(state.world.towerTimer);
  if(!state.session)return;
  const run=async()=>{
    await refreshKingBroadcast({ensure:true});
    state.world.towerTimer=setTimeout(run,(9+Math.random()*3)*60*1000);
  };
  state.world.towerTimer=setTimeout(run,3500);
}
async function renderTowerPage(){
  if(state.tab!=='tower')return;
  const king=state.world.characters.rei_engajamento;
  $('#feed-status').classList.add('hidden');
  const events=await latestKingEvents(6);
  const featured=events[0]||towerFallbackEvent();
  const cards=events.length?events.map(event=>`<article class="tower-event-card"><b>${escapeHtml(kingEventKind(event))}</b><h3>${escapeHtml(event.title)}</h3><p>${escapeHtml(event.description)}</p><small>→ ${escapeHtml(event.config?.cta||'participar sem formulário')}</small></article>`).join(''):`<article class="tower-event-card"><b>CAMPANHA</b><h3>${escapeHtml(featured.title)}</h3><p>${escapeHtml(featured.description)}</p><small>→ ${escapeHtml(featured.config?.cta||'subir na torre')}</small></article>`;
  $('#feed-list').innerHTML=`<section class="tower-world">
    <div class="tower-header"><span>♛ TORRE DO ENGAJAMENTO</span><h2>PROPAGANDA, CAOS E OPORTUNIDADES™</h2><p>O Rei publica campanhas e eventos aqui. A boa notícia: ele perdeu o direito de aparecer a cada três minutos na sua tela.</p></div>
    <div class="tower-king">${characterVisual(king,'tower-king-hq')}<div><span class="section-code">${escapeHtml(kingEventKind(featured))} // AGORA</span><h3>${escapeHtml(featured.title)}</h3><p>${escapeHtml(featured.description)}</p></div></div>
    <div class="tower-event-feed">${cards}</div>
    <button id="tower-refresh" class="tower-refresh">atualizar boletim da torre</button>
  </section>`;
  renderTowerEventCard(featured);
  trackAction('tower_opened','tower');
  $('#tower-refresh').onclick=async()=>{await refreshKingBroadcast({ensure:true});if(state.tab==='tower')renderTowerPage();};
}

async function acceptedFriendProfiles(){
  if(!state.profile?.id)return[];
  const {data:rels,error:relError}=await supabase.from('friendships').select('requester_id,addressee_id,status')
    .eq('status','accepted')
    .or(`requester_id.eq.${state.profile.id},addressee_id.eq.${state.profile.id}`);
  if(relError){
    console.warn('AVESSO presence friendships',relError);
    return null;
  }
  const ids=[...new Set((rels||[]).map(r=>r.requester_id===state.profile.id?r.addressee_id:r.requester_id).filter(Boolean))];
  if(!ids.length)return[];
  const {data,error}=await supabase.from('profiles').select('*').in('id',ids);
  if(error){
    console.warn('AVESSO presence profiles',error);
    return null;
  }
  return data||[];
}
async function profileById(id){
  const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url,status_message,presence_mode,last_seen,online_until,listening_visible,chat_listening_visible,now_playing_title,now_playing_artist,now_playing_source,now_playing_url,now_playing_updated_at,now_playing_manual,away_after_minutes').eq('id',id).maybeSingle();
  return data||null;
}
function cachedPresenceEntry(profile){
  const mode=presenceView(profile).mode;
  const lastSeen=profile?.last_seen?new Date(profile.last_seen).getTime():0;
  const leaseEnd=profile?.online_until?new Date(profile.online_until).getTime():0;
  return {mode,lastSeen,offlineSince:mode==='offline'?Math.max(lastSeen,leaseEnd||0):0,profile};
}
function shouldNotifyFriendOnline(previous,next){
  if(previous?.mode!=='offline'||next?.mode!=='online')return false;
  const offlineSince=Number(previous.offlineSince||previous.lastSeen||0);
  return Boolean(offlineSince&&Date.now()-offlineSince>=60000);
}
function renderOnlineFriendsDock(){
  const dock=$('#online-friends-dock'),list=$('#online-friends-list'),count=$('#online-friends-count');
  if(!dock||!list||!count||!state.profile)return;
  ageFriendPresenceCache(false);
  const entries=Object.values(state.friendPresence||{})
    .filter(entry=>entry?.profile&&!isPeerBlocked(entry.profile.id))
    .sort((a,b)=>{
      const rank={online:0,away:1,offline:2};
      const d=(rank[a.mode]??9)-(rank[b.mode]??9);
      return d||String(a.profile.display_name||'').localeCompare(String(b.profile.display_name||''),'pt-BR');
    });
  const onlineCount=entries.filter(entry=>entry.mode==='online').length;
  count.textContent=onlineCount;
  if(!state.friendPresenceReady&&!entries.length){
    list.innerHTML='<div class="online-friends-empty online-friends-sync">⌁ sincronizando cúmplices...</div>';
  }else{
    const zeroOnline=entries.length&&onlineCount===0
      ?'<div class="online-friends-empty online-friends-none">◌ ninguém online agora // a rede ficou estranhamente quieta.</div>'
      :'';
    list.innerHTML=zeroOnline+(entries.map(entry=>{
      const friend=entry.profile;
      const np=entry.mode==='offline'?null:nowPlayingView(friend);
      const statusLabel=entry.mode==='online'?'online':entry.mode==='away'?'ausente':'offline';
      return `<button class="online-friend-item ${entry.mode}" data-online-friend="${friend.id}" type="button">
        <span class="online-friend-avatar">${avatarHtml(friend.avatar_url,friend.display_name)}</span>
        <span class="online-friend-copy"><b>${escapeHtml(friend.display_name)}</b><small>@${escapeHtml(friend.handle)}</small><strong><i class="presence-dot ${entry.mode}"></i> ${statusLabel}</strong><span class="online-friend-status-message">${escapeHtml(friend.status_message||'sem status. provavelmente ocupado existindo.')}</span><em>${np?`♫ ${escapeHtml(np.title)}`:entry.mode==='offline'?'◌ fora da rede':'♫ silêncio detectado'}</em></span>
      </button>`;
    }).join('')||'<div class="online-friends-empty">Nenhum cúmplice adicionado ainda. Estatisticamente tranquilo.</div>');
  }
  list.querySelectorAll('[data-online-friend]').forEach(b=>b.onclick=()=>openQuickFriendChat(b.dataset.onlineFriend));
  dock.classList.remove('hidden');
  dock.classList.toggle('collapsed',state.onlineDockCollapsed);
  $('#online-friends-toggle')?.setAttribute('aria-expanded',String(!state.onlineDockCollapsed));
}
function setupOnlineFriendsDock(){
  state.onlineDockCollapsed=window.matchMedia('(max-width:760px)').matches;
  const toggle=$('#online-friends-toggle');
  if(toggle)toggle.onclick=()=>{
    state.onlineDockCollapsed=!state.onlineDockCollapsed;
    renderOnlineFriendsDock();
  };
  renderOnlineFriendsDock();
}
async function refreshFriendPresenceCache({notify=true}={}){
  const friends=(await acceptedFriendProfiles())||[];
  if(friends===null){
    state.friendPresenceReady=Object.keys(state.friendPresence||{}).length>0;
    renderOnlineFriendsDock();
    return false;
  }
  const next={};
  for(const friend of friends){
    const previous=state.friendPresence[friend.id];
    const entry=cachedPresenceEntry(friend);
    next[friend.id]=entry;
    if(notify&&shouldNotifyFriendOnline(previous,entry)&&!isPeerMuted(friend.id)&&onlineNoticeAllowed(friend.id)){
      socialNotify({
        title:`${friend.display_name||'Um amigo'} entrou no AVESSO`,
        body:'Online agora. Uma notificação basta; o modem não precisa de bis.',
        avatar:friend.avatar_url||'',
        kind:'online',
        action:()=>openQuickFriendChat(friend.id)
      });
    }
    if(state.chatWindowOpen&&state.directPeerId===friend.id)updateChatPeerHeader(friend);
  }
  state.friendPresence=next;
  state.friendPresenceReady=true;
  renderOnlineFriendsDock();
  return true;
}
async function primeFriendPresenceCache(){
  state.friendPresenceReady=false;
  renderOnlineFriendsDock();
  const ok=await refreshFriendPresenceCache({notify:false});
  if(!ok)setTimeout(()=>refreshFriendPresenceCache({notify:false}),2500);
}
function ageFriendPresenceCache(render=true){
  Object.values(state.friendPresence||{}).forEach(entry=>{
    if(entry?.profile)entry.mode=presenceView(entry.profile).mode;
  });
  if(render)renderOnlineFriendsDock();
}
function startFriendPresenceWatch(){
  clearInterval(state.presenceWatchTimer);
  ageFriendPresenceCache();
  refreshFriendPresenceCache({notify:false});
  state.presenceWatchTimer=setInterval(()=>refreshFriendPresenceCache({notify:true}),8000);
}
function onlineNoticeAllowed(profileId){
  const key=`avesso.online.notice.${profileId}`;
  const last=Number(state.onlineNoticeAt?.[profileId]||localStorage.getItem(key)||0);
  if(Date.now()-last<3*60*1000)return false;
  state.onlineNoticeAt[profileId]=Date.now();
  try{localStorage.setItem(key,String(Date.now()));}catch{}
  return true;
}
function noteFriendPresence(profile){
  if(!profile?.id||!Object.prototype.hasOwnProperty.call(state.friendPresence,profile.id))return;
  const prev=state.friendPresence[profile.id];
  const next=cachedPresenceEntry(profile);
  state.friendPresence[profile.id]=next;
  renderOnlineFriendsDock();
  if(state.chatWindowOpen&&state.directPeerId===profile.id)updateChatPeerHeader(profile);
  if(shouldNotifyFriendOnline(prev,next)&&!isPeerMuted(profile.id)&&onlineNoticeAllowed(profile.id)){
    socialNotify({
      title:`${profile.display_name||'Um amigo'} entrou no AVESSO`,
      body:'Online agora. Uma notificação basta; o modem não precisa de bis.',
      avatar:profile.avatar_url||'',
      kind:'online',
      action:()=>openQuickFriendChat(profile.id)
    });
  }
}
function stopDirectRealtime({resetWatch=true}={}){
  clearTimeout(state.directReconnectTimer);state.directReconnectTimer=null;
  clearInterval(state.directPollTimer);state.directPollTimer=null;
  if(resetWatch){
    state.directWatchStartedAt=null;
    state.directSeenIds=new Set();
  }
  const channel=state.directChannel;
  state.directChannel=null;
  state.directChannelStatus='CLOSED';
  if(channel)supabase.removeChannel(channel);
}
function rememberDirectMessage(id){
  if(!id)return false;
  if(state.directSeenIds.has(id))return false;
  state.directSeenIds.add(id);
  if(state.directSeenIds.size>400){
    const first=state.directSeenIds.values().next().value;
    state.directSeenIds.delete(first);
  }
  return true;
}
function scheduleDirectReconnect(){
  if(state.directReconnectTimer||!state.profile?.id||!state.directWatchStartedAt)return;
  state.directReconnectTimer=setTimeout(()=>{
    state.directReconnectTimer=null;
    if(state.directChannel){supabase.removeChannel(state.directChannel);state.directChannel=null;}
    startDirectRealtime();
  },1400);
}
async function directAttachmentUrl(path){
  if(!path)return'';
  const cached=state.directAttachmentUrlCache[path];
  if(cached&&cached.expiresAt>Date.now()+30000)return cached.url;
  const {data}=await supabase.storage.from('avesso-chat').createSignedUrl(path,3600);
  const url=data?.signedUrl||'';
  if(url)state.directAttachmentUrlCache[path]={url,expiresAt:Date.now()+3300000};
  return url;
}
async function hydrateDirectMessage(m){
  if(!m?.attachment_path)return m;
  return {...m,attachment_url:await directAttachmentUrl(m.attachment_path)};
}
function appendDirectMessage(m,{replaceId=null}={}){
  const log=$('#dm-log');if(!log||!m)return;
  if(m.id&&log.querySelector(`[data-dm-id="${CSS.escape(String(m.id))}"]`))return;
  const html=dmMessageHtml(m);
  if(replaceId){
    const old=log.querySelector(`[data-dm-id="${CSS.escape(String(replaceId))}"]`);
    if(old){old.outerHTML=html;log.scrollTop=log.scrollHeight;return;}
  }
  log.querySelector('.dm-empty')?.remove();
  log.insertAdjacentHTML('beforeend',html);
  log.scrollTop=log.scrollHeight;
}
async function markDirectRead(id){
  if(!id||!state.profile?.id)return;
  await supabase.from('direct_messages').update({read_at:new Date().toISOString()}).eq('id',id).eq('recipient_id',state.profile.id).is('read_at',null);
}
function pulseIncomingChat(){
  const win=$('#dm-floating-window');if(!win)return;
  clearTimeout(state.incomingMessagePulseTimer);
  win.classList.remove('incoming-pulse');
  void win.offsetWidth;
  win.classList.add('incoming-pulse');
  state.incomingMessagePulseTimer=setTimeout(()=>win.classList.remove('incoming-pulse'),6200);
}
async function showIncomingChatMinimized(peerId){
  if(!peerId)return;
  state.chatWindowMinimized=true;
  await openChatWindow(peerId,{keepMinimized:true,markRead:false});
  state.chatWindowMinimized=true;
  const win=ensureChatWindow();
  win.classList.add('minimized');
  win.classList.remove('hidden');
  applyChatGeometry();
  pulseIncomingChat();
}
async function receiveIncomingDirectMessage(m,{source='realtime'}={}){
  if(!m?.id||m.recipient_id!==state.profile?.id||m.sender_id===state.profile.id)return;
  if(!rememberDirectMessage(m.id))return;
  const sender=await profileById(m.sender_id);
  const attention=m.message_kind==='attention';
  const muted=isPeerMuted(m.sender_id);
  if(!muted){
    socialNotify({
      title:attention?`${sender?.display_name||'Alguém'} chamou sua atenção`:`Mensagem de ${sender?.display_name||'alguém'}`,
      body:attention?'CHAMAR ATENÇÃO. O protocolo de 2006 foi executado.':(m.message_kind==='image'?'enviou uma imagem':m.message_kind==='audio'?'enviou uma mensagem de voz':m.message_kind==='file'?'enviou um arquivo':String(m.body||'').slice(0,90)),
      avatar:sender?.avatar_url||'',
      kind:attention?'attention':'message',
      sound:!attention,
      action:()=>openFriendChat(m.sender_id)
    });
  }

  const sameChat=state.chatWindowOpen&&state.directPeerId===m.sender_id;
  if(attention&&!muted){
    await receiveAttention(m.sender_id,m);
  }else if(sameChat){
    const hydrated=await hydrateDirectMessage(m);
    appendDirectMessage(hydrated);
    if(state.chatWindowMinimized){
      pulseIncomingChat();
    }else if(!document.hidden&&document.hasFocus()){
      markDirectRead(m.id);
    }
  }else if(!muted){
    await showIncomingChatMinimized(m.sender_id);
  }

  if(state.tab==='messages'&&!sameChat)renderMessagesPage();
}
async function pollDirectInbox(){
  if(!state.profile?.id||!state.directWatchStartedAt)return;
  const {data,error}=await supabase.from('direct_messages')
    .select('*')
    .eq('recipient_id',state.profile.id)
    .is('read_at',null)
    .gt('created_at',state.directWatchStartedAt)
    .order('created_at',{ascending:true})
    .limit(30);
  if(error)return;
  const rows=(data||[]).slice().reverse();
  for(const m of rows)await receiveIncomingDirectMessage(m,{source:'poll'});
  if(rows.length)state.directWatchStartedAt=rows[rows.length-1].created_at;
}
function startDirectFallbackPoll(){
  clearInterval(state.directPollTimer);
  state.directPollTimer=setInterval(()=>pollDirectInbox(),4000);
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
  if(!state.directWatchStartedAt)state.directWatchStartedAt=new Date(Date.now()-1500).toISOString();
  startDirectFallbackPoll();
  const channel=supabase.channel(`avesso-social-${me}-${Date.now()}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`recipient_id=eq.${me}`},payload=>receiveIncomingDirectMessage(payload.new||{}, {source:'realtime'}))
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'direct_messages',filter:`recipient_id=eq.${me}`},payload=>handleDirectMessageMutation(payload.new||{}))
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'direct_messages',filter:`sender_id=eq.${me}`},payload=>handleDirectMessageMutation(payload.new||{}))
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
        renderOnlineFriendsDock();
        socialNotify({title:'Amizade aceita',body:`${who?.display_name||'Alguém'} aceitou. Nenhum contador público foi ferido.`,avatar:who?.avatar_url||'',kind:'friend',action:()=>openFriendChat(f.addressee_id)});
      }
      if(state.tab==='messages')renderMessagesPage();
      if(state.tab==='profile')loadFriendPanel();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles'},payload=>{
      const p=payload.new||{};
      if(p.id!==me)noteFriendPresence(p);
      if(p.id===me){
        state.profile={...state.profile,...p};
        refreshOwnNowPlayingPreview();
        updateOwnListeningInChat();
      }
      if(state.tab==='messages')renderMessagesPage();
      if(state.chatWindowOpen&&state.directPeerId===p.id)updateChatPeerHeader(p);
      if(state.tab==='public_profile'&&state.publicProfileId===p.id){
        const host=$('#public-now-playing');
        if(host)host.innerHTML=nowPlayingHtml(p);
      }
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
    });
  state.directChannel=channel;
  channel.subscribe(status=>{
    if(state.directChannel!==channel)return;
    state.directChannelStatus=status;
    if(status==='SUBSCRIBED')pollDirectInbox();
    if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))scheduleDirectReconnect();
  });
}

async function loadDirectConversation(peerId,{markRead=true}={}){
  if(!peerId)return[];
  const me=state.profile.id;
  const {data,error}=await supabase.from('direct_messages').select('*')
    .or(`and(sender_id.eq.${me},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${me})`)
    .order('created_at',{ascending:false}).limit(250);
  if(error)return[];
  if(markRead){
    await supabase.from('direct_messages').update({read_at:new Date().toISOString()})
      .eq('sender_id',peerId).eq('recipient_id',me).is('read_at',null);
  }
  const rows=(data||[]).slice().reverse();
  rows.forEach(m=>{if(m.recipient_id===me)rememberDirectMessage(m.id);});
  return Promise.all(rows.map(m=>hydrateDirectMessage(m)));
}

async function directMessageForRefresh(messageId){
  const {data,error}=await supabase.from('direct_messages').select('*').eq('id',messageId).maybeSingle();
  if(error||!data)return null;
  return hydrateDirectMessage(data);
}
async function refreshDirectMessageBubble(messageId){
  if(!messageId||!state.chatWindowOpen)return;
  const log=$('#dm-log');if(!log)return;
  const row=await directMessageForRefresh(messageId);
  const old=log.querySelector(`[data-dm-id="${CSS.escape(String(messageId))}"]`);
  if(!row){old?.remove();return;}
  if(old){
    old.outerHTML=dmMessageHtml(row);
    repairLegacyVoicePlayers(log);
  }
}
function dmMessageHtml(m){
  const mine=m.sender_id===state.profile.id;
  const messageId=escapeAttr(String(m.id||`local-${Date.now()}`));
  if(m.message_kind==='attention')return `<article class="dm-attention-event" data-dm-id="${messageId}">⚡ ${escapeHtml(m.body||'CHAMAR ATENÇÃO')} <small>${ago(m.created_at)}</small></article>`;
  if(m.message_kind==='deleted'||m.deleted_at)return `<article class="dm-bubble ${mine?'mine':'theirs'} deleted" data-dm-id="${messageId}"><p class="dm-message-deleted">◌ mensagem apagada</p><small class="dm-message-time">${ago(m.created_at)}</small></article>`;
  const voiceDuration=m.message_kind==='audio'?String(m.body||'').match(/(\d+)s/)?.[1]:null;
  const attachment=m.attachment_url?(m.message_kind==='image'
    ?`<a class="dm-image-link" href="${escapeAttr(m.attachment_url)}" target="_blank" rel="noopener"><img src="${escapeAttr(m.attachment_url)}" alt="${escapeAttr(m.attachment_name||'imagem')}" loading="eager" decoding="async"></a>`
    :m.message_kind==='audio'
      ?`<div class="dm-audio-card"><div class="dm-audio-head"><span>VOICE.MSG</span><small>${voiceDuration?`${voiceDuration}s`:'áudio'}</small></div><audio class="dm-voice-audio" data-voice-type="${escapeAttr(m.attachment_type||'')}" controls preload="metadata"><source src="${escapeAttr(m.attachment_url)}" type="${escapeAttr(m.attachment_type||'audio/wav')}">Seu navegador recusou este áudio.</audio><a class="dm-audio-open" href="${escapeAttr(m.attachment_url)}" target="_blank" rel="noopener">abrir áudio</a></div>`
      :`<a class="dm-file-card" href="${escapeAttr(m.attachment_url)}" target="_blank" rel="noopener"><span>▤</span><b>${escapeHtml(m.attachment_name||'arquivo')}</b><small>${m.attachment_size?Math.ceil(m.attachment_size/1024)+' KB':''}</small></a>`):'';
  const bodyHtml=m.message_kind==='audio'?'':(m.body&&(!m.attachment_path||m.body!==m.attachment_name)?`<p class="dm-message-body">${renderCustomEmoticons(m.body)}</p>`:'');
  return `<article class="dm-bubble ${mine?'mine':'theirs'}" data-dm-id="${messageId}" data-dm-mine="${mine?'1':'0'}">${bodyHtml}${attachment}<small class="dm-message-time">${ago(m.created_at)}</small></article>`;
}
async function handleDirectMessageMutation(row){
  if(!row?.id||!state.chatWindowOpen||!state.directPeerId)return;
  const belongs=(row.sender_id===state.profile.id&&row.recipient_id===state.directPeerId)||(row.sender_id===state.directPeerId&&row.recipient_id===state.profile.id);
  if(belongs)await refreshDirectMessageBubble(row.id);
}
async function repairLegacyVoicePlayers(root=document){
  const players=[...root.querySelectorAll?.('.dm-voice-audio')||[]].filter(audio=>!audio.dataset.voiceRepaired&&audio.dataset.voiceType&&audio.dataset.voiceType!=='audio/wav').slice(0,30);
  for(const audio of players){
    audio.dataset.voiceRepaired='working';
    try{
      const source=audio.querySelector('source');
      const src=source?.src||audio.currentSrc;
      if(!src){audio.dataset.voiceRepaired='skip';continue;}
      const response=await fetch(src,{cache:'force-cache'});
      if(!response.ok)throw new Error('voice fetch failed');
      const normalized=await normalizeVoiceBlob(await response.blob());
      if(normalized.type!=='audio/wav')throw new Error('voice normalize failed');
      const local=URL.createObjectURL(normalized.blob);
      audio.dataset.voiceObjectUrl=local;
      audio.innerHTML=`<source src="${escapeAttr(local)}" type="audio/wav">Seu navegador recusou este áudio.`;
      audio.load();
      audio.dataset.voiceRepaired='yes';
    }catch{
      audio.dataset.voiceRepaired='failed';
    }
  }
}
function updateChatPeerHeader(peer){
  if(!peer||state.directPeerId!==peer.id)return;
  const p=presenceView(peer);
  const muted=isPeerMuted(peer.id);
  const title=$('#dm-restore-name');
  if(title){
    title.innerHTML=`<i class="presence-dot ${p.mode}"></i>${escapeHtml(peer.display_name)}${muted?' · 🔇':''}`;
    title.title=`Abrir conversa com ${peer.display_name}`;
  }
  const name=$('#dm-peer-profile-name');if(name)name.textContent=peer.display_name;
  const status=$('#dm-peer-status');
  if(status){
    status.textContent=peer.status_message||'';
    status.title=peer.status_message||'';
    status.classList.toggle('hidden',!peer.status_message);
  }
  const small=$('.dm-peer-heading>small');
  if(small)small.innerHTML=`<i class="presence-dot ${p.mode}"></i> ${p.label} · @${escapeHtml(peer.handle)}${muted?' · mutado':''}`;
  const listening=$('#dm-peer-listening');
  if(listening)listening.innerHTML=chatNowPlayingHtml(peer,{compact:true});
  const orb=$('.dm-msn-status-orb');
  if(orb){orb.className=`dm-msn-status-orb ${p.mode}`;orb.title=p.label;}
}

async function renderMessagesPage(){
  if(state.tab!=='messages')return;
  const friends=(await acceptedFriendProfiles())||[];
  if(state.tab!=='messages')return;
  $('#feed-status').classList.add('hidden');
  $('#feed-list').innerHTML=`<section class="messages-hub">
    <header class="messages-hub-head"><div><span class="section-code">MSN.EXE // AMIZADES HUMANAS</span><h2>Amigos & cúmplices</h2><p>Sua lista de gente que você aceitou voluntariamente. Clique em alguém e a janela aparece, porque 2006 ainda tinha algumas ideias úteis.</p></div>
    <div class="messages-head-controls"><label class="presence-picker">aparecer como <select id="presence-mode-select"><option value="online">● online</option><option value="away">◐ ausente</option><option value="invisible">○ invisível</option></select></label><button id="notification-permission-button" class="notification-permission-button">${notificationPermissionLabel()}</button></div></header>
    <div class="compact-friend-grid">${friends.map(f=>{const p=presenceView(f),muted=isPeerMuted(f.id);return `<button class="compact-friend" data-open-chat="${f.id}" data-identity-profile-id="${f.id}"><span class="mini-avatar">${avatarHtml(f.avatar_url,f.display_name)}</span><span><b>${escapeHtml(f.display_name)}${muted?' <i class="muted-mark">🔇</i>':''}</b><small>@${escapeHtml(f.handle)}</small></span><i class="presence-dot ${p.mode}"></i><em>${p.label}${muted?' · mutado':''}</em></button>`}).join('')||'<div class="dm-empty">Nenhum amigo aceito. Uma lista de contatos vazia é muito minimalista até para nós.</div>'}</div>
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
  const candidates=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm','audio/ogg'];
  return candidates.find(type=>MediaRecorder.isTypeSupported?.(type))||'';
}
async function normalizeVoiceBlob(blob){
  const AudioCtx=window.AudioContext||window.webkitAudioContext;
  if(!AudioCtx||!blob?.size)return{blob,type:blob?.type||'audio/webm',duration:null};
  let ctx;
  try{
    ctx=new AudioCtx();
    const decoded=await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
    const targetRate=16000;
    const frames=Math.max(1,Math.ceil(decoded.duration*targetRate));
    const mono=new Float32Array(frames);
    const channels=decoded.numberOfChannels;
    const ratio=decoded.sampleRate/targetRate;
    const channelData=Array.from({length:channels},(_,i)=>decoded.getChannelData(i));
    for(let i=0;i<frames;i++){
      const pos=i*ratio;
      const i0=Math.min(decoded.length-1,Math.floor(pos));
      const i1=Math.min(decoded.length-1,i0+1);
      const frac=pos-i0;
      let sum=0;
      for(let ch=0;ch<channels;ch++){
        const data=channelData[ch];
        sum+=(data[i0]||0)+((data[i1]||0)-(data[i0]||0))*frac;
      }
      mono[i]=Math.max(-1,Math.min(1,sum/Math.max(1,channels)));
    }
    const out=new ArrayBuffer(44+frames*2);
    const view=new DataView(out);
    const write=(offset,str)=>{for(let i=0;i<str.length;i++)view.setUint8(offset+i,str.charCodeAt(i));};
    write(0,'RIFF');view.setUint32(4,36+frames*2,true);write(8,'WAVE');write(12,'fmt ');
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
    view.setUint32(24,targetRate,true);view.setUint32(28,targetRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
    write(36,'data');view.setUint32(40,frames*2,true);
    let offset=44;
    for(let i=0;i<frames;i++,offset+=2){
      const sample=mono[i]<0?mono[i]*0x8000:mono[i]*0x7fff;
      view.setInt16(offset,sample,true);
    }
    return{blob:new Blob([out],{type:'audio/wav'}),type:'audio/wav',duration:Math.max(1,Math.round(decoded.duration))};
  }catch{
    return{blob,type:blob.type||'audio/webm',duration:null};
  }finally{
    try{await ctx?.close?.();}catch{}
  }
}
function voiceExtension(type=''){
  if(type.includes('wav'))return'wav';
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
function syncDmComposerAction(){
  const input=$('#dm-input');
  const btn=$('#dm-send-action');
  if(!btn)return;
  const hasText=Boolean(input?.value.trim());
  const recording=state.voiceRecorder?.state==='recording'||state.voicePendingStart;
  btn.classList.toggle('recording',recording);
  btn.classList.toggle('text-ready',hasText&&!recording);
  btn.type=hasText&&!recording?'submit':'button';
  btn.setAttribute('aria-label',recording?'Solte para enviar áudio':hasText?'Enviar mensagem':'Segure para gravar áudio');
  btn.title=recording?'Solte para enviar':hasText?'Enviar mensagem':'Segure para gravar voz';
  if(recording){
    btn.innerHTML=`<span class="dm-rec-dot"></span><b>REC ${voiceElapsed()}</b><small>solte</small>`;
  }else if(hasText){
    btn.innerHTML='<b>ENVIAR →</b>';
  }else{
    btn.innerHTML='<span class="avesso-mic-icon" aria-hidden="true"><i></i></span><small>SEGURE</small>';
  }
}
function syncVoiceRecordingUI(){syncDmComposerAction();}
function clearVoiceRecordingState(){
  clearInterval(state.voiceTimer);
  state.voiceTimer=null;
  state.voiceRecorder=null;
  state.voicePendingStart=false;
  state.voiceStream?.getTracks?.().forEach(track=>track.stop());
  state.voiceStream=null;
  state.voiceChunks=[];
  state.voiceStartedAt=0;
  state.voicePeerId=null;
  syncVoiceRecordingUI();
}
function cancelVoiceRecording(quiet=false){
  state.voiceHoldActive=false;
  if(state.voiceRecorder){
    try{
      state.voiceRecorder.onstop=null;
      if(state.voiceRecorder.state!=='inactive')state.voiceRecorder.stop();
    }catch{}
  }
  clearVoiceRecordingState();
  if(!quiet)toast('Gravação cancelada. O microfone voltou ao silêncio.');
}
async function startVoiceRecording({hold=false}={}){
  if(state.voiceRecorder||state.voicePendingStart||!state.directPeerId)return false;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Este navegador não oferece gravação de voz por aqui.');return false;}
  state.voicePendingStart=true;
  syncVoiceRecordingUI();
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
    if(hold&&!state.voiceHoldActive){
      stream.getTracks().forEach(track=>track.stop());
      state.voicePendingStart=false;syncVoiceRecordingUI();return false;
    }
    const mime=preferredVoiceMime();
    const recorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
    const peerId=state.directPeerId;
    state.voiceStream=stream;
    state.voiceRecorder=recorder;
    state.voicePendingStart=false;
    state.voiceChunks=[];
    state.voiceStartedAt=Date.now();
    state.voicePeerId=peerId;
    recorder.ondataavailable=e=>{if(e.data?.size)state.voiceChunks.push(e.data);};
    recorder.onerror=()=>{clearVoiceRecordingState();toast('A gravação tropeçou no próprio cabo.');};
    recorder.onstop=async()=>{
      const chunks=[...state.voiceChunks];
      const type=(recorder.mimeType||mime||'audio/ogg').split(';')[0];
      const startedAt=state.voiceStartedAt;
      clearInterval(state.voiceTimer);state.voiceTimer=null;
      stream.getTracks().forEach(track=>track.stop());
      state.voiceRecorder=null;state.voiceStream=null;state.voiceChunks=[];state.voiceStartedAt=0;state.voicePeerId=null;state.voicePendingStart=false;
      syncVoiceRecordingUI();
      if(!chunks.length)return toast('O áudio terminou antes de começar.');
      const rawBlob=new Blob(chunks,{type});
      const normalized=await normalizeVoiceBlob(rawBlob);
      const finalBlob=normalized.blob;
      const finalType=normalized.type||type;
      const duration=normalized.duration||Math.max(1,Math.round((Date.now()-startedAt)/1000));
      if(finalBlob.size>10*1024*1024)return toast('Áudio acima de 10 MB. Nem o AVESSO precisa de um podcast inteiro.');
      const ext=voiceExtension(finalType);
      const file=new File([finalBlob],`voz-${Date.now()}.${ext}`,{type:finalType});
      const optimisticId=`voice-local-${crypto.randomUUID()}`;
      const optimisticUrl=URL.createObjectURL(finalBlob);
      if(state.chatWindowOpen&&state.directPeerId===peerId){
        appendDirectMessage({
          id:optimisticId,
          sender_id:state.profile.id,
          recipient_id:peerId,
          body:`Mensagem de voz · ${duration}s`,
          message_kind:'audio',
          attachment_url:optimisticUrl,
          attachment_name:file.name,
          attachment_type:finalType,
          attachment_size:file.size,
          created_at:new Date().toISOString()
        });
      }
      await sendDirectAttachment(file,{recipientId:peerId,voiceDuration:duration,optimisticId,optimisticUrl});
    };
    recorder.start(250);
    state.voiceTimer=setInterval(()=>{
      syncVoiceRecordingUI();
      if(Date.now()-state.voiceStartedAt>=180000&&state.voiceRecorder?.state==='recording')state.voiceRecorder.stop();
    },250);
    syncVoiceRecordingUI();
    return true;
  }catch(err){
    clearVoiceRecordingState();
    if(String(err?.name)==='NotAllowedError')return toast('O microfone foi bloqueado. Libere a permissão do site para enviar voz.');
    toast('Não consegui abrir o microfone. A tecnologia continua com senso de humor.');
    return false;
  }
}
function stopVoiceRecording({send=true}={}){
  state.voiceHoldActive=false;
  if(!state.voiceRecorder){
    if(!send){state.voicePendingStart=false;syncVoiceRecordingUI();}
    return;
  }
  if(!send){
    cancelVoiceRecording(true);
    return;
  }
  try{
    if(state.voiceRecorder.state==='recording')state.voiceRecorder.stop();
  }catch{clearVoiceRecordingState();}
}
function bindHoldToTalk(){
  const btn=$('#dm-send-action');
  const input=$('#dm-input');
  if(!btn||!input)return;
  input.addEventListener('input',syncDmComposerAction);
  btn.onpointerdown=e=>{
    if(input.value.trim()||e.button!==0)return;
    e.preventDefault();
    try{btn.setPointerCapture(e.pointerId);}catch{}
    state.voiceHoldActive=true;
    startVoiceRecording({hold:true});
  };
  btn.onpointerup=e=>{
    if(input.value.trim())return;
    e.preventDefault();
    state.voiceHoldActive=false;
    stopVoiceRecording({send:true});
  };
  btn.onpointercancel=e=>{
    if(input.value.trim())return;
    e.preventDefault();
    stopVoiceRecording({send:false});
  };
  btn.oncontextmenu=e=>{if(!input.value.trim())e.preventDefault();};
  syncDmComposerAction();
}

const CHAT_GEOMETRY_KEY='avesso.chat.geometry.v2';
function chatDesktopEnabled(){
  return window.matchMedia('(min-width: 761px)').matches;
}
function defaultChatGeometry(){
  const width=Math.min(560,Math.max(360,window.innerWidth-44));
  const height=Math.min(680,Math.max(320,window.innerHeight-70));
  return {left:Math.max(8,window.innerWidth-width-22),top:Math.max(8,window.innerHeight-height-18),width,height};
}
function clampChatGeometry(geometry={}){
  const gap=6;
  const minWidth=Math.min(300,Math.max(280,window.innerWidth-gap*2));
  const minHeight=Math.min(280,Math.max(250,window.innerHeight-gap*2));
  const maxWidth=Math.max(minWidth,window.innerWidth-gap*2);
  const maxHeight=Math.max(minHeight,window.innerHeight-gap*2);
  const width=Math.min(maxWidth,Math.max(minWidth,Number(geometry.width)||560));
  const height=Math.min(maxHeight,Math.max(minHeight,Number(geometry.height)||650));
  const left=Math.min(window.innerWidth-width-gap,Math.max(gap,Number(geometry.left)||gap));
  const top=Math.min(window.innerHeight-height-gap,Math.max(gap,Number(geometry.top)||gap));
  return {left,top,width,height};
}
function loadChatGeometry(){
  if(state.chatGeometry)return state.chatGeometry;
  try{
    const saved=JSON.parse(localStorage.getItem(CHAT_GEOMETRY_KEY)||'null');
    state.chatGeometry=clampChatGeometry(saved||defaultChatGeometry());
  }catch{state.chatGeometry=clampChatGeometry(defaultChatGeometry());}
  return state.chatGeometry;
}
function saveChatGeometry(){
  if(!state.chatGeometry)return;
  try{localStorage.setItem(CHAT_GEOMETRY_KEY,JSON.stringify(state.chatGeometry));}catch{}
}
function applyChatGeometry(){
  const win=$('#dm-floating-window');if(!win)return;
  if(!chatDesktopEnabled()){
    ['left','top','right','bottom','width','height'].forEach(prop=>win.style.removeProperty(prop));
    win.classList.remove('maximized','desktop-windowed','docked-minimized');
    return;
  }
  win.classList.add('desktop-windowed');
  if(state.chatWindowMinimized){
    win.classList.remove('maximized');
    win.classList.add('docked-minimized');
    Object.assign(win.style,{left:'auto',top:'auto',right:'16px',bottom:'16px',width:'min(320px, calc(100vw - 24px))',height:'58px'});
    return;
  }
  win.classList.remove('docked-minimized');
  if(state.chatMaximized){
    win.classList.add('maximized');
    Object.assign(win.style,{left:'6px',top:'6px',right:'auto',bottom:'auto',width:'calc(100vw - 12px)',height:'calc(100vh - 12px)'});
    return;
  }
  win.classList.remove('maximized');
  const g=loadChatGeometry();
  Object.assign(win.style,{left:`${g.left}px`,top:`${g.top}px`,right:'auto',bottom:'auto',width:`${g.width}px`,height:`${g.height}px`});
}
function toggleChatMaximize(){
  if(!state.chatWindowOpen||!chatDesktopEnabled())return;
  if(state.chatWindowMinimized){state.chatWindowMinimized=false;ensureChatWindow().classList.remove('minimized');}
  state.chatMaximized=!state.chatMaximized;
  const button=$('#dm-maximize');
  if(button){button.textContent=state.chatMaximized?'❐':'□';button.title=state.chatMaximized?'Restaurar tamanho':'Maximizar';}
  applyChatGeometry();
}
function ensureChatResizeHandles(win){
  if(!chatDesktopEnabled())return;
  ['n','e','s','w','ne','nw','se','sw'].forEach(dir=>{
    if(win.querySelector(`[data-chat-resize="${dir}"]`))return;
    const handle=document.createElement('span');
    handle.className=`dm-resize-handle dm-resize-${dir}`;
    handle.dataset.chatResize=dir;
    handle.setAttribute('aria-hidden','true');
    win.appendChild(handle);
  });
}
function startChatPointerAction(event,mode){
  if(!chatDesktopEnabled()||event.button!==0)return;
  if(state.chatMaximized)return;
  if(mode!=='move'&&state.chatWindowMinimized)return;
  const win=ensureChatWindow();
  const rect=win.getBoundingClientRect();
  const start={x:event.clientX,y:event.clientY,left:rect.left,top:rect.top,width:rect.width,height:state.chatWindowMinimized?loadChatGeometry().height:rect.height};
  const minW=Math.min(330,Math.max(300,window.innerWidth-12));
  const minH=Math.min(320,Math.max(280,window.innerHeight-12));
  document.documentElement.classList.add('dm-window-interacting');
  event.preventDefault();
  const move=ev=>{
    const dx=ev.clientX-start.x,dy=ev.clientY-start.y;
    let left=start.left,top=start.top,width=start.width,height=start.height;
    if(mode==='move'){
      left=start.left+dx;top=start.top+dy;
    }else{
      if(mode.includes('e'))width=start.width+dx;
      if(mode.includes('s'))height=start.height+dy;
      if(mode.includes('w')){width=start.width-dx;left=start.left+dx;}
      if(mode.includes('n')){height=start.height-dy;top=start.top+dy;}
      if(width<minW){if(mode.includes('w'))left-=minW-width;width=minW;}
      if(height<minH){if(mode.includes('n'))top-=minH-height;height=minH;}
    }
    const maxW=window.innerWidth-12,maxH=window.innerHeight-12;
    if(width>maxW){if(mode.includes('w'))left-=maxW-width;width=maxW;}
    if(height>maxH){if(mode.includes('n'))top-=maxH-height;height=maxH;}
    left=Math.max(6,Math.min(left,window.innerWidth-width-6));
    top=Math.max(6,Math.min(top,window.innerHeight-(state.chatWindowMinimized?38:height)-6));
    state.chatGeometry={left,top,width,height};
    Object.assign(win.style,{left:`${left}px`,top:`${top}px`,right:'auto',bottom:'auto',width:`${width}px`,height:state.chatWindowMinimized?'38px':`${height}px`});
  };
  const up=()=>{
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',up);
    document.documentElement.classList.remove('dm-window-interacting');
    state.chatGeometry=clampChatGeometry(state.chatGeometry||start);
    saveChatGeometry();
    applyChatGeometry();
  };
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up,{once:true});
}
function installChatDesktopWindowing(){
  const win=ensureChatWindow();
  if(!chatDesktopEnabled()){applyChatGeometry();return;}
  ensureChatResizeHandles(win);
  const head=$('#dm-floating-head');
  if(head){
    head.onpointerdown=e=>{
      if(e.target.closest('button,.dm-window-controls,.dm-options-menu'))return;
      startChatPointerAction(e,'move');
    };
    head.ondblclick=e=>{
      if(e.target.closest('button,.dm-window-controls,.dm-options-menu'))return;
      toggleChatMaximize();
    };
  }
  win.querySelectorAll('[data-chat-resize]').forEach(handle=>{
    handle.onpointerdown=e=>{e.stopPropagation();startChatPointerAction(e,handle.dataset.chatResize);};
  });
  applyChatGeometry();
}
window.addEventListener('resize',()=>{if(state.chatWindowOpen)applyChatGeometry();});

function ensureChatWindow(){
  let win=$('#dm-floating-window');
  if(!win){win=document.createElement('section');win.id='dm-floating-window';win.className='dm-floating-window hidden';document.body.appendChild(win);}
  return win;
}
async function openChatWindow(peerId,{keepMinimized=false,markRead=true}={}){
  if(!peerId)return;
  if(state.voiceRecorder&&state.voicePeerId&&state.voicePeerId!==peerId)cancelVoiceRecording(true);
  const [peer,messages]=await Promise.all([profileById(peerId),loadDirectConversation(peerId,{markRead})]);
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
  win.dataset.chatTheme=theme;
  win.dataset.chatWallpaper=chatWallpaper;
  win.innerHTML=`<div class="dm-msn-titlebar" id="dm-floating-head">
      <span class="dm-msn-appmark">▓ AVESSO.MSG</span>
      <button id="dm-restore-name" class="dm-title-peer" data-profile-id="${peer.id}" title="Abrir conversa com ${escapeAttr(peer.display_name)}"><i class="presence-dot ${p.mode}"></i>${escapeHtml(peer.display_name)}${muted?' · 🔇':''}</button>
      <span class="dm-msn-era">56K // 2026</span>
      <div class="dm-window-controls"><button id="dm-minimize" title="${state.chatWindowMinimized?'Restaurar':'Minimizar'}">${state.chatWindowMinimized?'↥':'_'}</button><button id="dm-maximize" title="${state.chatMaximized?'Restaurar tamanho':'Maximizar'}">${state.chatMaximized?'❐':'□'}</button><button id="dm-close" title="Fechar">×</button></div>
    </div>
    <header class="dm-floating-head">
      <button class="mini-avatar profile-avatar-button" id="dm-peer-avatar">${avatarHtml(peer.avatar_url,peer.display_name)}</button>
      <div class="dm-peer-heading"><span class="dm-conversation-label">CONVERSANDO COM</span><div class="dm-peer-identity-row"><button class="dm-peer-name" id="dm-peer-profile-name" data-profile-id="${peer.id}">${escapeHtml(peer.display_name)}</button><span id="dm-peer-status" class="dm-user-status ${peer.status_message?'':'hidden'}" title="${escapeAttr(peer.status_message||'')}">${escapeHtml(peer.status_message||'')}</span><div id="dm-peer-listening" class="dm-listening-inline">${chatNowPlayingHtml(peer,{compact:true})}</div></div><small><i class="presence-dot ${p.mode}"></i> ${p.label} · @${escapeHtml(peer.handle)}${muted?' · mutado':''}</small></div>
      <div class="dm-head-actions"><span class="dm-msn-status-orb ${p.mode}" title="${p.label}"></span><button id="dm-options" class="dm-kebab" aria-label="Opções da conversa" title="Opções da conversa">•••</button></div>
      <div id="dm-options-menu" class="dm-options-menu dm-options-menu-head hidden">
        <div class="dm-options-user"><span class="mini-avatar">${avatarHtml(peer.avatar_url,peer.display_name)}</span><div><b class="identity-name" data-identity-profile-id="${peer.id}">${escapeHtml(peer.display_name)}</b><small>@${escapeHtml(peer.handle)}</small></div></div>
        <button id="dm-visit-profile">↗ visitar o Canto</button>
        <button id="dm-mute-peer">${muted?'🔊 desmutar':'🔇 mutar'} notificações</button>
        <button id="dm-block-peer" class="danger">⊘ bloquear usuário</button>
        <button id="dm-report-peer" class="report-user-button">⚑ denunciar usuário</button>
        <label class="dm-away-setting"><span>MINHA AUSÊNCIA AUTOMÁTICA</span><select id="dm-away-after"><option value="5">5 minutos</option><option value="10">10 minutos</option><option value="15">15 minutos</option><option value="20">20 minutos</option><option value="30">30 minutos</option><option value="0">nunca</option></select></label><label class="dm-chat-listening-setting"><input id="dm-show-listening" type="checkbox" ${state.profile.chat_listening_visible!==false?'checked':''}><span><b>mostrar minha música nas conversas</b><small>o Canto pode continuar mostrando mesmo se você esconder daqui</small></span></label><div class="dm-status-setting"><span>MEU STATUS</span><div><input id="dm-status-message" maxlength="140" value="${escapeAttr(state.profile.status_message||'')}" placeholder="online, mas discutivelmente disponível"><button id="dm-save-status" type="button">salvar</button></div></div>
        <div class="dm-theme-section"><span>TEMA // PIXEL 199X → 2026</span><div class="dm-theme-grid">${CHAT_THEMES.map(([id,label,color])=>`<button type="button" class="chat-theme-choice ${theme===id?'active':''}" data-chat-theme="${id}" title="${escapeAttr(label)}"><i style="--theme-color:${color}"></i><b>${escapeHtml(label)}</b></button>`).join('')}</div></div>
        <div class="dm-wallpaper-section"><span>FUNDO // CONVERSA</span><div class="dm-chat-wallpaper-grid">${allChatWallpapers().map(([slug,name])=>`<button type="button" class="dm-chat-wallpaper ${chatWallpaper===slug?'active':''}" data-chat-wallpaper="${escapeAttr(slug)}" title="${escapeAttr(name)}" style="${slug==='none'?'':'--chat-thumb:url(\''+wallpaperUrl(slug)+'\')'}"><i></i><b>${escapeHtml(name)}</b></button>`).join('')}</div></div>
      </div>
    </header>
    <div class="dm-window-body">
      <div class="dm-msn-conversation">
        <aside class="dm-msn-peer">
          <div class="dm-msn-peer-avatar">${avatarHtml(peer.avatar_url,peer.display_name)}</div>
          <b class="identity-name" data-identity-profile-id="${peer.id}">${escapeHtml(peer.display_name)}</b>
          <small>@${escapeHtml(peer.handle)}</small>
          <span class="dm-msn-presence"><i class="presence-dot ${p.mode}"></i> ${p.label}${muted?' · 🔇 mutado':''}</span>
        </aside>
        <div class="dm-log" id="dm-log">${messages.map(dmMessageHtml).join('')||'<div class="dm-empty">Nenhuma mensagem ainda. O silêncio foi entregue com sucesso.</div>'}</div>
        <aside class="dm-msn-self" title="Seu perfil nesta conversa">
          <div class="dm-msn-self-avatar">${avatarHtml(state.profile.avatar_url,state.profile.display_name)}</div>
          <b class="identity-name" data-identity-profile-id="${state.profile.id}">${escapeHtml(state.profile.display_name)}</b>
          <small>@${escapeHtml(state.profile.handle)}</small>
          <span class="dm-msn-presence"><i class="presence-dot ${mePresence.mode}"></i> ${mePresence.label}</span>
        </aside>
      </div>
      <div class="dm-tools">
        <button id="dm-attention" title="Chamar atenção">⚡ chamar atenção</button>
        <button id="dm-attach" title="Enviar arquivo ou imagem">📎 arquivo</button>
        <input id="dm-file-input" type="file" hidden accept="image/*,audio/*,.pdf,.txt,.zip,.docx">
      </div>
      <form id="dm-form">
        <button id="dm-emoticons" class="dm-emoticon-trigger" type="button" title="Escolher emoticon" aria-label="Escolher emoticon">☺</button>
        <input id="dm-input" maxlength="1000" autocomplete="off" placeholder="Digite uma mensagem...">
        <button id="dm-send-action" class="dm-send-action" type="button" aria-label="Segure para gravar áudio"></button>
        <div id="dm-emoticon-palette" class="dm-emoticon-palette dm-emoticon-window hidden">
          <div class="dm-emoticon-window-head"><b>Emoticons</b><button id="dm-emoticon-close" type="button" aria-label="Fechar emoticons">×</button></div>
          <div class="dm-emoticon-grid">${avessoEmoticonButtons('data-emoticon')}</div>
        </div>
      </form>
    </div>`;
  $('#dm-minimize').onclick=toggleChatMinimize;
  $('#dm-maximize').onclick=toggleChatMaximize;
  $('#dm-close').onclick=()=>closeChatWindow();
  $('#dm-restore-name').onclick=e=>{e.stopPropagation();if(state.chatWindowMinimized)toggleChatMinimize();else $('#dm-input')?.focus();};
  $('#dm-peer-avatar').onclick=()=>openPublicProfile(peerId);
  $('#dm-peer-profile-name').onclick=()=>openPublicProfile(peerId);
  $('#dm-form').onsubmit=sendDirectMessage;
  $('#dm-attention').onclick=sendAttention;
  $('#dm-emoticons').onclick=e=>{e.stopPropagation();$('#dm-emoticon-palette').classList.toggle('hidden');$('#dm-options-menu')?.classList.add('hidden');};
  $('#dm-emoticon-close').onclick=e=>{e.stopPropagation();$('#dm-emoticon-palette').classList.add('hidden');$('#dm-input')?.focus();};
  $('[data-emoticon]').forEach(b=>b.onclick=()=>{const input=$('#dm-input');input.value+=b.dataset.emoticon;input.focus();syncDmComposerAction();});
  $('#dm-attach').onclick=()=>$('#dm-file-input').click();
  $('#dm-file-input').onchange=e=>{const file=e.target.files?.[0];if(file)sendDirectAttachment(file);};
  bindHoldToTalk();
  $('#dm-options').onclick=e=>{e.stopPropagation();$('#dm-options-menu').classList.toggle('hidden');$('#dm-emoticon-palette')?.classList.add('hidden');};
  $('#dm-visit-profile').onclick=()=>{openPublicProfile(peerId);$('#dm-options-menu')?.classList.add('hidden');};
  $('#dm-mute-peer').onclick=()=>toggleMutePeer(peerId);
  $('#dm-block-peer').onclick=()=>blockChatPeer(peerId);
  $('#dm-report-peer').onclick=()=>openReportUser(peerId);
  const awaySelect=$('#dm-away-after');if(awaySelect){awaySelect.value=String(state.profile.away_after_minutes??10);awaySelect.onchange=e=>saveAwayAfterMinutes(e.target.value);}
  const showListening=$('#dm-show-listening');if(showListening)showListening.onchange=e=>saveChatListeningVisibility(e.target.checked);
  const saveStatus=$('#dm-save-status');if(saveStatus)saveStatus.onclick=saveQuickChatStatus;
  $$('.chat-theme-choice').forEach(b=>b.onclick=()=>setChatTheme(b.dataset.chatTheme));
  $$('[data-chat-wallpaper]').forEach(b=>b.onclick=()=>setChatWallpaper(b.dataset.chatWallpaper));
  installChatDesktopWindowing();
  window.postMessage({type:'AVESSO_PRESENCE_REQUEST'},location.origin);
  syncVoiceRecordingUI();
  installChatScrollContainment(win);
  pinChatToLatest(win);
  repairLegacyVoicePlayers(win);
}
function pinChatToLatest(root=ensureChatWindow()){
  const log=root?.querySelector?.('#dm-log')||$('#dm-log');
  if(!log)return;
  let active=true;
  const stick=()=>{
    if(!active)return;
    log.scrollTop=log.scrollHeight;
  };
  stick();
  queueMicrotask(stick);
  requestAnimationFrame(()=>requestAnimationFrame(stick));
  [40,120,280,650,1000].forEach(ms=>setTimeout(stick,ms));
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(stick):null;
  observer?.observe(log);
  log.querySelectorAll('img,audio').forEach(media=>{
    const event=media.tagName==='IMG'?'load':'loadedmetadata';
    media.addEventListener(event,stick,{once:true});
  });
  const release=()=>{
    active=false;
    observer?.disconnect();
    log.removeEventListener('wheel',release);
    log.removeEventListener('pointerdown',release);
    log.removeEventListener('touchstart',release);
  };
  log.addEventListener('wheel',release,{once:true,passive:true});
  log.addEventListener('pointerdown',release,{once:true,passive:true});
  log.addEventListener('touchstart',release,{once:true,passive:true});
  setTimeout(release,1300);
}
function installChatScrollContainment(win){
  if(!win)return;
  win.onwheel=e=>{
    const scrollable=e.target.closest('#dm-log,.dm-options-menu,.dm-emoticon-palette');
    if(!scrollable){e.stopPropagation();return;}
    const canScroll=scrollable.scrollHeight>scrollable.clientHeight+1;
    if(!canScroll){e.preventDefault();e.stopPropagation();return;}
    const atTop=scrollable.scrollTop<=0;
    const atBottom=scrollable.scrollTop+scrollable.clientHeight>=scrollable.scrollHeight-1;
    if((e.deltaY<0&&atTop)||(e.deltaY>0&&atBottom))e.preventDefault();
    e.stopPropagation();
  };
}
async function refreshChatWindow(){
  if(!state.chatWindowOpen||!state.directPeerId)return;
  const minimized=state.chatWindowMinimized;
  await openChatWindow(state.directPeerId,{keepMinimized:true});
  state.chatWindowMinimized=minimized;
  ensureChatWindow().classList.toggle('minimized',minimized);
  applyChatGeometry();
}
function toggleChatMinimize(){
  if(!state.chatWindowOpen)return;
  state.chatWindowMinimized=!state.chatWindowMinimized;
  const win=ensureChatWindow();
  win.classList.toggle('minimized',state.chatWindowMinimized);
  const button=$('#dm-minimize');
  if(button){button.textContent=state.chatWindowMinimized?'↥':'_';button.title=state.chatWindowMinimized?'Restaurar':'Minimizar';}
  if(!state.chatWindowMinimized){
    clearTimeout(state.incomingMessagePulseTimer);
    win.classList.remove('incoming-pulse');
    if(state.directPeerId){
      supabase.from('direct_messages').update({read_at:new Date().toISOString()})
        .eq('sender_id',state.directPeerId).eq('recipient_id',state.profile.id).is('read_at',null).then(()=>{});
      profileById(state.directPeerId).then(updateChatPeerHeader);
    }
  }
  applyChatGeometry();
  if(!state.chatWindowMinimized)setTimeout(()=>$('#dm-input')?.focus(),80);
}
function autoMinimizeChat(){
  if(!state.chatWindowOpen||state.chatWindowMinimized)return;
  state.chatWindowMinimized=true;
  const win=ensureChatWindow();
  win.classList.add('minimized');
  const button=$('#dm-minimize');
  if(button){button.textContent='↥';button.title='Restaurar';}
  applyChatGeometry();
}
function closeChatWindow(silent=false){
  if(state.voiceRecorder||state.voicePendingStart)cancelVoiceRecording(true);
  clearTimeout(state.incomingMessagePulseTimer);
  state.incomingMessagePulseTimer=null;
  const win=$('#dm-floating-window');
  win?.querySelectorAll('.dm-voice-audio[data-voice-object-url]').forEach(audio=>{try{URL.revokeObjectURL(audio.dataset.voiceObjectUrl);}catch{}});
  state.chatWindowOpen=false;state.chatWindowMinimized=false;state.directPeerId=null;
  if(win){win.classList.remove('incoming-pulse');win.classList.add('hidden');}
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
async function receiveAttention(peerId,message=null){
  if(!peerId)return;
  const alreadyOpen=state.chatWindowOpen&&state.directPeerId===peerId;
  if(!alreadyOpen)await openChatWindow(peerId,{keepMinimized:false});
  else if(message)appendDirectMessage(message);
  state.chatWindowMinimized=false;
  state.chatMaximized=false;
  const win=ensureChatWindow();
  win.classList.remove('minimized','hidden','docked-minimized','maximized');
  win.style.zIndex='12550';
  applyChatGeometry();
  pinChatToLatest(win);
  if(message?.id&&!document.hidden)markDirectRead(message.id);
  triggerChatNudge(peerId);
  playUiSound('attention');
  if(document.hidden||!document.hasFocus()){
    state.pendingAttentionPeerId=peerId;
    return;
  }
  triggerScreenNudge();
  setTimeout(()=>{if(win)win.style.removeProperty('z-index');},1800);
}
async function sendDirectMessage(e){
  e?.preventDefault();
  const input=$('#dm-input');const body=input?.value.trim()||'';
  if(!body||!state.directPeerId)return;
  const peerId=state.directPeerId;
  input.value='';syncDmComposerAction();
  const {data,error}=await supabase.from('direct_messages')
    .insert({sender_id:state.profile.id,recipient_id:peerId,body,message_kind:'text'})
    .select('*').single();
  if(error){
    input.value=body;syncDmComposerAction();
    return toast('A mensagem não atravessou o fio. Confirme que vocês ainda são amigos.');
  }
  if(state.chatWindowOpen&&state.directPeerId===peerId)appendDirectMessage(data);
}
async function sendAttention(){
  if(!state.directPeerId)return;
  const peerId=state.directPeerId;
  const body=`${state.profile.display_name} chamou sua atenção. A internet acaba de voltar para 2006.`;
  const {data,error}=await supabase.from('direct_messages')
    .insert({sender_id:state.profile.id,recipient_id:peerId,body,message_kind:'attention'})
    .select('*').single();
  if(error)return toast('Nem chamar atenção chamou atenção.');
  if(state.chatWindowOpen&&state.directPeerId===peerId)appendDirectMessage(data);
  playUiSound('attention');
  const button=$('#dm-attention');
  if(button){button.classList.remove('sent');void button.offsetWidth;button.classList.add('sent');setTimeout(()=>button.classList.remove('sent'),450);}
}
async function sendDirectAttachment(file,{recipientId=state.directPeerId,voiceDuration=0,optimisticId=null,optimisticUrl=null}={}){
  if(!recipientId||!file)return;
  const clearOptimistic=()=>{
    if(optimisticId)document.querySelector(`[data-dm-id="${CSS.escape(String(optimisticId))}"]`)?.remove();
    if(optimisticUrl)URL.revokeObjectURL(optimisticUrl);
  };
  if(file.size>10*1024*1024){clearOptimistic();return toast('Até 10 MB por arquivo. A nostalgia não inclui conexão discada real.');}
  const allowed=/^(image\/(jpeg|png|webp|gif)|audio\/(webm|ogg|mp4|mpeg|wav|x-wav|aac|x-m4a)|application\/pdf|text\/plain|application\/(zip|x-zip-compressed)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i.test(file.type||'');
  if(!allowed){clearOptimistic();return toast('Formato não aceito nessa conversa.');}
  const path=`${state.profile.id}/${recipientId}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const {error:upErr}=await supabase.storage.from('avesso-chat').upload(path,file,{cacheControl:'86400',upsert:false,contentType:file.type});
  if(upErr){clearOptimistic();return toast('O arquivo caiu no chão antes de chegar.');}
  const kind=file.type.startsWith('image/')?'image':file.type.startsWith('audio/')?'audio':'file';
  const body=kind==='audio'?`Mensagem de voz${voiceDuration?' · '+voiceDuration+'s':''}`:file.name;
  const {data,error}=await supabase.from('direct_messages')
    .insert({sender_id:state.profile.id,recipient_id:recipientId,body,message_kind:kind,attachment_path:path,attachment_name:file.name,attachment_type:file.type,attachment_size:file.size})
    .select('*').single();
  if(error){
    await supabase.storage.from('avesso-chat').remove([path]);
    clearOptimistic();
    return toast('O banco recusou o pacote. Elegante.');
  }
  const hydrated=await hydrateDirectMessage(data);
  if(state.chatWindowOpen&&state.directPeerId===recipientId){
    if(optimisticId)appendDirectMessage(hydrated,{replaceId:optimisticId});
    else appendDirectMessage(hydrated);
  }
  if(optimisticUrl)setTimeout(()=>URL.revokeObjectURL(optimisticUrl),500);
}
function restoreChatWindowInstant(){
  if(!state.chatWindowOpen)return false;
  state.chatWindowMinimized=false;
  const win=ensureChatWindow();
  win.classList.remove('minimized','docked-minimized','hidden','incoming-pulse');
  const button=$('#dm-minimize');
  if(button){button.textContent='_';button.title='Minimizar';}
  applyChatGeometry();
  requestAnimationFrame(()=>{
    const log=$('#dm-log');if(log)log.scrollTop=log.scrollHeight;
    $('#dm-input')?.focus();
  });
  return true;
}
function openQuickFriendChat(peerId){
  if(!peerId)return;
  if(state.chatWindowOpen&&state.directPeerId===peerId){
    restoreChatWindowInstant();
    profileById(peerId).then(updateChatPeerHeader);
    return;
  }
  openChatWindow(peerId,{keepMinimized:false,markRead:true});
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
  grid.innerHTML=allWallpaperOptions().map(([slug,name,tag])=>`<button class="wallpaper-choice ${slug===current?'active':''}" data-wallpaper="${slug}"><img src="${wallpaperUrl(slug)}" alt=""><b>${escapeHtml(name)}</b><small>${escapeHtml(tag)}</small></button>`).join('');
  $$('[data-wallpaper]').forEach(b=>b.onclick=()=>saveWallpaper(target,b.dataset.wallpaper));
  $('#wallpaper-dialog').showModal();
}
async function saveWallpaper(target,slug){
  if(!allWallpaperOptions().some(x=>x[0]===slug))return;
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
    const {data:ps}=await supabase.from('profiles').select('id,display_name,handle,avatar_url,status_message,presence_mode,last_seen,online_until').in('id',ids);
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
  await primeFriendPresenceCache();
  loadFriendPanel();
}
async function removeFriendship(id){
  if(!confirm('Remover esta amizade? Sem discurso de despedida obrigatório.'))return;
  const {error}=await supabase.from('friendships').delete().eq('id',id);
  if(error)return toast('Não foi possível remover agora.');
  toast('Amizade removida.');
  await primeFriendPresenceCache();
  loadFriendPanel();
}
function openAvatarDialog(){
  const grid=$('#avatar-modal-grid');
  grid.innerHTML=allAvatarOptions().map(([label,url,kind])=>`<button class="avatar-choice-modal ${state.profile.avatar_url===url?'active':''}" data-avatar-url="${escapeAttr(url)}"><img src="${escapeAttr(url)}" alt="${escapeAttr(label)}"><b>${label}</b><small>${kind}</small></button>`).join('');
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
  $('#nav-name').dataset.profileId=data.id; $('#nav-name').innerHTML=escapeHtml(data.display_name)+(state.staffRole==='owner'?adminCrownHtml('nav-admin-crown'):''); renderNavAvatar(); decorateIdentityNodes(document);
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
function albumReactionButtons(photoId,reactions=[]){
  const rs=reactions.filter(r=>r.photo_id===photoId);
  return PHOTO_REACTIONS.map(([id,icon,label])=>{
    const rows=rs.filter(r=>r.reaction===id);
    const active=rows.some(r=>r.user_id===state.profile.id);
    return `<button class="photo-reaction ${active?'active':''}" data-photo-react="${photoId}" data-reaction="${id}">${icon} ${label}${rows.length?` <b>${rows.length}</b>`:''}</button>`;
  }).join('');
}
function renderAlbumPhotos(host,photos,userId,editable,reactions=[]){
  if(!host)return;
  host.dataset.albumUser=userId;
  host.innerHTML=photos.map((photo,index)=>`<article class="album-photo" data-album-photo="${photo.id}">
    <button class="album-photo-open" type="button" data-photo-open="${photo.id}" aria-label="Abrir foto e conversa"><img src="${escapeAttr(photo._url)}" alt="${escapeAttr(photo.caption||'Foto do álbum')}" loading="${index<10?'eager':'lazy'}" decoding="async" fetchpriority="${index<4?'high':'auto'}"></button>
    <div class="album-photo-meta"><p data-photo-caption="${photo.id}">${escapeHtml(photo.caption||'sem legenda. corajoso.')}</p><small>${ago(photo.created_at)}</small></div>
    <div class="photo-reactions" data-photo-reactions="${photo.id}">${albumReactionButtons(photo.id,reactions)}</div>
    ${editable?`<div class="album-owner-actions"><button data-photo-edit="${photo.id}">editar legenda</button><button class="album-delete" data-photo-delete="${photo.id}" data-storage-path="${escapeAttr(photo.storage_path)}">apagar foto</button></div><div class="album-caption-edit hidden" data-photo-edit-panel="${photo.id}"><input maxlength="180" value="${escapeAttr(photo.caption||'')}" placeholder="legenda"><div><button data-photo-save="${photo.id}">salvar</button><button data-photo-cancel="${photo.id}">cancelar</button></div></div>`:''}
  </article>`).join('')||'<p class="album-empty">Álbum vazio. Nenhuma lembrança foi monetizada.</p>';
  host.querySelectorAll('[data-photo-open]').forEach(b=>b.onclick=()=>openAlbumPhotoViewer(b.dataset.photoOpen));
  host.querySelectorAll('[data-photo-react]').forEach(b=>b.onclick=()=>togglePhotoReaction(b.dataset.photoReact,b.dataset.reaction,userId,editable));
  host.querySelectorAll('[data-photo-delete]').forEach(b=>b.onclick=()=>deleteAlbumPhoto(b.dataset.photoDelete,b.dataset.storagePath));
  host.querySelectorAll('[data-photo-edit]').forEach(b=>b.onclick=()=>host.querySelector(`[data-photo-edit-panel="${b.dataset.photoEdit}"]`)?.classList.remove('hidden'));
  host.querySelectorAll('[data-photo-cancel]').forEach(b=>b.onclick=()=>host.querySelector(`[data-photo-edit-panel="${b.dataset.photoCancel}"]`)?.classList.add('hidden'));
  host.querySelectorAll('[data-photo-save]').forEach(b=>b.onclick=()=>saveAlbumPhotoCaption(b.dataset.photoSave));
}
function updateAlbumReactions(host,photos,reactions,userId,editable){
  if(!host||host.dataset.albumUser!==userId)return;
  photos.forEach(photo=>{
    const box=host.querySelector(`[data-photo-reactions="${CSS.escape(photo.id)}"]`);
    if(box)box.innerHTML=albumReactionButtons(photo.id,reactions);
  });
  host.querySelectorAll('[data-photo-react]').forEach(b=>b.onclick=()=>togglePhotoReaction(b.dataset.photoReact,b.dataset.reaction,userId,editable));
}
async function loadAlbum(userId,editable=false){
  const host=$(editable?'#profile-album':'#public-album');if(!host)return;
  const cached=state.albumDataCache[userId];
  if(cached?.photos?.length)renderAlbumPhotos(host,cached.photos,userId,editable,cached.reactions||[]);
  const {data:photos,error}=await supabase.from('profile_photos').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(60);
  if(error){if(!cached)host.innerHTML='<p>O álbum caiu atrás do servidor.</p>';return;}
  if(!host.isConnected)return;
  const albumPhotos=(photos||[]).map(photo=>({...photo,_url:publicAlbumUrl(photo.storage_path)}));
  warmAlbumImages(albumPhotos.map(photo=>photo._url));
  renderAlbumPhotos(host,albumPhotos,userId,editable,cached?.reactions||[]);
  state.albumDataCache[userId]={photos:albumPhotos,reactions:cached?.reactions||[]};
  const ids=albumPhotos.map(p=>p.id);
  if(!ids.length){state.albumDataCache[userId]={photos:albumPhotos,reactions:[]};return;}
  const r=await supabase.from('photo_reactions').select('*').in('photo_id',ids);
  const reactions=r.data||[];
  state.albumDataCache[userId]={photos:albumPhotos,reactions};
  updateAlbumReactions(host,albumPhotos,reactions,userId,editable);
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
  $('#album-file').value='';$('#album-caption').value='';delete state.albumDataCache[state.profile.id];toast('Foto adicionada. Nenhum filtro de pôr do sol obrigatório.');loadAlbum(state.profile.id,true);
}
async function saveAlbumPhotoCaption(id){
  const panel=document.querySelector(`[data-photo-edit-panel="${CSS.escape(id)}"]`);
  const caption=String(panel?.querySelector('input')?.value||'').trim().slice(0,180);
  const {error}=await supabase.from('profile_photos').update({caption}).eq('id',id).eq('user_id',state.profile.id);
  if(error)return toast('A legenda se recusou a mudar.');
  delete state.albumDataCache[state.profile.id];
  toast('Legenda atualizada.');
  loadAlbum(state.profile.id,true);
}
async function deleteAlbumPhoto(id,path){
  if(!confirm('Apagar esta foto do seu Canto?'))return;
  const {error}=await supabase.from('profile_photos').delete().eq('id',id).eq('user_id',state.profile.id);
  if(error)return toast('A foto se recusou a desaparecer.');
  if(path)await supabase.storage.from('avesso-albums').remove([path]);
  delete state.albumDataCache[state.profile.id];
  loadAlbum(state.profile.id,true);
}
async function togglePhotoReaction(photoId,reaction,userId,editable){
  if(!PHOTO_REACTIONS.some(x=>x[0]===reaction))return;
  const {data:existing}=await supabase.from('photo_reactions').select('reaction').eq('photo_id',photoId).eq('user_id',state.profile.id).maybeSingle();
  if(existing?.reaction===reaction)await supabase.from('photo_reactions').delete().eq('photo_id',photoId).eq('user_id',state.profile.id);
  else await supabase.from('photo_reactions').upsert({photo_id:photoId,user_id:state.profile.id,reaction},{onConflict:'photo_id,user_id'});
  delete state.albumDataCache[userId];
  loadAlbum(userId,editable);
}
function ensureImageViewer(){
  let dialog=$('#avesso-image-viewer');
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='avesso-image-viewer';
  dialog.className='avesso-image-viewer';
  dialog.innerHTML='<button class="image-viewer-close" type="button" aria-label="Fechar">×</button><div id="image-viewer-content"></div>';
  document.body.appendChild(dialog);
  dialog.querySelector('.image-viewer-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
  return dialog;
}
function imageViewerCommentHtml(row,ownerId=''){
  const canDelete=row.user_id===state.profile?.id||ownerId===state.profile?.id;
  return '<article class="image-viewer-comment">'+
    '<span class="mini-avatar">'+avatarHtml(row.author?.avatar_url,row.author?.display_name||'?')+'</span>'+
    '<div><header><button class="user-link" data-profile-id="'+escapeAttr(row.user_id)+'">'+escapeHtml(row.author?.display_name||'alguém')+'</button>'+
    '<small>@'+escapeHtml(row.author?.handle||'...')+' · '+ago(row.created_at)+'</small></header>'+
    '<p>'+escapeHtml(row.body)+'</p>'+
    (canDelete?'<button class="image-comment-delete" data-photo-comment-delete="'+escapeAttr(row.id)+'" data-photo-comment-photo="'+escapeAttr(row.photo_id)+'">apagar</button>':'')+
    '</div></article>';
}
async function loadPhotoViewerData(photoId){
  const {data:photo,error}=await supabase.from('profile_photos').select('*').eq('id',photoId).maybeSingle();
  if(error||!photo)return null;
  const [ownerRes,commentsRes,reactionsRes]=await Promise.all([
    supabase.from('profiles').select('id,display_name,handle,avatar_url').eq('id',photo.user_id).maybeSingle(),
    supabase.from('photo_comments').select('id,photo_id,user_id,body,created_at,edited_at').eq('photo_id',photoId).order('created_at',{ascending:true}),
    supabase.from('photo_reactions').select('photo_id,user_id,reaction,created_at').eq('photo_id',photoId)
  ]);
  const comments=commentsRes.data||[];
  const ids=[...new Set(comments.map(x=>x.user_id).filter(Boolean))];
  let profiles={};
  if(ids.length){
    const {data}=await supabase.from('profiles').select('id,display_name,handle,avatar_url').in('id',ids);
    profiles=Object.fromEntries((data||[]).map(x=>[x.id,x]));
  }
  return{
    photo:{...photo,_url:publicAlbumUrl(photo.storage_path)},
    owner:ownerRes.data||{},
    comments:comments.map(x=>({...x,author:profiles[x.user_id]||{}})),
    reactions:reactionsRes.data||[]
  };
}
async function openAlbumPhotoViewer(photoId){
  if(!photoId)return;
  const dialog=ensureImageViewer();
  const host=$('#image-viewer-content');
  host.innerHTML='<div class="image-viewer-loading">abrindo pixels...</div>';
  if(!dialog.open)dialog.showModal();
  const data=await loadPhotoViewerData(photoId);
  if(!data){host.innerHTML='<div class="image-viewer-error">A foto sumiu atrás do servidor.</div>';return;}
  const photo=data.photo,owner=data.owner,comments=data.comments,reactions=data.reactions;
  const reactionButtons=PHOTO_REACTIONS.map(([id,icon,label])=>{
    const rows=reactions.filter(x=>x.reaction===id);
    const active=rows.some(x=>x.user_id===state.profile.id);
    return '<button class="'+(active?'active':'')+'" data-viewer-photo-react="'+id+'" data-photo-id="'+photo.id+'"><span>'+icon+'</span>'+escapeHtml(label)+(rows.length?' <b>'+rows.length+'</b>':'')+'</button>';
  }).join('');
  host.innerHTML='<section class="image-viewer-grid">'+
    '<div class="image-viewer-stage"><img src="'+escapeAttr(photo._url)+'" alt="'+escapeAttr(photo.caption||'Foto do álbum')+'"></div>'+
    '<aside class="image-viewer-social">'+
      '<header class="image-viewer-owner"><span class="mini-avatar">'+avatarHtml(owner.avatar_url,owner.display_name||'?')+'</span><div>'+
      '<button class="user-link" data-profile-id="'+escapeAttr(owner.id||photo.user_id)+'">'+escapeHtml(owner.display_name||'alguém')+'</button>'+
      '<small>@'+escapeHtml(owner.handle||'...')+' · '+ago(photo.created_at)+'</small></div></header>'+
      '<p class="image-viewer-caption">'+escapeHtml(photo.caption||'sem legenda. corajoso.')+'</p>'+
      '<div class="image-viewer-actions"><button class="turn-feed-button" data-viewer-turn-photo="'+photo.id+'">↻ virar no feed</button></div>'+
      '<div class="image-viewer-reactions">'+reactionButtons+'</div>'+
      '<section class="image-viewer-comments"><header><b>CONVERSA // '+comments.length+'</b><small>comentários sem pódio</small></header>'+
      '<div class="image-viewer-comment-list">'+(comments.map(c=>imageViewerCommentHtml(c,photo.user_id)).join('')||'<p class="image-viewer-empty">Ninguém comentou. A imagem sobreviveu.</p>')+'</div></section>'+
      '<form id="photo-viewer-comment-form" class="image-viewer-comment-form"><textarea maxlength="420" placeholder="comente a imagem..."></textarea><button type="submit">comentar</button></form>'+
    '</aside></section>';
  bindProfileLinks();
  host.querySelectorAll('[data-viewer-photo-react]').forEach(b=>b.onclick=()=>toggleViewerPhotoReaction(photo.id,b.dataset.viewerPhotoReact));
  host.querySelector('[data-viewer-turn-photo]')?.addEventListener('click',()=>turnPhotoToFeed(photo.id));
  host.querySelector('#photo-viewer-comment-form')?.addEventListener('submit',e=>{e.preventDefault();sendPhotoViewerComment(photo.id);});
  host.querySelectorAll('[data-photo-comment-delete]').forEach(b=>b.onclick=()=>deletePhotoViewerComment(b.dataset.photoCommentDelete,b.dataset.photoCommentPhoto));
}
async function sendPhotoViewerComment(photoId){
  const form=$('#photo-viewer-comment-form'),input=form?.querySelector('textarea');
  const body=String(input?.value||'').trim();
  if(body.length<2)return toast('Comentário curto demais até para 56K.');
  const {error}=await supabase.from('photo_comments').insert({photo_id:photoId,user_id:state.profile.id,body});
  if(error)return toast(state.suspended?'Sua conta está suspensa para novas interações.':'O comentário caiu atrás da imagem.');
  await openAlbumPhotoViewer(photoId);
}
async function deletePhotoViewerComment(commentId,photoId){
  if(!confirm('Apagar este comentário?'))return;
  const {error}=await supabase.from('photo_comments').delete().eq('id',commentId);
  if(error)return toast('O comentário se agarrou ao banco.');
  await openAlbumPhotoViewer(photoId);
}
async function toggleViewerPhotoReaction(photoId,reaction){
  const {data:existing}=await supabase.from('photo_reactions').select('reaction').eq('photo_id',photoId).eq('user_id',state.profile.id).maybeSingle();
  let result;
  if(existing?.reaction===reaction)result=await supabase.from('photo_reactions').delete().eq('photo_id',photoId).eq('user_id',state.profile.id);
  else result=await supabase.from('photo_reactions').upsert({photo_id:photoId,user_id:state.profile.id,reaction},{onConflict:'photo_id,user_id'});
  if(result.error)return toast(state.suspended?'Sua conta está suspensa para novas interações.':'A reação tropeçou.');
  await openAlbumPhotoViewer(photoId);
}
async function turnPhotoToFeed(photoId){
  if(!photoId)return;
  const {data,error}=await supabase.rpc('virar_foto',{p_photo_id:photoId});
  if(error)return toast(state.suspended?'Sua conta está suspensa para novas publicações.':'Não foi possível virar esta foto no feed.');
  toast('Foto virada no feed. O original continua com crédito, como deveria.');
  trackAction('photo_turned','feed',{photo_id:photoId,post_id:data});
  if(isFeedTab())loadFeed();
  loadImpact();
}
async function turnPostToFeed(postId){
  if(!postId)return;
  const {data,error}=await supabase.rpc('virar_post',{p_post_id:postId});
  if(error)return toast(state.suspended?'Sua conta está suspensa para novas publicações.':'Não foi possível virar esta publicação.');
  toast('Publicação virada no feed. A origem ficou presa nela, sem truque de autoria.');
  trackAction('post_turned','feed',{source_post_id:postId,post_id:data});
  if(isFeedTab())loadFeed();
  loadImpact();
}
async function openFeedImageViewer(postId){
  if(!postId)return;
  const dialog=ensureImageViewer(),host=$('#image-viewer-content');
  host.innerHTML='<div class="image-viewer-loading">abrindo pixels...</div>';
  if(!dialog.open)dialog.showModal();
  const {data:post,error}=await supabase.from('feed_attention').select('*').eq('id',postId).maybeSingle();
  if(error||!post){host.innerHTML='<div class="image-viewer-error">A publicação não está mais disponível.</div>';return;}
  const imageUrl=post.image_url?postImageSrc(post.image_url):(post.reshare_photo_storage_path?publicAlbumUrl(post.reshare_photo_storage_path):'');
  if(!imageUrl){host.innerHTML='<div class="image-viewer-error">Essa publicação perdeu a imagem no caminho.</div>';return;}
  const thread=await loadThreadData([post]);
  const comments=thread.responses[post.id]||[];
  const reactions=thread.reactions[post.id]||[];
  const reactionButtons=ACID_REACTIONS.map(([id,icon,label])=>{
    const rows=reactions.filter(x=>x.reaction===id);
    const active=rows.some(x=>x.user_id===state.profile.id);
    return '<button class="'+(active?'active':'')+'" data-viewer-post-react="'+id+'"><span>'+icon+'</span>'+escapeHtml(label)+(rows.length?' <b>'+rows.length+'</b>':'')+'</button>';
  }).join('');
  const turned=post.reshare_author_id?
    '<div class="post-turned-badge"><span>↻ VIRADO DO AVESSO</span><b>original: @'+escapeHtml(post.reshare_author_handle||'alguém')+'</b><small>virado por @'+escapeHtml(post.author_handle||'alguém')+'</small></div>':'';
  const commentHtml=comments.map(c=>'<article class="image-viewer-comment"><span class="mini-avatar">'+avatarHtml(c.author?.avatar_url,c.author?.display_name||'?')+'</span><div><header><button class="user-link" data-profile-id="'+escapeAttr(c.author_id)+'">'+escapeHtml(c.author?.display_name||'alguém')+'</button><small>@'+escapeHtml(c.author?.handle||'...')+' · '+ago(c.created_at)+'</small></header><p>'+escapeHtml(c.body)+'</p></div></article>').join('');
  host.innerHTML='<section class="image-viewer-grid">'+
    '<div class="image-viewer-stage"><img src="'+escapeAttr(imageUrl)+'" alt="Imagem da publicação"></div>'+
    '<aside class="image-viewer-social">'+
      '<header class="image-viewer-owner"><span class="mini-avatar">'+avatarHtml(post.author_avatar,post.author_name||'?')+'</span><div>'+
      '<button class="user-link" data-profile-id="'+post.author_id+'">'+escapeHtml(post.author_name||'alguém')+'</button><small>@'+escapeHtml(post.author_handle||'...')+' · '+ago(post.created_at)+'</small></div></header>'+
      turned+
      '<p class="image-viewer-caption">'+escapeHtml(post.body||'')+'</p>'+
      '<div class="image-viewer-actions"><button class="turn-feed-button" data-viewer-turn-post="'+post.id+'">↻ virar no feed</button></div>'+
      '<div class="image-viewer-reactions">'+reactionButtons+'</div>'+
      '<section class="image-viewer-comments"><header><b>CONVERSA // '+comments.length+'</b><small>sem algoritmo premiando interrupção</small></header><div class="image-viewer-comment-list">'+(commentHtml||'<p class="image-viewer-empty">Ainda sem comentários.</p>')+'</div></section>'+
      '<form id="post-viewer-comment-form" class="image-viewer-comment-form"><textarea maxlength="420" placeholder="entre na conversa..."></textarea><button type="submit">comentar</button></form>'+
    '</aside></section>';
  bindProfileLinks();
  host.querySelector('[data-viewer-turn-post]')?.addEventListener('click',()=>turnPostToFeed(post.id));
  host.querySelectorAll('[data-viewer-post-react]').forEach(b=>b.onclick=()=>toggleViewerPostReaction(post.id,b.dataset.viewerPostReact));
  host.querySelector('#post-viewer-comment-form')?.addEventListener('submit',e=>{e.preventDefault();sendPostViewerComment(post.id);});
}
async function sendPostViewerComment(postId){
  const input=$('#post-viewer-comment-form')?.querySelector('textarea');
  const body=String(input?.value||'').trim();
  if(body.length<2)return toast('Comentário curto demais.');
  const {error}=await supabase.from('responses').insert({post_id:postId,author_id:state.profile.id,body});
  if(error)return toast(state.suspended?'Sua conta está suspensa para novas interações.':'O comentário caiu no vazio.');
  if(isFeedTab())loadFeed();
  await openFeedImageViewer(postId);
}
async function toggleViewerPostReaction(postId,reaction){
  const {data:existing}=await supabase.from('post_reactions').select('reaction').eq('post_id',postId).eq('user_id',state.profile.id).maybeSingle();
  let result;
  if(existing?.reaction===reaction)result=await supabase.from('post_reactions').delete().eq('post_id',postId).eq('user_id',state.profile.id);
  else result=await supabase.from('post_reactions').upsert({post_id:postId,user_id:state.profile.id,reaction,updated_at:new Date().toISOString()},{onConflict:'post_id,user_id'});
  if(result.error)return toast(state.suspended?'Sua conta está suspensa para novas interações.':'A reação caiu no vazio.');
  if(isFeedTab())loadFeed();
  await openFeedImageViewer(postId);
}


function profileMediaCardHtml(row,editable=false){
  const label=row.media_kind==='youtube'?'▶ YOUTUBE':row.media_kind==='spotify'?'♫ SPOTIFY':row.media_kind==='video'?'▶ VÍDEO':'♫ ÁUDIO';
  const linked=['youtube','spotify'].includes(row.media_kind);
  return `<article class="profile-media-card" data-profile-media="${row.id}">
    <div class="profile-media-head"><span>${label}</span><small>${ago(row.created_at)}</small></div>
    ${feedMediaHtml(row.media_url,row.media_kind,{compact:true})}
    <p data-profile-media-caption="${row.id}">${escapeHtml(row.caption||'sem legenda. silêncio também é curadoria.')}</p>
    ${editable?`<div class="profile-media-owner-actions"><button data-profile-media-edit="${row.id}">editar</button><button class="profile-media-delete" data-profile-media-delete="${row.id}" data-profile-media-path="${escapeAttr(row.storage_path||'')}">apagar mídia</button></div><div class="profile-media-edit hidden" data-profile-media-edit-panel="${row.id}"><textarea maxlength="420">${escapeHtml(row.caption||'')}</textarea>${linked?`<input type="url" value="${escapeAttr(externalMediaShareUrl(row.media_url))}" data-profile-media-link-input="${row.id}" placeholder="novo link do YouTube ou Spotify">`:''}<div><button data-profile-media-save="${row.id}">salvar</button><button data-profile-media-cancel="${row.id}">cancelar</button></div></div>`:''}
  </article>`;
}
async function loadProfileMedia(userId,editable=false,selector=editable?'#profile-media-list':'#public-media-list'){
  const host=$(selector);if(!host||!userId)return;
  const {data,error}=await supabase.from('profile_media').select('id,user_id,media_url,storage_path,media_kind,caption,created_at').eq('user_id',userId).order('created_at',{ascending:false}).limit(36);
  if(error){host.innerHTML='<p class="profile-media-empty">A discoteca caiu atrás do servidor.</p>';return;}
  host.innerHTML=(data||[]).map(row=>profileMediaCardHtml(row,editable)).join('')||'<p class="profile-media-empty">Nada tocando por aqui. Silêncio também é curadoria.</p>';
  host.querySelectorAll('[data-profile-media-delete]').forEach(b=>b.onclick=()=>deleteProfileMedia(b.dataset.profileMediaDelete,b.dataset.profileMediaPath));
  host.querySelectorAll('[data-profile-media-edit]').forEach(b=>b.onclick=()=>host.querySelector(`[data-profile-media-edit-panel="${b.dataset.profileMediaEdit}"]`)?.classList.remove('hidden'));
  host.querySelectorAll('[data-profile-media-cancel]').forEach(b=>b.onclick=()=>host.querySelector(`[data-profile-media-edit-panel="${b.dataset.profileMediaCancel}"]`)?.classList.add('hidden'));
  host.querySelectorAll('[data-profile-media-save]').forEach(b=>b.onclick=()=>saveProfileMediaEdit(b.dataset.profileMediaSave));
}
async function uploadProfileMedia(){
  const external=parseExternalMediaLink($('#profile-media-link')?.value||'');
  if(!external)return toast('Cole um link válido do YouTube ou Spotify.');
  const caption=String($('#profile-media-caption')?.value||'').trim().slice(0,420);
  const btn=$('#profile-media-upload');if(btn){btn.disabled=true;btn.textContent='publicando...';}
  const {error}=await supabase.from('profile_media').insert({
    user_id:state.profile.id,
    media_url:external.url,
    storage_path:null,
    media_kind:external.kind,
    caption
  });
  if(btn){btn.disabled=false;btn.textContent='publicar no Canto';}
  if(error)return toast('O link chegou, mas o Canto fingiu que não conhece.');
  $('#profile-media-link').value='';$('#profile-media-caption').value='';
  toast(external.kind==='youtube'?'YouTube incorporado ao seu Canto.':'Spotify incorporado ao seu Canto.');
  loadProfileMedia(state.profile.id,true,'#profile-media-list');
}
async function saveProfileMediaEdit(id){
  const panel=document.querySelector(`[data-profile-media-edit-panel="${CSS.escape(id)}"]`);
  if(!panel)return;
  const caption=String(panel.querySelector('textarea')?.value||'').trim().slice(0,420);
  const linkInput=panel.querySelector('[data-profile-media-link-input]');
  const patch={caption};
  if(linkInput){
    const parsed=parseExternalMediaLink(linkInput.value);
    if(!parsed)return toast('O novo link precisa ser do YouTube ou Spotify.');
    patch.media_url=parsed.url;patch.media_kind=parsed.kind;
  }
  const {error}=await supabase.from('profile_media').update(patch).eq('id',id).eq('user_id',state.profile.id);
  if(error)return toast('A edição não foi salva.');
  toast('Mídia editada. O passado digital aceitou revisão.');
  loadProfileMedia(state.profile.id,true,'#profile-media-list');
}
async function deleteProfileMedia(id,path){
  if(!id||!confirm('Apagar esta mídia do seu Canto?'))return;
  const {error}=await supabase.from('profile_media').delete().eq('id',id).eq('user_id',state.profile.id);
  if(error)return toast('A mídia se recusou a sair do palco.');
  if(path)await supabase.storage.from('avesso-media').remove([path]);
  loadProfileMedia(state.profile.id,true,'#profile-media-list');
}

async function renderProfile(){
  $('#feed-status').classList.add('hidden');
  const mode=state.world.preferences?.participation_mode||'world';
  const interferenceOnline=Boolean(state.world.settings?.world_interventions_enabled);
  $('#feed-list').innerHTML=`<section class="profile-control" style="--profile-wallpaper:url('${wallpaperUrl(state.profile.profile_wallpaper)}')">
    <header class="profile-control-hero">
      <div class="profile-avatar-large">${avatarHtml(state.profile.avatar_url,state.profile.display_name)}</div>
      <div class="profile-hero-identity"><span class="section-code">MEU CANTO // IDENTIDADE</span><div class="profile-name-listening-row"><h2>${escapeHtml(state.profile.display_name)}${state.staffRole==='owner'?adminCrownHtml('profile-admin-crown'):''}</h2><div id="profile-hero-listening" class="profile-hero-listening profile-hero-listening-inline">${nowPlayingHtml(state.profile)||'<div class="now-playing-empty compact">aguardando o player...</div>'}</div></div><p>@${escapeHtml(state.profile.handle)}</p><div id="profile-hero-corner-music">${cornerMusicBadgeHtml(state.profile,{owner:true})}</div><button id="open-avatar-picker">mudar foto de perfil</button></div>
    </header>
    <section class="profile-story-section">
      <div><span class="section-code">STORIES // SEU CANTO</span><h2>24 horas de contexto questionável</h2><p>Publique daqui também. Amigos e outros usuários podem reagir e comentar conforme a visibilidade escolhida.</p></div>
      <button id="profile-story-create">＋ postar story</button>
      <div id="profile-story-list" class="profile-story-list"><p class="story-empty">procurando coisas que ainda não expiraram...</p></div>
    </section>
    <div class="profile-settings-grid">
      <section class="profile-settings-card"><span class="section-code">PERFIL</span><label>Nome exibido <small>livre como nickname de MSN; símbolos e emojis são bem-vindos</small><input id="profile-display-name" maxlength="80" value="${escapeAttr(state.profile.display_name)}"></label><label>Status ao lado do nome <small>aparece de forma compacta nas conversas</small><input id="profile-status" maxlength="140" value="${escapeAttr(state.profile.status_message||'')}" placeholder="online, mas discutivelmente disponível"></label><label>Aparecer como<select id="profile-presence"><option value="online">● online</option><option value="away">◐ ausente</option><option value="invisible">○ invisível</option></select></label><label>Bio<textarea id="profile-bio" maxlength="300">${escapeHtml(state.profile.bio||'')}</textarea></label><button id="save-profile-settings">salvar alterações</button></section>
      <section class="profile-settings-card listening-privacy-card"><span class="section-code">PRIVACIDADE // OUVINDO AGORA</span><h3>Seu player não precisa virar testemunha</h3><label class="listening-privacy-switch"><input id="listening-visible" type="checkbox" ${state.profile.listening_visible?'checked':''}><span><b>mostrar o que estou ouvindo</b><small>ativa o status musical no seu Canto</small></span></label><label class="listening-privacy-switch"><input id="chat-listening-visible" type="checkbox" ${state.profile.chat_listening_visible!==false?'checked':''}><span><b>mostrar também nas conversas</b><small>fica ao lado do seu nome, sem ocupar a coluna do avatar</small></span></label><div id="profile-now-playing-preview" class="profile-now-playing-preview">${nowPlayingHtml(state.profile)||'<div class="now-playing-empty">nada detectado agora. o silêncio também tem presença.</div>'}</div><div class="manual-now-playing"><span>FALLBACK MANUAL // SÓ SE A PONTE NÃO ESTIVER DISPONÍVEL</span><input id="manual-now-playing-url" type="url" inputmode="url" autocomplete="off" placeholder="YouTube ou Spotify"><div><button id="save-manual-now-playing" type="button">usar este link</button><button id="stop-now-playing" type="button">parar de ouvir</button></div></div><button id="save-listening-privacy" type="button">salvar privacidade</button><small id="listening-bridge-status">${state.presenceBridgeSeen?'PONTE ATIVA // recebendo do navegador':'PONTE AUSENTE // use o link manual ou o AVESSO Presence'}</small><em>A detecção automática de outras abas exige o AVESSO Presence. Sem ele, o link manual funciona no desktop e no celular. Navegadores comuns não deixam um site bisbilhotar o resto do aparelho. Uma rara decisão sensata.</em></section>
      <section class="profile-settings-card security-card"><span class="section-code">CONTA // SEGURANÇA</span><p><b>E-mail</b><br>${escapeHtml(state.session?.user?.email||'')}</p><label>Nova senha<input id="profile-password" type="password" minlength="8" autocomplete="new-password"></label><label>Confirmar nova senha<input id="profile-password-confirm" type="password" minlength="8" autocomplete="new-password"></label><button id="change-password">alterar senha</button><small>Seu @ continua estável para links. Seu nome exibido pode trocar de personalidade quantas vezes quiser.</small></section>
    </div>
    <section class="wallpaper-control"><span class="section-code">AMBIENTE // 10 REALIDADES DISPONÍVEIS</span><h2>Seu Canto não precisa parecer aluguel mobiliado</h2><p>Escolha um cenário para o perfil e outro para o AVESSO inteiro. Porque até o caos merece papel de parede.</p><div class="wallpaper-current-grid"><button id="choose-profile-wallpaper" style="--thumb:url('${wallpaperUrl(state.profile.profile_wallpaper)}')"><span>MEU CANTO</span><b>${escapeHtml(WALLPAPER_OPTIONS.find(x=>x[0]===state.profile.profile_wallpaper)?.[1]||'Cidade 56K')}</b></button><button id="choose-app-wallpaper" style="--thumb:url('${wallpaperUrl(state.profile.app_wallpaper)}')"><span>AVESSO</span><b>${escapeHtml(WALLPAPER_OPTIONS.find(x=>x[0]===state.profile.app_wallpaper)?.[1]||'Cidade 56K')}</b></button></div></section>
    <section class="corner-music-control"><span class="section-code">TRILHA // ENTRADA DO CANTO</span><h2>Uma música entra antes da conversa</h2><p>O visitante não vê player nenhum. Cole YouTube ou Spotify e escolha se a trilha tenta tocar automaticamente quando alguém entra.</p><div class="corner-music-form"><label>LINK DA MÚSICA<input id="corner-music-url" type="url" inputmode="url" autocomplete="off" value="${escapeAttr(state.profile.corner_music_url||'')}" placeholder="YouTube ou Spotify"></label><label class="corner-music-switch"><input id="corner-music-enabled" type="checkbox" ${state.profile.corner_music_enabled?'checked':''}><span><b>tocar automaticamente</b><small>você pode desligar e ligar novamente sem perder o link</small></span></label><div class="corner-music-actions"><button id="save-corner-music">salvar trilha</button><button id="clear-corner-music" type="button">remover</button></div><small id="corner-music-status">${state.profile.corner_music_url?(state.profile.corner_music_enabled?'ATIVA // visitantes recebem a trilha ao entrar':'DESLIGADA // link guardado'):'SEM FITA // escolha um link quando quiser'}</small><em>Nota técnica: Firefox, Chrome e Brave podem bloquear áudio automático até a primeira interação do visitante. O AVESSO tenta de novo nesse primeiro clique, sem mostrar o player.</em></div></section>
    <section class="profile-album-control"><span class="section-code">ÁLBUM // FOTOS QUE VOCÊ DECIDIU NÃO APAGAR</span><h2>Seu álbum</h2><p>Poste imagens no seu Canto. Reações existem, mas continuam sem virar olimpíada social.</p><div class="album-upload-row"><input id="album-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"><input id="album-caption" maxlength="180" placeholder="legenda opcional. autocontrole também."><button id="album-upload">adicionar foto</button></div><div id="profile-album" class="profile-album-grid"><p>carregando memórias...</p></div></section>
    <section class="profile-media-control"><span class="section-code">MÍDIA // SOM & MOVIMENTO</span><h2>Sua fita, seu clipe, seu problema</h2><p>Cole um link do YouTube ou Spotify. Sem upload de arquivo e sem autoplay, porque ainda resta alguma civilização.</p><div class="profile-media-upload link-only"><input id="profile-media-link" type="url" inputmode="url" placeholder="cole um link do YouTube ou Spotify"><input id="profile-media-caption" maxlength="420" placeholder="legenda opcional. contexto não machuca."><button id="profile-media-upload">publicar no Canto</button></div><div id="profile-media-list" class="profile-media-grid"><p>rebobinando...</p></div></section>
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
    <div class="ai-context-card ${state.profile.ai_browser_context_visible?'enabled':'disabled'}"><div class="ai-context-copy"><span class="ai-context-code">AQUELE QUE LÊ TUDO // CONTEXTO EXTERNO</span><b>Perceber troca de aba</b><small>Com AVESSO Presence, ele recebe apenas domínio, título visível da aba e se existe áudio. Não recebe texto digitado, mensagens, formulários nem conteúdo interno.</small><small id="ai-browser-context-status">${state.profile.ai_browser_context_visible?'ATIVO // contexto mínimo liberado':'DESLIGADO // só enxerga o que acontece dentro do AVESSO'}</small></div><label class="ai-context-switch" title="Permitir contexto mínimo de outras abas"><input id="ai-browser-context-visible" type="checkbox" ${state.profile.ai_browser_context_visible?'checked':''}><span aria-hidden="true"></span><em>${state.profile.ai_browser_context_visible?'ON':'OFF'}</em></label></div>
    <div class="world-pref-foot"><span id="profile-world-status">carregando modo...</span><small>${interferenceOnline?'Interferências visuais globais estão online.':'O motor visual ainda está bloqueado globalmente.'} Personagens nunca reescrevem o que você publicou.</small></div>
  </section>`;
  $('#open-avatar-picker').onclick=openAvatarDialog;
  $('#profile-story-create').onclick=openStoryCreate;
  $('#save-profile-settings').onclick=saveProfileSettings;
  $('#save-listening-privacy').onclick=saveListeningPrivacy;
  $('#save-manual-now-playing').onclick=saveManualNowPlaying;
  $('#stop-now-playing').onclick=stopNowPlayingStatus;
  const browserContextToggle=$('#ai-browser-context-visible');if(browserContextToggle)browserContextToggle.onchange=saveAIBrowserContextVisibility;
  $('#change-password').onclick=changePassword;
  $('#profile-presence').value=state.profile.presence_mode||'online';
  $('#profile-presence').onchange=e=>setPresenceMode(e.target.value);
  $('#album-upload').onclick=uploadAlbumPhoto;
  $('#profile-media-upload').onclick=uploadProfileMedia;
  $('#save-corner-music').onclick=saveCornerMusicSettings;
  $('#clear-corner-music').onclick=clearCornerMusicSettings;
  $('#corner-music-url').oninput=e=>{
    const status=$('#corner-music-status');
    if(!e.target.value.trim())status.textContent='SEM FITA // escolha um link quando quiser';
    else status.textContent=parseExternalMediaLink(e.target.value)?'LINK RECONHECIDO // pronto para salvar':'LINK NÃO RECONHECIDO // use YouTube ou Spotify';
  };
  $('#choose-profile-wallpaper').onclick=()=>openWallpaperDialog('profile');
  $('#choose-app-wallpaper').onclick=()=>openWallpaperDialog('app');
  document.querySelectorAll('[data-world-mode]').forEach(b=>b.onclick=()=>saveWorldMode(b.dataset.worldMode));
  setWorldModeLabel();
  loadFriendPanel();
  loadBlockedPanel();
  loadProfileStories(state.profile.id,'#profile-story-list');
  loadAlbum(state.profile.id,true);
  loadProfileMedia(state.profile.id,true,'#profile-media-list');
  loadGuestbook(state.profile.id,'#profile-guestbook');
  if(state.profile.corner_music_url&&!state.profile.corner_music_title){
    resolveMediaMetadata(state.profile.corner_music_url).then(async metadata=>{
      if(!metadata?.title||state.tab!=='profile')return;
      const patch={corner_music_title:metadata.title,corner_music_provider:metadata.provider||state.profile.corner_music_provider||null,updated_at:new Date().toISOString()};
      const {data}=await supabase.from('profiles').update(patch).eq('id',state.profile.id).select().single();
      if(data){
        state.profile=data;
        const hero=$('#profile-hero-corner-music');if(hero)hero.innerHTML=cornerMusicBadgeHtml(state.profile,{owner:true});
      }
    });
  }
  algoSay('profile');
  window.postMessage({type:'AVESSO_PRESENCE_REQUEST'},location.origin);
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
  stopCornerMusic();
  if(userId===state.profile.id){document.querySelector('[data-app-tab="profile"]')?.click();return;}
  state.tab='public_profile';state.publicProfileId=userId;bumpView();
  document.querySelectorAll('[data-app-tab]').forEach(x=>x.classList.remove('active'));
  applyAppTabLayout();$('#feed-status').classList.add('hidden');
  const [profileRes,friendship]=await Promise.all([
    supabase.from('profiles').select('id,display_name,handle,bio,avatar_url,status_message,created_at,profile_wallpaper,presence_mode,last_seen,online_until,away_after_minutes,corner_music_url,corner_music_enabled,corner_music_title,corner_music_provider,listening_visible,chat_listening_visible,now_playing_title,now_playing_artist,now_playing_source,now_playing_url,now_playing_updated_at,now_playing_manual').eq('id',userId).maybeSingle(),
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
    <header class="public-profile-hero"><div class="public-profile-avatar">${avatarHtml(p.avatar_url,p.display_name)}</div><div class="public-profile-identity"><span class="section-code">CANTO // @${escapeHtml(p.handle)}</span><div class="public-profile-name-row"><h1 class="identity-name" data-identity-profile-id="${p.id}">${escapeHtml(p.display_name)}</h1><span class="public-presence"><i class="presence-dot ${presenceView(p).mode}"></i> ${presenceView(p).label}</span></div><p class="status-line">${escapeHtml(p.status_message||'sem mensagem de status')}</p><div class="public-profile-sound-row"><div id="public-now-playing">${nowPlayingHtml(p)}</div><div id="public-corner-music">${cornerMusicBadgeHtml(p)}</div></div><p class="public-profile-bio">${escapeHtml(p.bio||'Sem bio. Uma pessoa que conseguiu parar de digitar.')}</p><div class="public-profile-actions">${friendControl}<button class="report-user-button" data-report-user="${p.id}">⚑ denunciar usuário</button></div></div></header>
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
    <section class="public-media"><span class="section-code">MÍDIA // SOM & MOVIMENTO</span><h2>Mídia publicada por ${escapeHtml(p.display_name)}</h2><div id="public-media-list" class="profile-media-grid"><p>procurando fitas...</p></div></section>
  </section>`;
  $('#back-from-profile').onclick=()=>document.querySelector('[data-app-tab="feed"]')?.click();
  $('[data-add-friend]')?.addEventListener('click',e=>requestFriend(e.currentTarget.dataset.addFriend));
  $('[data-accept-public]')?.addEventListener('click',async e=>{await answerFriendRequest(e.currentTarget.dataset.acceptPublic,true);openPublicProfile(userId);});
  $('[data-message-friend]')?.addEventListener('click',e=>openFriendChat(e.currentTarget.dataset.messageFriend));
  $('[data-unfriend-public]')?.addEventListener('click',async e=>{if(confirm('Desfazer amizade? Sem textão de despedida.')){await supabase.from('friendships').delete().eq('id',e.currentTarget.dataset.unfriendPublic);openPublicProfile(userId);}});
  $('[data-report-user]')?.addEventListener('click',e=>openReportUser(e.currentTarget.dataset.reportUser));
  $('#guestbook-submit')?.addEventListener('click',()=>sendGuestbookEntry(userId));
  loadGuestbook(userId,'#public-guestbook-list');
  loadAlbum(userId,false);
  loadProfileMedia(userId,false,'#public-media-list');
  loadProfileStories(userId,'#public-story-list');
  startCornerMusic(p);
  if(p.corner_music_url&&!p.corner_music_title){
    resolveMediaMetadata(p.corner_music_url).then(metadata=>{
      if(!metadata||state.tab!=='public_profile'||state.publicProfileId!==p.id)return;
      p.corner_music_title=metadata.title||p.corner_music_title;
      p.corner_music_provider=metadata.provider||p.corner_music_provider;
      refreshPublicCornerMusicControl(p);
    });
  }
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
      setTimeout(()=>maybeAqueleReaction('aquele_observed',{control:label,surface:state.tab},{chance:.12,cooldown:5*60*1000}),900);
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
      const event=payload.new||{};
      if(event.status!=='active')return;
      if(event.config?.creator==='rei_engajamento'){
        renderTowerEventCard(event);
        if(state.tab==='tower')renderTowerPage();
        if(event.config?.importance==='important'){
          socialNotify({title:'♛ Torre do Engajamento',body:event.title||'O Rei publicou algo que, contra as probabilidades, merece atenção.',kind:'world'});
        }
        return;
      }
      if(event.config?.importance==='important')toast(`EVENTO DO MUNDO // ${event.title}`);
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'post_reactions'},()=>{if(isFeedTab())loadFeed();})
    .on('postgres_changes',{event:'*',schema:'public',table:'profile_media'},payload=>{
      const row=payload.new?.user_id?payload.new:(payload.old||{});
      if(state.tab==='profile'&&row.user_id===state.profile?.id)loadProfileMedia(state.profile.id,true,'#profile-media-list');
      if(state.tab==='public_profile'&&row.user_id===state.publicProfileId)loadProfileMedia(state.publicProfileId,false,'#public-media-list');
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'guestbook_entries'},payload=>{
      const row=payload.new?.profile_id?payload.new:(payload.old||{});
      if(state.tab==='profile'&&row.profile_id===state.profile?.id)loadGuestbook(state.profile.id,'#profile-guestbook');
      if(state.tab==='public_profile'&&row.profile_id===state.publicProfileId)loadGuestbook(state.publicProfileId,'#public-guestbook-list');
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'character_interactions'},payload=>{
      const row=payload.new||{};
      if(row.trigger_type==='plaza_chat')return;
      if(['music_changed','browser_tab_changed','aquele_observed'].includes(row.trigger_type))return;
      if(row.user_id&&row.user_id!==state.profile?.id&&row.visibility!=='world')return;
      const c=state.world.charactersById[row.character_id];
      if(state.tab==='plaza'&&c?.slug!=='npc')return;
      if(state.tab==='tower'&&c?.slug!=='rei_engajamento')return;
      if(c?.slug==='rei_engajamento'&&row.trigger_type==='king_broadcast')return;
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

await Promise.all([loadSiteSettings(),loadPublicExperience()]);
const {data:{session}}=await supabase.auth.getSession();state.session=session;if(session)enterApp();else showAuthLinkError();
