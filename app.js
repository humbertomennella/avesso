import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const SITE_URL = new URL('./', import.meta.url).href;
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { session:null, profile:null, recipient:null, mode:'signup', tab:'feed' };

function toast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600); }
function initials(name='?'){ return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function ago(date){ const s=Math.floor((Date.now()-new Date(date))/1000); if(s<60)return'agora'; if(s<3600)return`${Math.floor(s/60)}min`; if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`; }
function escapeHtml(value=''){ const d=document.createElement('div'); d.textContent=value; return d.innerHTML; }

$$('[data-open-auth]').forEach(b=>b.addEventListener('click',()=>$('#auth-dialog').showModal()));
$('.dialog-close').onclick=()=>$('#auth-dialog').close();
$$('[data-auth-mode]').forEach(b=>b.onclick=()=>setAuthMode(b.dataset.authMode));
function setAuthMode(mode){ state.mode=mode; $$('[data-auth-mode]').forEach(b=>b.classList.toggle('active',b.dataset.authMode===mode)); $('#signup-fields').classList.toggle('hidden',mode==='login'); $('#resend-confirmation').classList.add('hidden'); $('#auth-submit').textContent=mode==='login'?'entrar':'criar meu canto'; $('#auth-message').textContent=''; }

$('#auth-form').addEventListener('submit',async(e)=>{e.preventDefault();const f=new FormData(e.currentTarget);const email=f.get('email');const password=f.get('password');$('#auth-submit').disabled=true;$('#auth-message').textContent='conversando com os computadores...';let result;if(state.mode==='signup'){const handle=String(f.get('handle')||'').toLowerCase();const display_name=String(f.get('display_name')||'');if(!/^[a-z0-9_]{3,24}$/.test(handle)){result={error:{message:'Seu @ precisa ter 3–24 letras minúsculas, números ou _.'}}}else{result=await supabase.auth.signUp({email,password,options:{data:{handle,display_name},emailRedirectTo:SITE_URL}});}}else result=await supabase.auth.signInWithPassword({email,password});$('#auth-submit').disabled=false;if(result.error){$('#auth-message').textContent=humanError(result.error.message);return}if(state.mode==='signup'&&!result.data.session){$('#auth-message').textContent='Confira seu e-mail e use o link mais recente. Se já confirmou a conta, abra a aba de entrar e use sua senha.';$('#resend-confirmation').classList.remove('hidden');return}$('#auth-dialog').close();toast('Você entrou. Tente não estragar tudo.');});

$('#resend-confirmation').onclick=async()=>{const email=new FormData($('#auth-form')).get('email');if(!email)return toast('Digite seu e-mail primeiro. Adivinhação ainda está em beta.');const button=$('#resend-confirmation');button.disabled=true;button.textContent='reenviando...';const {error}=await supabase.auth.resend({type:'signup',email,options:{emailRedirectTo:SITE_URL}});button.disabled=false;button.textContent='reenviar confirmação de e-mail';if(error){$('#auth-message').textContent=humanError(error.message);return}$('#auth-message').textContent='Se a conta ainda estiver pendente, você receberá um novo link. Se já confirmou, entre com sua senha.';toast('Solicitação recebida. Confira seu e-mail ou tente entrar.');};

function humanError(m){const value=String(m||'');const lower=value.toLowerCase();if(lower.includes('email not confirmed'))return'Confirme seu e-mail antes de entrar. Use o link mais recente ou solicite outro na aba de cadastro.';if(lower.includes('invalid login'))return'E-mail ou senha não conferem. Se você já confirmou, use a senha do cadastro.';if(lower.includes('already registered'))return'Este e-mail já tem cadastro. Use a aba de entrar.';if(lower.includes('expired')||lower.includes('otp_expired'))return'Este link expirou ou já foi utilizado. Se já confirmou, entre com sua senha.';if(lower.includes('password'))return'A senha precisa atender aos requisitos de segurança.';return value;}
$('#logout').onclick=()=>supabase.auth.signOut();

supabase.auth.onAuthStateChange((_event,session)=>{state.session=session;if(session)enterApp();else leaveApp();});
async function enterApp(){ $('#marketing-view').classList.add('hidden');$('.site-header').classList.add('hidden');$('.site-footer').classList.add('hidden');$('#app-view').classList.remove('hidden');const {data}=await supabase.from('profiles').select('*').eq('id',state.session.user.id).single();state.profile=data;if(!data){toast('Seu perfil ainda está acordando. Atualize em alguns segundos.');return}$('#nav-name').textContent=data.display_name;$('#nav-handle').textContent='@'+data.handle;$('#nav-avatar').textContent=initials(data.display_name);await Promise.all([loadFeed(),loadImpact()]);subscribeRealtime();}
function leaveApp(){state.profile=null;$('#app-view').classList.add('hidden');$('#marketing-view').classList.remove('hidden');$('.site-header').classList.remove('hidden');$('.site-footer').classList.remove('hidden');}

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
  const {error}=await supabase.from('posts').insert({
    author_id:state.profile.id,
    recipient_id:directed?state.recipient.id:null,
    body,
    visibility:directed?$('#post-visibility').value:'publico'
  });
  if(error)return toast('Não foi possível publicar. Tente novamente.');
  $('#post-body').value='';
  $('#recipient-search').value='';
  $('#char-count').textContent='420';
  state.recipient=null;
  toast(directed?'Mensagem entregue.':'Publicado para a comunidade. Sem placar, com conversa.');
  loadFeed();
  loadImpact();
};

async function loadFeed(){const status=$('#feed-status');status.classList.remove('hidden');status.textContent='ordenando pelo que importa, ideia radical...';let query=supabase.from('feed_attention').select('*');if(state.tab==='quiet')query=query.eq('response_count',0);if(state.tab==='sent')query=query.eq('author_id',state.profile.id);const {data,error}=await query.order('attention_need',{ascending:false}).limit(40);if(error){status.textContent='O feed falhou. Até o anti-algoritmo tem segunda-feira.';return}status.classList.add('hidden');renderFeed(data||[]);}
function renderFeed(posts){const list=$('#feed-list');if(!posts.length){list.innerHTML='<div class="feed-status">Nada aqui. Talvez as pessoas estejam vivendo. Estranho, mas permitido.</div>';return}list.innerHTML=posts.map(p=>`<article class="post-card"><div class="post-route"><span class="mini-avatar">${initials(p.author_name)}</span><span>${escapeHtml(p.author_name)}</span><span class="arrow">→</span><span>${p.recipient_id?escapeHtml(p.recipient_name||'pessoa'):'comunidade'}</span><span class="post-meta">${ago(p.created_at)} · ${p.response_count} resposta${p.response_count===1?'':'s'}</span></div><p class="post-body">${escapeHtml(p.body)}</p><div class="post-actions"><button data-reply='${p.id}'>↩ responder</button><button data-support='${p.id}'>＋ apoiar em privado</button>${p.response_count===0?'<span class="need-tag">PRECISA DE ATENÇÃO</span>':''}</div></article>`).join('');list.querySelectorAll('[data-support]').forEach(b=>b.onclick=()=>supportPost(b.dataset.support));list.querySelectorAll('[data-reply]').forEach(b=>b.onclick=()=>replyPost(b.dataset.reply));}
async function supportPost(post_id){const {error}=await supabase.from('support_signals').upsert({post_id,supporter_id:state.profile.id,kind:'estou_aqui'});toast(error?'Não foi possível apoiar agora.':'Apoio privado entregue. A plateia não ficou sabendo.');}
async function replyPost(post_id){const body=prompt('Sua resposta (sim, este prompt é retrô de propósito):');if(!body||body.trim().length<2)return;const {error}=await supabase.from('responses').insert({post_id,author_id:state.profile.id,body:body.trim()});toast(error?'A resposta caiu no vazio. Tente novamente.':'Resposta enviada. Conversa: conceito vintage.');if(!error)loadFeed();}

async function loadImpact(){const {count}=await supabase.from('posts').select('*',{count:'exact',head:true}).eq('author_id',state.profile.id);$('#impact-number').textContent=count||0;}
$$('[data-app-tab]').forEach(b=>b.onclick=()=>{state.tab=b.dataset.appTab;$$('[data-app-tab]').forEach(x=>x.classList.toggle('active',x===b));const headings={feed:'Quem precisa ser visto?',quiet:'Quem ficou falando sozinho?',sent:'O que você entregou',profile:'Seu canto, sem palco'};$('#feed-heading').textContent=headings[state.tab];if(state.tab==='profile')renderProfile();else loadFeed();});
function renderProfile(){$('#feed-status').classList.add('hidden');$('#feed-list').innerHTML=`<article class="post-card"><div class="post-route"><span class="mini-avatar">${initials(state.profile.display_name)}</span><strong>${escapeHtml(state.profile.display_name)}</strong><span class="post-meta">@${escapeHtml(state.profile.handle)}</span></div><p class="post-body">${escapeHtml(state.profile.bio||'Sem bio. Um raro caso de contenção na internet.')}</p><div class="post-actions"><button id="edit-bio">editar bio</button></div></article>`;$('#edit-bio').onclick=editBio;}
async function editBio(){const bio=prompt('Bio curta, até 180 caracteres:',state.profile.bio||'');if(bio===null)return;const {data,error}=await supabase.from('profiles').update({bio:bio.slice(0,180)}).eq('id',state.profile.id).select().single();if(error)return toast('A bio resistiu à mudança.');state.profile=data;renderProfile();toast('Bio atualizada. Crise de identidade adiada.');}
$('#refresh-feed').onclick=loadFeed;
function subscribeRealtime(){supabase.channel('avesso-feed').on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>loadFeed()).on('postgres_changes',{event:'*',schema:'public',table:'responses'},()=>loadFeed()).subscribe();}

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
