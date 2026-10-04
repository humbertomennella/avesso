import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const VERSION='20261004-inventory1';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const q=(selector,root=document)=>root.querySelector(selector);

const state={
  userId:null,
  catalog:[],
  ownedBadgeIds:new Set(),
  inventoryItemIds:new Set(),
  primaryBadgeId:null,
  loading:false,
  loaded:false
};

function ensureStyles(){
  if(q('link[data-avesso-rewards-center]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`rewards-center.css?v=${VERSION}`,import.meta.url).href;
  link.dataset.avessoRewardsCenter=VERSION;
  document.head.appendChild(link);
}

function glyphFor(item){
  return String(item?.metadata?.glyph||'◆').slice(0,3);
}

function rarityLabel(value){
  return ({common:'comum',uncommon:'incomum',rare:'raro',epic:'épico',event:'evento'})[value]||'especial';
}

function currentItem(){
  return state.catalog.find(item=>item.badge_id===state.primaryBadgeId)||null;
}

function removeEquippedMarks(){
  document.querySelectorAll('[data-avesso-equipped-badge]').forEach(node=>node.remove());
}

function makeEquippedMark(item){
  const mark=document.createElement('span');
  mark.className='avesso-equipped-badge';
  mark.dataset.avessoEquippedBadge=item.slug;
  mark.textContent=glyphFor(item);
  mark.title=`Badge equipado: ${item.name}`;
  mark.setAttribute('aria-label',`Badge equipado: ${item.name}`);
  return mark;
}

function paintEquippedBadge(){
  removeEquippedMarks();
  const item=currentItem();
  if(!item){
    delete document.documentElement.dataset.avessoPrimaryBadge;
    return;
  }

  const navName=q('#nav-name');
  if(navName)navName.insertAdjacentElement('afterend',makeEquippedMark(item));

  const profileName=q('.profile-owner-name');
  if(profileName)profileName.appendChild(makeEquippedMark(item));

  document.documentElement.dataset.avessoPrimaryBadge=item.slug;
  window.dispatchEvent(new CustomEvent('avesso:primary-badge',{detail:{badgeId:item.badge_id,slug:item.slug,name:item.name,glyph:glyphFor(item)}}));
}

function createBadgeCard(item){
  const owned=state.ownedBadgeIds.has(item.badge_id)&&state.inventoryItemIds.has(item.id);
  const equipped=owned&&state.primaryBadgeId===item.badge_id;

  const card=document.createElement('article');
  card.className=`rewards-badge-card ${owned?'owned':'locked'} ${equipped?'equipped':''}`;
  card.dataset.badgeSlug=item.slug;

  const icon=document.createElement('div');
  icon.className='rewards-badge-glyph';
  icon.textContent=glyphFor(item);
  icon.setAttribute('aria-hidden','true');

  const copy=document.createElement('div');
  copy.className='rewards-badge-copy';
  const head=document.createElement('div');
  head.className='rewards-badge-title-row';
  const title=document.createElement('h4');
  title.textContent=item.name;
  const rarity=document.createElement('span');
  rarity.className=`rewards-rarity ${item.rarity||'common'}`;
  rarity.textContent=rarityLabel(item.rarity);
  head.append(title,rarity);

  const description=document.createElement('p');
  description.textContent=item.description||'';
  const criteria=document.createElement('small');
  criteria.textContent=owned
    ?(equipped?'equipado no seu nome':'desbloqueado no seu inventário')
    :String(item?.metadata?.criteria||'Ainda não desbloqueado.');
  copy.append(head,description,criteria);

  const action=document.createElement('button');
  action.type='button';
  action.className='rewards-badge-action';
  if(!owned){
    action.disabled=true;
    action.textContent='bloqueado';
  }else if(equipped){
    action.textContent='remover do nome';
    action.dataset.unequipBadge='1';
  }else{
    action.textContent='equipar';
    action.dataset.equipBadge=item.badge_id;
  }

  card.append(icon,copy,action);
  return card;
}

function renderPanel(){
  const host=q('.profile-control');
  if(!host)return;

  let section=q('#rewards-center',host);
  if(!section){
    section=document.createElement('section');
    section.id='rewards-center';
    section.className='rewards-center';
    host.appendChild(section);
  }

  const badgeItems=state.catalog.filter(item=>item.item_type==='badge');
  const ownedCount=badgeItems.filter(item=>state.ownedBadgeIds.has(item.badge_id)&&state.inventoryItemIds.has(item.id)).length;
  const equipped=currentItem();

  section.replaceChildren();

  const header=document.createElement('header');
  header.className='rewards-center-head';
  const headerCopy=document.createElement('div');
  const code=document.createElement('span');
  code.className='section-code';
  code.textContent='INVENTÁRIO // IDENTIDADE';
  const h2=document.createElement('h2');
  h2.textContent='Coisas que você conquistou';
  const p=document.createElement('p');
  p.textContent='Badges registram momentos e vínculos. Um pode aparecer no seu nome; nenhum deles aumenta alcance, ranking ou ego industrial.';
  headerCopy.append(code,h2,p);

  const stats=document.createElement('div');
  stats.className='rewards-center-stats';
  const ownedStat=document.createElement('span');
  ownedStat.innerHTML=`<b>${ownedCount}</b><small>desbloqueados</small>`;
  const equippedStat=document.createElement('span');
  const equippedText=document.createElement('b');
  equippedText.textContent=equipped?glyphFor(equipped):'—';
  const equippedLabel=document.createElement('small');
  equippedLabel.textContent=equipped?'equipado':'sem badge';
  equippedStat.append(equippedText,equippedLabel);
  stats.append(ownedStat,equippedStat);
  header.append(headerCopy,stats);

  const grid=document.createElement('div');
  grid.className='rewards-badge-grid';
  badgeItems.forEach(item=>grid.appendChild(createBadgeCard(item)));

  const footer=document.createElement('div');
  footer.className='rewards-center-note';
  footer.textContent='Saldo continua em shadow mode nesta etapa. Inventário e badge não gastam nada.';

  const status=document.createElement('p');
  status.className='rewards-center-status';
  status.dataset.rewardsStatus='1';
  status.setAttribute('role','status');

  section.append(header,grid,footer,status);

  section.querySelectorAll('[data-equip-badge]').forEach(button=>{
    button.addEventListener('click',()=>setPrimaryBadge(button.dataset.equipBadge,button));
  });
  section.querySelectorAll('[data-unequip-badge]').forEach(button=>{
    button.addEventListener('click',()=>setPrimaryBadge(null,button));
  });

  paintEquippedBadge();
}

function setStatus(message){
  const status=q('[data-rewards-status]');
  if(status)status.textContent=message||'';
}

async function setPrimaryBadge(badgeId,button){
  if(!state.userId||state.loading)return;
  state.loading=true;
  button.disabled=true;
  const original=button.textContent;
  button.textContent='salvando...';
  setStatus('');

  try{
    if(badgeId&&!state.ownedBadgeIds.has(badgeId))throw new Error('badge_not_owned');
    const {error}=await supabase.from('avesso_user_equipment').upsert({
      user_id:state.userId,
      primary_badge_id:badgeId,
      updated_at:new Date().toISOString()
    },{onConflict:'user_id'});
    if(error)throw error;
    state.primaryBadgeId=badgeId;
    renderPanel();
    setStatus(badgeId?'Badge equipado. Seu nome ficou um pouco mais do Avesso.':'Badge removido do nome. Continua seu, sem drama patrimonial.');
  }catch(error){
    console.error('AVESSO rewards equip',error);
    button.disabled=false;
    button.textContent=original;
    setStatus('Não foi possível alterar o badge agora. Nada foi perdido.');
  }finally{
    state.loading=false;
  }
}

async function loadRewards({force=false}={}){
  if(state.loading||(!force&&state.loaded&&state.userId))return;
  state.loading=true;
  try{
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user){
      state.userId=null;
      state.loaded=false;
      removeEquippedMarks();
      return;
    }
    state.userId=user.id;

    const [catalogRes,badgesRes,inventoryRes,equipmentRes]=await Promise.all([
      supabase.from('avesso_item_catalog').select('id,slug,item_type,name,description,asset_path,rarity,tradable,soulbound,badge_id,metadata,sort_order').eq('active',true).order('sort_order'),
      supabase.from('user_badges').select('badge_id').eq('user_id',user.id),
      supabase.from('avesso_user_inventory').select('item_id,quantity,acquisition_source').eq('user_id',user.id),
      supabase.from('avesso_user_equipment').select('primary_badge_id').eq('user_id',user.id).maybeSingle()
    ]);

    const error=catalogRes.error||badgesRes.error||inventoryRes.error||equipmentRes.error;
    if(error)throw error;

    state.catalog=catalogRes.data||[];
    state.ownedBadgeIds=new Set((badgesRes.data||[]).map(row=>row.badge_id));
    state.inventoryItemIds=new Set((inventoryRes.data||[]).map(row=>row.item_id));
    state.primaryBadgeId=equipmentRes.data?.primary_badge_id||null;
    state.loaded=true;
    renderPanel();
    paintEquippedBadge();
  }catch(error){
    console.error('AVESSO rewards load',error);
    state.loaded=false;
    const host=q('.profile-control');
    if(host&&!q('#rewards-center',host)){
      const section=document.createElement('section');
      section.id='rewards-center';
      section.className='rewards-center rewards-center-error';
      section.textContent='INVENTÁRIO // indisponível agora. Seu Canto continua funcionando normalmente.';
      host.appendChild(section);
    }
  }finally{
    state.loading=false;
  }
}

let observerFrame=0;
function watchProfile(){
  const observer=new MutationObserver(()=>{
    cancelAnimationFrame(observerFrame);
    observerFrame=requestAnimationFrame(()=>{
      const host=q('.profile-control');
      if(!host)return;
      if(q('#rewards-center',host))return;
      if(state.loaded)renderPanel();
      else loadRewards();
    });
  });
  observer.observe(document.body,{childList:true,subtree:true});
}

function boot(){
  ensureStyles();
  loadRewards();
  watchProfile();
  supabase.auth.onAuthStateChange((event)=>{
    if(event==='SIGNED_OUT'){
      state.userId=null;
      state.loaded=false;
      state.primaryBadgeId=null;
      removeEquippedMarks();
      delete document.documentElement.dataset.avessoPrimaryBadge;
      return;
    }
    if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')loadRewards({force:true});
  });
  document.documentElement.dataset.avessoRewardsCenter=VERSION;
}

boot();
