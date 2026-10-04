import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const VERSION='20261004-market1';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const q=(s,r=document)=>r.querySelector(s);
const state={user:null,catalog:[],inventory:[],listings:[],trades:[],profiles:new Map(),loading:false};

function ensureStyles(){
  if(q('link[data-avesso-market]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`market-center.css?v=${VERSION}`,import.meta.url).href;
  link.dataset.avessoMarket=VERSION;
  document.head.appendChild(link);
}

function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function itemById(id){return state.catalog.find(x=>x.id===id)||null;}
function profileById(id){return state.profiles.get(id)||null;}
function itemLabel(id){const item=itemById(id);return item?item.name:'item indisponível';}
function personLabel(id){const p=profileById(id);return p?(p.display_name||`@${p.handle||'usuario'}`):'alguém do Avesso';}
function ownTradables(){return state.inventory.map(row=>({...row,item:itemById(row.item_id)})).filter(x=>x.item&&x.item.tradable&&!x.item.soulbound&&x.quantity>0);}
function tradableCatalog(){return state.catalog.filter(x=>x.active!==false&&x.tradable&&!x.soulbound);}

function setStatus(message){const el=q('[data-market-status]');if(el)el.textContent=message||'';}

async function callRpc(name,args){
  const {data,error}=await supabase.rpc(name,args);
  if(error)throw error;
  return data;
}

async function loadProfiles(ids){
  const unique=[...new Set(ids.filter(Boolean))];
  if(!unique.length)return;
  const missing=unique.filter(id=>!state.profiles.has(id));
  if(!missing.length)return;
  const {data,error}=await supabase.from('profiles').select('id,display_name,handle').in('id',missing);
  if(error)return;
  (data||[]).forEach(p=>state.profiles.set(p.id,p));
}

async function refresh(){
  if(state.loading)return;
  state.loading=true;
  try{
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user){state.user=null;return;}
    state.user=user;
    const [catalogRes,inventoryRes,listingsRes,tradesRes]=await Promise.all([
      supabase.from('avesso_item_catalog').select('id,slug,item_type,name,description,rarity,tradable,soulbound,active').eq('active',true).order('sort_order'),
      supabase.from('avesso_user_inventory').select('item_id,quantity,acquisition_source').eq('user_id',user.id),
      supabase.from('avesso_market_listings').select('id,seller_id,item_id,quantity,price_saldo,status,buyer_id,expires_at,created_at').order('created_at',{ascending:false}).limit(40),
      supabase.from('avesso_trade_offers').select('id,proposer_id,counterparty_id,status,note,expires_at,created_at,avesso_trade_lines(side,item_id,quantity)').order('created_at',{ascending:false}).limit(40)
    ]);
    const error=catalogRes.error||inventoryRes.error||listingsRes.error||tradesRes.error;
    if(error)throw error;
    state.catalog=catalogRes.data||[];
    state.inventory=inventoryRes.data||[];
    state.listings=listingsRes.data||[];
    state.trades=tradesRes.data||[];
    await loadProfiles([
      ...state.listings.flatMap(x=>[x.seller_id,x.buyer_id]),
      ...state.trades.flatMap(x=>[x.proposer_id,x.counterparty_id])
    ]);
    render();
  }catch(error){
    console.error('AVESSO market load',error);
    setStatus('Mercado indisponível agora. Inventário e Saldo não foram alterados.');
  }finally{state.loading=false;}
}

function listingCard(row){
  const mine=row.seller_id===state.user?.id;
  const expired=row.expires_at&&new Date(row.expires_at)<=new Date();
  const card=document.createElement('article');
  card.className='market-card';
  card.innerHTML=`<small>${mine?'sua oferta':esc(personLabel(row.seller_id))}</small><h4>${esc(itemLabel(row.item_id))}</h4><p>quantidade: ${row.quantity}</p><div class="market-price">${row.price_saldo} Saldo</div>`;
  const action=document.createElement('button');
  action.className='market-action';
  action.type='button';
  if(mine&&row.status==='active'){
    action.textContent='cancelar anúncio';
    action.addEventListener('click',async()=>{action.disabled=true;try{await callRpc('avesso_market_cancel_listing',{p_listing_id:row.id});setStatus('Anúncio cancelado. O item voltou ao inventário.');await refresh();}catch(e){console.error(e);setStatus('Não foi possível cancelar o anúncio.');action.disabled=false;}});
  }else{
    action.textContent=expired?'expirado':'compras liberam quando Saldo sair do shadow';
    action.disabled=true;
    action.title='A economia ainda está em shadow mode; nenhuma transferência de Saldo pode ocorrer.';
  }
  card.appendChild(action);
  return card;
}

function tradeCard(row){
  const incoming=row.counterparty_id===state.user?.id;
  const lines=row.avesso_trade_lines||[];
  const offered=lines.filter(x=>x.side==='offer').map(x=>`${x.quantity}× ${itemLabel(x.item_id)}`).join(', ')||'—';
  const requested=lines.filter(x=>x.side==='request').map(x=>`${x.quantity}× ${itemLabel(x.item_id)}`).join(', ')||'—';
  const card=document.createElement('article');
  card.className='market-card';
  card.innerHTML=`<span class="trade-side">${incoming?'recebida':'enviada'} // ${esc(row.status)}</span><h4>${incoming?esc(personLabel(row.proposer_id)):esc(personLabel(row.counterparty_id))}</h4><p><b>oferece:</b> ${esc(offered)}</p><p><b>pede:</b> ${esc(requested)}</p>${row.note?`<small>${esc(row.note)}</small>`:''}`;
  if(row.status==='pending'){
    const actions=document.createElement('div');actions.className='trade-actions';
    if(incoming){
      const accept=document.createElement('button');accept.className='market-action';accept.textContent='aceitar troca';accept.addEventListener('click',()=>tradeAction('avesso_trade_accept_offer',row.id,accept,'Troca aceita. Itens transferidos atomicamente.'));
      const reject=document.createElement('button');reject.className='market-action';reject.textContent='recusar';reject.addEventListener('click',()=>tradeAction('avesso_trade_reject_offer',row.id,reject,'Troca recusada. O escrow voltou ao remetente.'));
      actions.append(accept,reject);
    }else{
      const cancel=document.createElement('button');cancel.className='market-action';cancel.textContent='cancelar proposta';cancel.addEventListener('click',()=>tradeAction('avesso_trade_cancel_offer',row.id,cancel,'Proposta cancelada. Seus itens voltaram ao inventário.'));
      actions.append(cancel);
    }
    card.appendChild(actions);
  }
  return card;
}

async function tradeAction(rpc,id,button,message){
  button.disabled=true;
  try{await callRpc(rpc,{p_offer_id:id});setStatus(message);await refresh();}
  catch(error){console.error(error);setStatus('A troca não pôde ser alterada. Nenhum item foi perdido.');button.disabled=false;}
}

function optionMarkup(items,empty='nenhum item negociável'){
  if(!items.length)return `<option value="">${empty}</option>`;
  return items.map(x=>`<option value="${x.item?.id||x.id}">${esc(x.item?.name||x.name)}${x.quantity?` (${x.quantity})`:''}</option>`).join('');
}

function render(){
  const host=q('.profile-control');if(!host||!state.user)return;
  let section=q('#avesso-market-center',host);
  if(!section){section=document.createElement('section');section.id='avesso-market-center';section.className='avesso-market-center';host.appendChild(section);}
  const owned=ownTradables();const tradables=tradableCatalog();
  section.innerHTML=`
    <header class="market-head"><div><span class="section-code">ECONOMIA // MERCADO + TROCAS</span><h2>Mercado do Avesso</h2><p>Itens entram em escrow antes de qualquer negócio. Trocas são bilaterais e atômicas; badges continuam pessoais.</p></div><span class="market-mode">Saldo // shadow</span></header>
    <nav class="market-tabs" aria-label="Mercado e trocas"><button type="button" class="active" data-market-tab="market">mercado</button><button type="button" data-market-tab="trade">trocas</button></nav>
    <div class="market-panel active" data-market-panel="market">
      <form class="market-form" data-listing-form><label>item<select name="item_id" required>${optionMarkup(owned)}</select></label><label>quantidade<input name="quantity" type="number" min="1" value="1" required></label><label>preço em Saldo<input name="price" type="number" min="1" max="2147483647" required></label><label>expira em<input name="expires" type="datetime-local"></label><button class="wide" type="submit" ${owned.length?'':'disabled'}>colocar no mercado</button></form>
      <div class="market-grid" data-listings></div>
    </div>
    <div class="market-panel" data-market-panel="trade">
      <form class="market-form" data-trade-form><label class="wide">@ da outra pessoa<input name="handle" autocomplete="off" placeholder="usuario" required></label><label>você oferece<select name="offer_item" required>${optionMarkup(owned)}</select></label><label>quantidade oferecida<input name="offer_qty" type="number" min="1" value="1" required></label><label>você pede<select name="request_item" required>${optionMarkup(tradables)}</select></label><label>quantidade pedida<input name="request_qty" type="number" min="1" value="1" required></label><label class="wide">recado opcional<input name="note" maxlength="280" placeholder="sem contrato escrito em guardanapo"></label><button class="wide" type="submit" ${owned.length&&tradables.length?'':'disabled'}>propor troca</button></form>
      <div class="market-grid" data-trades></div>
    </div>
    <p class="market-status" role="status" data-market-status></p>`;

  const listings=q('[data-listings]',section);const active=state.listings.filter(x=>x.status==='active');
  if(active.length)active.forEach(x=>listings.appendChild(listingCard(x)));else listings.innerHTML='<p class="market-empty">Nenhum anúncio ativo. Até o capitalismo está tímido hoje.</p>';
  const trades=q('[data-trades]',section);if(state.trades.length)state.trades.forEach(x=>trades.appendChild(tradeCard(x)));else trades.innerHTML='<p class="market-empty">Nenhuma troca por aqui ainda.</p>';

  section.querySelectorAll('[data-market-tab]').forEach(button=>button.addEventListener('click',()=>{
    section.querySelectorAll('[data-market-tab]').forEach(x=>x.classList.toggle('active',x===button));
    section.querySelectorAll('[data-market-panel]').forEach(x=>x.classList.toggle('active',x.dataset.marketPanel===button.dataset.marketTab));
  }));
  q('[data-listing-form]',section)?.addEventListener('submit',createListing);
  q('[data-trade-form]',section)?.addEventListener('submit',createTrade);
}

async function createListing(event){
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const button=q('button[type="submit"]',form);button.disabled=true;
  try{
    const expires=String(data.get('expires')||'').trim();
    await callRpc('avesso_market_create_listing',{p_item_id:data.get('item_id'),p_quantity:Number(data.get('quantity')),p_price_saldo:Number(data.get('price')),p_expires_at:expires?new Date(expires).toISOString():null});
    form.reset();setStatus('Item reservado em escrow e anúncio criado. Saldo continua intocado.');await refresh();
  }catch(error){console.error(error);setStatus('Não foi possível criar o anúncio. O inventário foi preservado pela transação.');button.disabled=false;}
}

async function createTrade(event){
  event.preventDefault();const form=event.currentTarget;const data=new FormData(form);const button=q('button[type="submit"]',form);button.disabled=true;
  try{
    const rawHandle=String(data.get('handle')||'').trim().replace(/^@/,'');
    const {data:people,error}=await supabase.from('profiles').select('id,display_name,handle').eq('handle',rawHandle).limit(1);
    if(error)throw error;const person=people?.[0];if(!person)throw new Error('counterparty_not_found');if(person.id===state.user.id)throw new Error('self_trade');
    state.profiles.set(person.id,person);
    await callRpc('avesso_trade_create_offer',{
      p_counterparty_id:person.id,
      p_offer:[{item_id:data.get('offer_item'),quantity:Number(data.get('offer_qty'))}],
      p_request:[{item_id:data.get('request_item'),quantity:Number(data.get('request_qty'))}],
      p_note:String(data.get('note')||''),p_expires_at:null
    });
    form.reset();setStatus('Proposta criada. Seu item ficou em escrow até resposta ou cancelamento.');await refresh();
  }catch(error){console.error(error);setStatus('Não foi possível criar a troca. Nenhum item ficou preso.');button.disabled=false;}
}

let frame=0;
function watch(){
  const observer=new MutationObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(q('.profile-control')&&!q('#avesso-market-center'))refresh();});});
  observer.observe(document.body,{childList:true,subtree:true});
}

function boot(){ensureStyles();refresh();watch();supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){state.user=null;q('#avesso-market-center')?.remove();}else if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED')refresh();});document.documentElement.dataset.avessoMarket=VERSION;}
boot();
