import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const SITE_URL = new URL('./', import.meta.url).href;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { session:null, profile:null, recipient:null, mode:'signup', tab:'feed', world:{preferences:null,settings:null,characters:{},charactersById:{},dialogues:[],idleTimer:null,encounterTimer:null,lastInteractionId:null} };

function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }
function initials(name='?'){ return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function ago(date){ const s=Math.floor((Date.now()-new Date(date))/1000); if(s<60)return'agora'; if(s<3600)return`${Math.floor(s/60)}min`; if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`; }
function escapeHtml(value=''){ const d=document.createElement('div'); d.textContent=value; return d.innerHTML; }

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
function characterImage(character){
  return character?.avatar_url||character?.image_path||'';
}
function showEncounter(payload,preview=false){
  const card=$('#world-encounter');
  if(!card||!payload?.character)return;
  const interaction=payload.interaction||{};
  if(!preview&&interaction.id&&interaction.id===state.world.lastInteractionId)return;
  if(!preview&&interaction.id)state.world.lastInteractionId=interaction.id;
  const c=payload.character;
  const known=state.world.characters[c.slug]||c;
  const img=characterImage(known);
  $('#encounter-image').src=img;
  $('#encounter-image').alt=c.name||known.name||'Habitante';
  $('#encounter-name').textContent=c.name||known.name||'Habitante';
  $('#encounter-role').textContent=c.role||known.role||'habitante do AVESSO';
  $('#encounter-line').textContent=interaction.body||payload.text||'...';
  $('#encounter-source').textContent=preview?'ARQUIVO DO HABITANTE':(interaction.source==='ai'||payload.ai?'IA // AO VIVO':'MUNDO // ROTEIRO');
  card.classList.remove('hidden');
  card.classList.remove('pulse-in');
  requestAnimationFrame(()=>card.classList.add('pulse-in'));
  clearTimeout(state.world.encounterTimer);
  state.world.encounterTimer=setTimeout(()=>card.classList.add('hidden'),18000);
}
async function askWorldCharacter(trigger,options={}){
  if(!state.session||!state.profile)return null;
  try{
    const {data,error}=await supabase.functions.invoke('world-character',{body:{
      trigger,
      character:options.character||null,
      post_id:options.post_id||null
    }});
    if(error||!data||data.skipped)return null;
    showEncounter(data);
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
    await askWorldCharacter('idle');
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
  $('[data-world-mode]').forEach(b=>b.disabled=true);
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
    $('[data-world-mode]').forEach(b=>b.disabled=false);
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
  toast(messages[mode]);
}

$('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>$('#auth-dialog').showModal()));
$('#encounter-close').onclick=()=>{$('#world-encounter').classList.add('hidden');clearTimeout(state.world.encounterTimer);};
$('.dialog-close').onclick=()=>$('#auth-dialog').close();
$$('[data-auth-mode]').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.authMode));
function setAuthMode(mode){ state.mode=mode; $$('[data-auth-mode]').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode)); $('#signup-fields').classList.toggle('hidden',mode==='login'); $('#resend-confirmation').classList.add('hidden'); $('#auth-submit').textContent=mode==='login'?'entrar':'criar meu canto'; $('#auth-message').textContent=''; }

$('#auth-form').addEventListener('submit',async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const email=f.get('email');const password=f.get('password');$('#auth-submit').disabled=true;$('#auth-message').textContent='conversando com os computadores...';let result;if(state.mode==='signup'){const handle=String(f.get('handle')||'').toLowerCase();const display_name=String(f.get('display_name')||'');if(!/^[a-z0-9_]{3,24}$/.test(handle)){result={error:{message:'Seu @ precisa ter 3–24 letras minúsculas, números ou _.'}}}else{result=await supabase.auth.signUp({email,password,options:{data:{handle,display_name},emailRedirectTo:SITE_URL}});}}else result=await supabase.auth.signInWithPassword({email,password});$('#auth-submit').disabled=false;if(result.error){$('#auth-message').textContent=humanError(result.error.message);return}if(state.mode==='signup'&&!result.data.session){$('#auth-message').textContent='Confira seu e-mail e use o link mais recente. Se já confirmou a conta, abra a aba de entrar e use sua senha.';$('#resend-confirmation').classList.remove('hidden');return}$('#auth-dialog').close();toast('Você entrou. Tente não estragar tudo.');});

$('#resend-confirmation').onclick=async()=>{const email=new FormData($('#auth-form')).get('email');if(!email)return toast('Digite seu e-mail primeiro. Adivinhação ainda está em beta.');const button=$('#resend-confirmation');button.disabled=true;button.textContent='reenviando...';const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:SITE_URL}});button.disabled=false;button.textContent='reenviar confirmação de e-mail';if(error){$('#auth-message').textContent=humanError(error.message);return}$('#auth-message').textContent='Se a conta ainda estiver pendente, você receberá um novo link. Se já confirmou, entre com sua senha.';toast('Solicitação recebida. Confira seu e-mail ou tente entrar.');};

function humanError(m){const value=String(m||'');const lower=value.toLowerCase();if(lower.includes('email not confirmed'))return'Confirme seu e-mail antes de entrar. Use o link mais recente ou solicite outro na aba de cadastro.';if(lower.includes('invalid login'))return'E-mail ou senha não conferem. Se você já confirmou, use a senha do cadastro.';if(lower.includes('already registered'))return'Este e-mail já tem cadastro. Use a aba de entrar.';if(lower.includes('expired')||lower.includes('otp_expired'))return'Este link expirou ou já foi utilizado. Se já confirmou, entre com sua senha.';if(lower.includes('password'))return'A senha precisa atender aos requisitos de segurança.';return value;}
$('#logout').onclick=()=>supabase.auth.signOut();

supabase.auth.onAuthStateChange((_event,session)=>{state.session=session;if(session)enterApp();else leaveApp();});
async function enterApp(){ $('#marketing-view').classList.add('hidden');$('.site-header').classList.add('hidden');$('.site-footer').classList.add('hidden');$('#app-view').classList.remove('hidden');const {data}=await supabase.from('profiles').select('*').eq('id',state.session.user.id).single();state.profile=data;if(!data){toast('Seu perfil ainda está acordando. Atualize em alguns segundos.');return}$('#nav-name').textContent=data.display_name;$('#nav-handle').textContent='@'+data.handle;$('#nav-avatar').textContent=initials(data.display_name);await loadWorldState();await Promise.all([loadFeed(),loadImpact()]);subscribeRealtime();scheduleIdleWorld();setTimeout(()=>askWorldCharacter('login'),1400);}
function leaveApp(){clearTimeout(state.world.idleTimer);state.profile=null;$('#app-view').classList.add('hidden');$('#marketing-view').classList.remove('hidden');$('.site-header').classList.remove('hidden');$('.site-footer').classList.remove('hidden');}

let searchTimer;$('#recipient-search').addEventListener('input',e=>{state.recipient=null;clearTimeout(searchTimer);const q=e.target.value.trim();if(q.length<2){$('#recipient-results').classList.add('hidden');return}searchTimer=setTimeout(()=>searchProfiles(q),250)});
async function searchProfiles(q){const {data,error}=await supabase.from('profiles').select('id,handle,display_name').or(`handle.ilike.%${q}%,display_name.ilike.%${q}%`).neq('id',state.profile.id).limit(6);if(error)return toast('A busca tropeçou. Tente de novo.');const box=$('#recipient-results');box.innerHTML=(data||[]).map(p=>`<button data-user='${p.id}' data-name='${escapeHtml(p.display_name)}' data-handle='${escapeHtml(p.handle)}'><span>${escapeHtml(p.display_name)}</span><small>@${escapeHtml(p.handle)}</small></button>`).join('')||'<button disabled>ninguém encontrado neste pedaço da internet</button>';box.classList.remove('hidden');box.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>{state.recipient={id:b.dataset.user,name:b.dataset.name,handle:b.dataset.handle};$('#recipient-search').value=`${b.dataset.name} (@${b.dataset.handle})`;box.classList.add('hidden')});}

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
$('#post-body').addEventListener('input',e=>$('#char-count').textContent=420-e.target.value.length);
$('#publish-post').onclick=async()=>{
  const body=$('#post-body').value.trim();
  const directed=$('#post-target').value==='person';
  if(directed&&!state.recipient)return toast('Escolha alguém na busca para direcionar sua mensagem.');
  if(body.length<12)return toast('O mínimo são 12 caracteres. A conversa merece mais que um aceno.');
  const {data:createdPost,error}=await supabase.from('posts').insert({
    author_id:state.profile.id,
    recipient_id:directed?state.recipient.id:null,
    body,
    visibility:directed?$('#post-visibility').value:'publico'
  }).select('id').single();
  if(error)return toast('Não foi possível publicar. Tente novamente.');
  $('#post-body').value='';
  $('#recipient-search').value='';
  $('#char-count').textContent='420';
  state.recipient=null;
  toast(directed?'Mensagem entregue.':'Publicado para a comunidade. Sem placar, com conversa.');
  loadFeed();
  loadImpact();
  if(createdPost?.id)setTimeout(()=>askWorldCharacter('post_created',{post_id:createdPost.id}),500);
};

async function loadThreadData(posts){
  const ids=posts.map(p=>p.id);
  if(!ids.length)return{responses:{},supports:{}};
  const [responsesRes,supportRes,characterRes]=await Promise.all([
    supabase.from('responses').select('id,post_id,author_id,body,created_at').in('post_id',ids).order('created_at',{ascending:true}),
    supabase.from('support_signals').select('post_id,supporter_id,kind,created_at').in('post_id',ids).order('created_at',{ascending:true}),
    supabase.from('character_interactions').select('id,post_id,character_id,body,created_at,source,visibility').in('post_id',ids).order('created_at',{ascending:true})
  ]);
  const responses=responsesRes.data||[];
  const supports=supportRes.data||[];
  const characterReplies=(characterRes.data||[]).filter(x=>x.post_id);
  const profileIds=[...new Set([...responses.map(r=>r.author_id),...supports.map(s=>s.supporter_id)].filter(Boolean))];
  let profiles={};
  if(profileIds.length){
    const {data}=await supabase.from('profiles').select('id,display_name,handle').in('id',profileIds);
    profiles=Object.fromEntries((data||[]).map(p=>[p.id,p]));
  }
  const byPost={};
  const supportByPost={};
  const charactersByPost={};
  for(const r of responses)(byPost[r.post_id]??=[]).push({...r,author:profiles[r.author_id]});
  for(const s of supports)(supportByPost[s.post_id]??=[]).push({...s,supporter:profiles[s.supporter_id]});
  for(const x of characterReplies)(charactersByPost[x.post_id]??=[]).push({...x,character:state.world.charactersById[x.character_id]});
  return{responses:byPost,supports:supportByPost,characters:charactersByPost};
}
function supportLabel(kind){
  return({escutei:'escutei você',posso_ajudar:'posso ajudar',estou_aqui:'estou aqui'})[kind]||kind;
}
async function loadFeed(){
  const status=$('#feed-status');
  status.classList.remove('hidden');
  status.textContent='ordenando pelo que importa, ideia radical...';
  algoSay('feed_loading');
  let query=supabase.from('feed_attention').select('*');
  if(state.tab==='quiet')query=query.eq('response_count',0);
  if(state.tab==='sent')query=query.eq('author_id',state.profile.id);
  const {data,error}=await query.order('attention_need',{ascending:false}).limit(40);
  if(error){
    status.textContent='O feed falhou. Até o anti-algoritmo tem segunda-feira.';
    algoSay('feed_error');
    return;
  }
  const posts=data||[];
  const threadData=await loadThreadData(posts);
  status.classList.add('hidden');
  renderFeed(posts,threadData);
  if(posts.some(p=>p.response_count===0)){
    algoSay('feed_attention');
    if(state.tab==='feed')setTimeout(()=>askWorldCharacter('feed_attention'),2200);
  }else if(posts.length)algoSay('feed_default');
}
function renderFeed(posts,threadData={responses:{},supports:{},characters:{}}){
  const list=$('#feed-list');
  if(!posts.length){
    list.innerHTML='<div class="feed-status">Nada aqui. Talvez as pessoas estejam vivendo. Estranho, mas permitido.</div>';
    algoSay('feed_empty');
    return;
  }
  list.innerHTML=posts.map(p=>{
    const responses=threadData.responses[p.id]||[];
    const supports=threadData.supports[p.id]||[];
    const characterReplies=threadData.characters[p.id]||[];
    const responseHtml=responses.length?`<div class="thread-block"><div class="thread-title">CONVERSA // ${responses.length} ${responses.length===1?'RESPOSTA':'RESPOSTAS'}</div>${responses.map(r=>`<div class="thread-reply"><span class="mini-avatar">${initials(r.author?.display_name||'?')}</span><div><div class="thread-author">${escapeHtml(r.author?.display_name||'alguém')} <small>@${escapeHtml(r.author?.handle||'...')} · ${ago(r.created_at)}</small></div><p>${escapeHtml(r.body)}</p></div></div>`).join('')}</div>`:'';
    const characterHtml=characterReplies.length?`<div class="thread-block character-thread"><div class="thread-title">MUNDO // HABITANTES</div>${characterReplies.map(x=>{const c=x.character||{};return `<div class="thread-reply character-reply"><img src="${escapeHtml(characterImage(c))}" alt="${escapeHtml(c.name||'Habitante')}"><div><div class="thread-author">${escapeHtml(c.name||'Habitante')} <b>HABITANTE</b> <small>· ${ago(x.created_at)}</small></div><p>${escapeHtml(x.body)}</p></div></div>`}).join('')}</div>`:'';
    const supportHtml=supports.length?`<div class="private-support-log"><span>PRIVADO // APOIO</span>${supports.map(s=>`<p><strong>${escapeHtml(s.supporter?.display_name||'alguém')}</strong> sinalizou: “${escapeHtml(supportLabel(s.kind))}”.</p>`).join('')}</div>`:'';
    const canSupport=p.author_id!==state.profile.id;
    return `<article class="post-card" data-post-card="${p.id}">
      <div class="post-route"><span class="mini-avatar">${initials(p.author_name)}</span><span>${escapeHtml(p.author_name)}</span><span class="arrow">→</span><span>${p.recipient_id?escapeHtml(p.recipient_name||'pessoa'):'comunidade'}</span><span class="post-meta">${ago(p.created_at)} · ${p.response_count} resposta${p.response_count===1?'':'s'}</span></div>
      <p class="post-body">${escapeHtml(p.body)}</p>
      ${responseHtml}
      ${characterHtml}
      ${supportHtml}
      <div class="post-actions"><button data-reply-toggle="${p.id}">↩ responder</button>${canSupport?`<button data-support-toggle="${p.id}">＋ apoiar em privado</button>`:''}${p.response_count===0?'<span class="need-tag">PRECISA DE ATENÇÃO</span>':''}</div>
      <div class="inline-reply hidden" data-reply-box="${p.id}"><textarea maxlength="420" placeholder="Responda à pessoa, não ao algoritmo."></textarea><div><button data-reply-send="${p.id}">enviar resposta</button><button data-reply-cancel="${p.id}">cancelar</button></div></div>
      ${canSupport?`<div class="support-picker hidden" data-support-box="${p.id}"><span>APOIO PRIVADO // só você e as pessoas envolvidas nesta publicação conseguem ver.</span><div><button data-support-kind="escutei" data-support-post="${p.id}">escutei você</button><button data-support-kind="estou_aqui" data-support-post="${p.id}">estou aqui</button><button data-support-kind="posso_ajudar" data-support-post="${p.id}">posso ajudar</button></div></div>`:''}
    </article>`;
  }).join('');
  $$('[data-reply-toggle]').forEach(b=>b.onclick=()=>{
    const box=document.querySelector(`[data-reply-box="${b.dataset.replyToggle}"]`);
    box?.classList.toggle('hidden');
    box?.querySelector('textarea')?.focus();
  });
  $$('[data-reply-cancel]').forEach(b=>b.onclick=()=>document.querySelector(`[data-reply-box="${b.dataset.replyCancel}"]`)?.classList.add('hidden'));
  $$('[data-reply-send]').forEach(b=>b.onclick=()=>sendReply(b.dataset.replySend));
  $$('[data-support-toggle]').forEach(b=>b.onclick=()=>document.querySelector(`[data-support-box="${b.dataset.supportToggle}"]`)?.classList.toggle('hidden'));
  $$('[data-support-kind]').forEach(b=>b.onclick=()=>supportPost(b.dataset.supportPost,b.dataset.supportKind));
}
async function supportPost(post_id,kind){
  const allowed=['escutei','estou_aqui','posso_ajudar'];
  if(!allowed.includes(kind))return;
  const {error}=await supabase.from('support_signals').upsert({post_id,supporter_id:state.profile.id,kind});
  if(error)return toast('Não foi possível enviar o apoio privado agora.');
  toast('Apoio privado entregue. Só as pessoas envolvidas conseguem ver.');
  loadFeed();
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
  loadFeed();
  setTimeout(()=>askWorldCharacter('reply_created',{post_id}),650);
}

async function loadImpact(){const {count}=await supabase.from('posts').select('*',{count:'exact',head:true}).eq('author_id',state.profile.id);$('#impact-number').textContent=count||0;}
function applyAppTabLayout(){
  const worldOpen=state.tab==='residents';
  $('#app-view')?.classList.toggle('inhabitants-open',worldOpen);
  $('.composer')?.classList.toggle('hidden',worldOpen||state.tab==='profile');
  $('.feed-header')?.classList.toggle('hidden',worldOpen);
  $('#refresh-feed')?.classList.toggle('hidden',worldOpen||state.tab==='profile');
}
$$('[data-app-tab]').forEach(b=>b.onclick=async()=>{
  state.tab=b.dataset.appTab;
  $$('[data-app-tab]').forEach(x=>x.classList.toggle('active',x===b));
  const headings={feed:'Quem precisa ser visto?',quiet:'Quem ficou falando sozinho?',sent:'O que você entregou',profile:'Seu canto, sem palco',residents:'Mundo deles'};
  $('#feed-heading').textContent=headings[state.tab]||'AVESSO';
  applyAppTabLayout();
  if(state.tab==='profile')renderProfile();
  else if(state.tab==='residents')await renderInhabitantsPage();
  else loadFeed();
});
async function renderInhabitantsPage(){
  $('#feed-status').classList.add('hidden');
  const {data:presence}=await supabase.from('character_presence').select('character_id,location,activity,mood,status,updated_at');
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
      <div class="inhabitant-portrait"><img src="${escapeHtml(characterImage(c))}" alt="${escapeHtml(c.name)}"></div>
      <div class="inhabitant-copy">
        <span class="inhabitant-role">${escapeHtml(c.role)}</span>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(abilities[slug]||c.bio||'Habitante do AVESSO.')}</p>
        <div class="inhabitant-status"><span>${escapeHtml(p.location||c.home_location||'local desconhecido')}</span><span>${escapeHtml(p.status||c.presence_state||'???')}</span></div>
        <small>${escapeHtml(notes[slug])}</small>
      </div>
    </article>`;
  }).join('');
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
function renderProfile(){
  $('#feed-status').classList.add('hidden');
  const mode=state.world.preferences?.participation_mode||'world';
  const interferenceOnline=Boolean(state.world.settings?.world_interventions_enabled);
  $('#feed-list').innerHTML=`<article class="post-card"><div class="post-route"><span class="mini-avatar">${initials(state.profile.display_name)}</span><strong>${escapeHtml(state.profile.display_name)}</strong><span class="post-meta">@${escapeHtml(state.profile.handle)}</span></div><p class="post-body">${escapeHtml(state.profile.bio||'Sem bio. Um raro caso de contenção na internet.')}</p><div class="post-actions"><button id="edit-bio">editar bio</button></div></article>
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
  $('#edit-bio').onclick=editBio;
  $$('[data-world-mode]').forEach(b=>b.onclick=()=>saveWorldMode(b.dataset.worldMode));
  setWorldModeLabel();
  algoSay('profile');
  setTimeout(()=>askWorldCharacter('profile'),700);
}
async function editBio(){const bio=prompt('Bio curta, até 180 caracteres:',state.profile.bio||'');if(bio===null)return;const {data,error}=await supabase.from('profiles').update({bio:bio.slice(0,180)}).eq('id',state.profile.id).select().single();if(error)return toast('A bio resistiu à mudança.');state.profile=data;renderProfile();toast('Bio atualizada. Crise de identidade adiada.');}
$('#refresh-feed').onclick=loadFeed;
function subscribeRealtime(){
  supabase.channel('avesso-feed')
    .on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>{if(['feed','quiet','sent'].includes(state.tab))loadFeed();})
    .on('postgres_changes',{event:'*',schema:'public',table:'responses'},()=>{if(['feed','quiet','sent'].includes(state.tab))loadFeed();})
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'world_settings'},payload=>{
      state.world.settings=payload.new||state.world.settings;
      setWorldModeLabel();
      toast(state.world.settings?.world_interventions_enabled?'AVESSO.SYS: interferências liberadas. Péssima hora para perder o 404 de vista.':'AVESSO.SYS: interferências visuais suspensas.');
    })
    .on('postgres_changes',{event:'*',schema:'public',table:'world_events'},payload=>{
      if(payload.new?.status==='active')toast(`EVENTO DO MUNDO // ${payload.new.title}`);
    })
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'character_interactions'},payload=>{
      const row=payload.new||{};
      if(row.user_id&&row.user_id!==state.profile?.id&&row.visibility!=='world')return;
      const c=state.world.charactersById[row.character_id];
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
