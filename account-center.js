import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './config.js';

const VERSION='20261003-account-center1';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const q=(selector,root=document)=>root.querySelector(selector);

function ensureStyles(){
  if(q('link[data-avesso-account-center]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=new URL(`account-center.css?v=${VERSION}`,import.meta.url).href;
  link.dataset.avessoAccountCenter=VERSION;
  document.head.appendChild(link);
}

function flash(message,kind='info'){
  const toast=q('#toast');
  if(toast){
    toast.textContent=message;
    toast.dataset.kind=kind;
    toast.classList.add('show');
    clearTimeout(flash._timer);
    flash._timer=setTimeout(()=>toast.classList.remove('show'),3200);
    return;
  }
  console[kind==='error'?'error':'log'](message);
}

function downloadJson(payload){
  const stamp=new Date().toISOString().slice(0,10);
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`avesso-dados-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}

function recoveryRedirect(){
  const url=new URL(location.href);
  url.search='?recovery=1';
  url.hash='';
  return url.href;
}

function ensureRecoveryDialog(){
  let dialog=q('#account-recovery-dialog');
  if(dialog)return dialog;
  dialog=document.createElement('dialog');
  dialog.id='account-recovery-dialog';
  dialog.className='account-recovery-dialog';
  dialog.innerHTML=`
    <form method="dialog" class="account-recovery-card" id="account-recovery-form">
      <button class="account-dialog-close" value="cancel" aria-label="Fechar">×</button>
      <span class="section-code">CONTA // RECUPERAÇÃO</span>
      <h2>Defina uma nova senha</h2>
      <p>Use pelo menos 8 caracteres. Senha diferente das antigas é uma ideia estranhamente sensata.</p>
      <label>nova senha<input id="account-new-password" type="password" minlength="8" autocomplete="new-password" required></label>
      <label>repita a senha<input id="account-new-password-confirm" type="password" minlength="8" autocomplete="new-password" required></label>
      <button class="btn btn-acid" id="account-save-password" type="submit" value="default">salvar nova senha</button>
      <p id="account-recovery-message" class="form-message" role="status"></p>
    </form>`;
  document.body.appendChild(dialog);
  const form=q('#account-recovery-form',dialog);
  form?.addEventListener('submit',async event=>{
    event.preventDefault();
    const password=String(q('#account-new-password',dialog)?.value||'');
    const confirm=String(q('#account-new-password-confirm',dialog)?.value||'');
    const message=q('#account-recovery-message',dialog);
    if(password.length<8){message.textContent='A senha precisa ter pelo menos 8 caracteres.';return;}
    if(password!==confirm){message.textContent='As senhas não conferem.';return;}
    const button=q('#account-save-password',dialog);
    button.disabled=true;button.textContent='salvando...';message.textContent='';
    const {error}=await supabase.auth.updateUser({password});
    button.disabled=false;button.textContent='salvar nova senha';
    if(error){message.textContent='Não foi possível trocar a senha. Reabra o link de recuperação.';return;}
    message.textContent='Senha atualizada.';
    history.replaceState({},'',location.pathname+location.hash);
    setTimeout(()=>dialog.close(),700);
  });
  return dialog;
}

function bindPasswordRecovery(){
  const panel=q('#auth-dialog .auth-panel');
  if(panel&&!q('[data-forgot-password]',panel)){
    const button=document.createElement('button');
    button.type='button';
    button.className='account-forgot-password';
    button.dataset.forgotPassword='1';
    button.textContent='esqueci minha senha';
    const form=q('#auth-form',panel);
    form?.appendChild(button);
    button.addEventListener('click',async()=>{
      const email=String(q('#auth-form input[name="email"]')?.value||'').trim();
      const message=q('#auth-message');
      if(!email){if(message)message.textContent='Informe seu e-mail antes de pedir a recuperação.';return;}
      button.disabled=true;button.textContent='enviando link...';
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:recoveryRedirect()});
      button.disabled=false;button.textContent='esqueci minha senha';
      if(message)message.textContent=error?'Não foi possível enviar o link de recuperação.':'Se esse e-mail existir, o link de recuperação foi enviado.';
    });
  }

  supabase.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY'){
      const dialog=ensureRecoveryDialog();
      if(!dialog.open)dialog.showModal();
      setTimeout(()=>q('#account-new-password',dialog)?.focus(),60);
    }
  });

  if(new URLSearchParams(location.search).get('recovery')==='1'){
    supabase.auth.getSession().then(({data})=>{
      if(data.session){
        const dialog=ensureRecoveryDialog();
        if(!dialog.open)dialog.showModal();
      }
    });
  }
}

async function exportAccount(button,status){
  button.disabled=true;button.textContent='preparando arquivo...';status.textContent='';
  try{
    const {data,error}=await supabase.functions.invoke('account-export',{body:{format:'json'}});
    if(error)throw error;
    downloadJson(data);
    status.textContent='Exportação pronta. O arquivo foi baixado neste dispositivo.';
  }catch(error){
    console.error('account export',error);
    status.textContent='Não foi possível gerar a exportação agora.';
  }finally{
    button.disabled=false;button.textContent='baixar meus dados';
  }
}

async function signOutOthers(button,status){
  button.disabled=true;button.textContent='encerrando...';status.textContent='';
  const {error}=await supabase.auth.signOut({scope:'others'});
  button.disabled=false;button.textContent='encerrar outras sessões';
  status.textContent=error?'Não foi possível encerrar as outras sessões.':'Outras sessões encerradas. Esta continua ativa.';
}

async function repairLocalCache(button,status){
  button.disabled=true;button.textContent='limpando cache...';
  try{
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.filter(k=>k.startsWith('avesso-')).map(k=>caches.delete(k)));
    }
    status.textContent='Cache local limpo. A página será recarregada com arquivos novos.';
    setTimeout(()=>location.reload(),650);
  }catch{
    button.disabled=false;button.textContent='reparar cache local';
    status.textContent='O navegador recusou a limpeza automática.';
  }
}

async function deleteAccount(input,button,status){
  if(input.value.trim()!=='APAGAR MINHA CONTA'){
    status.textContent='Digite exatamente APAGAR MINHA CONTA para continuar.';
    return;
  }
  if(!confirm('Excluir definitivamente sua conta e conteúdo associado? Esta ação não pode ser desfeita.'))return;
  button.disabled=true;button.textContent='apagando conta...';status.textContent='';
  try{
    const {data,error}=await supabase.functions.invoke('account-delete',{body:{confirm:'APAGAR MINHA CONTA'}});
    if(error)throw error;
    if(!data?.ok)throw new Error(data?.message||data?.error||'delete_failed');
    status.textContent='Conta excluída. Saindo do AVESSO...';
    try{await supabase.auth.signOut({scope:'local'});}catch{}
    try{
      for(const key of Object.keys(localStorage))if(key.startsWith('avesso_'))localStorage.removeItem(key);
    }catch{}
    setTimeout(()=>{location.href=new URL('./',location.href).href;},700);
  }catch(error){
    console.error('account delete',error);
    const text=String(error?.message||'');
    status.textContent=text.includes('sole_owner')
      ?'Esta é a única conta de Administrador Geral. Transfira esse papel antes de excluir.'
      :'Não foi possível excluir a conta agora. Nada foi apagado parcialmente no login.';
    button.disabled=false;button.textContent='excluir minha conta';
  }
}

function buildAccountCenter(){
  const host=q('.profile-control');
  if(!host||q('#account-center',host))return;
  const section=document.createElement('section');
  section.id='account-center';
  section.className='account-center';
  section.innerHTML=`
    <header>
      <span class="section-code">CONTA // PRIVACIDADE E SEGURANÇA</span>
      <h2>Controle da sua conta</h2>
      <p>Dados, sessões, recuperação e saída definitiva num lugar só. A burocracia ganhou uma interface minimamente civilizada.</p>
    </header>
    <div class="account-center-grid">
      <article>
        <h3>Seus dados</h3>
        <p>Gere uma cópia em JSON com dados da conta, conteúdo e inventário dos seus arquivos.</p>
        <button type="button" data-account-export>baixar meus dados</button>
      </article>
      <article>
        <h3>Sessões</h3>
        <p>Revogue logins em outros dispositivos sem derrubar esta sessão.</p>
        <button type="button" data-account-signout-others>encerrar outras sessões</button>
      </article>
      <article>
        <h3>Diagnóstico local</h3>
        <p>Remove caches do AVESSO deste navegador e força uma cópia atual da interface.</p>
        <button type="button" data-account-repair-cache>reparar cache local</button>
      </article>
      <article>
        <h3>Documentos</h3>
        <p><a href="PRIVACIDADE.md" target="_blank" rel="noopener">Política de Privacidade</a> · <a href="TERMOS.md" target="_blank" rel="noopener">Termos de Uso</a></p>
      </article>
    </div>
    <p class="account-center-status" data-account-status role="status"></p>
    <details class="account-danger-zone">
      <summary>excluir conta permanentemente</summary>
      <p>A exclusão remove o usuário de autenticação, registros vinculados por cascata e arquivos armazenados sob a conta. Alguns registros técnicos minimizados podem permanecer quando necessários para segurança e auditoria.</p>
      <label>confirmação<input data-account-delete-confirm autocomplete="off" placeholder="APAGAR MINHA CONTA"></label>
      <button type="button" data-account-delete>excluir minha conta</button>
    </details>`;
  host.appendChild(section);

  const status=q('[data-account-status]',section);
  q('[data-account-export]',section)?.addEventListener('click',e=>exportAccount(e.currentTarget,status));
  q('[data-account-signout-others]',section)?.addEventListener('click',e=>signOutOthers(e.currentTarget,status));
  q('[data-account-repair-cache]',section)?.addEventListener('click',e=>repairLocalCache(e.currentTarget,status));
  const input=q('[data-account-delete-confirm]',section);
  q('[data-account-delete]',section)?.addEventListener('click',e=>deleteAccount(input,e.currentTarget,status));
}

function ensureFooterLegalLinks(){
  const footer=q('.site-footer>div:last-child');
  if(!footer)return;
  if(!q('a[href="TERMOS.md"]',footer)){
    const link=document.createElement('a');
    link.href='TERMOS.md';
    link.textContent='termos';
    footer.appendChild(link);
  }
}

function watchProfile(){
  let frame=0;
  const schedule=()=>{
    cancelAnimationFrame(frame);
    frame=requestAnimationFrame(()=>{
      buildAccountCenter();
      ensureFooterLegalLinks();
      bindPasswordRecovery();
    });
  };
  const observer=new MutationObserver(schedule);
  observer.observe(document.body,{childList:true,subtree:true});
  schedule();
}

function boot(){
  ensureStyles();
  bindPasswordRecovery();
  ensureFooterLegalLinks();
  watchProfile();
  document.documentElement.dataset.avessoAccountCenter=VERSION;
}

boot();
