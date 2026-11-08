/* Autenticação opcional. Nunca guarda nem valida passwords em GitHub Pages. */
(() => {
'use strict';
const cfg=window.ACADEMY_AUTH_CONFIG||{};
let client=null,tab='login',session=null,recovery=false;
let activeForm=null;
const allowSignup=cfg.enablePublicSignup===true;
const announce=()=>window.dispatchEvent(new CustomEvent('academy-auth-session',{detail:{client,session}}));
const $=s=>document.querySelector(s);
const msg=(text,bad=false)=>{const el=$('#auth-message');if(el){el.textContent=text;el.className='feedback '+(bad?'bad':'ok')}};
const lang=()=>localStorage.getItem('academia-linux-lang')==='en'?'en':'pt';
const tr=(pt,en)=>lang()==='pt'?pt:en;
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.url||'')&&/^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.publishableKey||'');
const labels={
signup:['Criar conta','Create account'],
login:['Iniciar sessão','Sign in'],
recover:['Enviar email de recuperação','Send recovery email'],
update:['Alterar palavra-passe','Change password']
};
function buttons(){
const form=$('#auth-form');if(!form)return;
const tabs=document.querySelectorAll('[data-auth-tab]');
tabs.forEach(x=>{x.classList.toggle('active',x.dataset.authTab===tab);x.setAttribute('aria-pressed',String(x.dataset.authTab===tab));if(x.dataset.authTab==='signup')x.hidden=!allowSignup});
const pw=$('#auth-password-label'),consent=$('#auth-consent-label'),submit=$('#auth-submit'),input=$('#auth-password');
if(!pw||!consent||!submit)return;
pw.hidden=tab==='recover';if(input)input.required=tab!=='recover';
consent.hidden=tab!=='signup';
const kind=recovery?'update':tab;submit.textContent=labels[kind][lang()==='pt'?0:1];
$('#auth-state').textContent=session?tr('Sessão autenticada.','Authenticated session.'):configured?(allowSignup?tr('Confirma o email recebido após criares a conta.','Confirm your email after registration.'):tr('Acesso a alunos existentes. Novas inscrições temporariamente encerradas.','Existing student access. New registrations are temporarily closed.')):tr('Autenticação indisponível: falta configurar a ligação segura.','Authentication unavailable: secure connection is not configured.');
$('#auth-state').className='auth-note'+(configured?'':' warn');
$('#auth-session').hidden=!session||recovery;
form.hidden=!!session&&!recovery;
if(session){
 const user=$('#auth-user');user.textContent=tr('Conta: ','Account: ')+(session.user?.email||'');
 const next=(new URLSearchParams(location.search).get('next')||'').toUpperCase();
 let link=$('#auth-next');
 if(!link){link=document.createElement('a');link.id='auth-next';link.className='btn primary';$('#auth-session').appendChild(link)}
 if(/^UC(?:12|13|14|16)$/.test(next)){
  link.href='aula.html?uc='+encodeURIComponent(next);
  link.textContent=tr('Continuar para a unidade reservada →','Continue to the restricted lesson →');
 }else{
  link.href='cursos.html';
  link.textContent=tr('Consultar unidades →','Browse learning units →');
 }
}
for(const id of ['auth-email','auth-password','auth-consent','auth-submit']){const el=$('#'+id);if(el)el.disabled=!configured||(tab==='signup'&&!allowSignup)}
}
function addListeners(){
const f=$('#auth-form');if(!f)return;
$$('[data-auth-tab]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.authTab==='signup'&&!allowSignup)return;tab=b.dataset.authTab;recovery=false;msg('');buttons()}));
f.addEventListener('submit',async e=>{
e.preventDefault();if(!configured||!client||(tab==='signup'&&!allowSignup)){msg(tr('Ação indisponível.','Action unavailable.'),true);return}
const email=$('#auth-email').value.trim(),password=$('#auth-password').value,btn=$('#auth-submit');if((tab==='signup'||recovery)&&password.length<10){msg(tr('A palavra-passe precisa de pelo menos 10 caracteres.','Password must have at least 10 characters.'),true);return}
if(tab==='signup'&&!$('#auth-consent').checked){msg(tr('É necessário ler e aceitar a informação de privacidade.','Please read and accept the privacy information.'),true);return}
btn.disabled=true;btn.textContent=tr('A processar...','Processing...');
try{
const callback=new URL('inscricao.html',location.href).href;
let result;
if(recovery)result=await client.auth.updateUser({password});
else if(tab==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:callback}});
else if(tab==='login')result=await client.auth.signInWithPassword({email,password});
else result=await client.auth.resetPasswordForEmail(email,{redirectTo:callback});
if(result.error)throw result.error;
if(recovery){msg(tr('Palavra-passe alterada.','Password updated.'));recovery=false}
else if(tab==='signup')msg(tr('Pedido recebido. Se necessário, confirma o email para ativar a conta.','Request received. Confirm your email if required to activate your account.'));
else if(tab==='recover')msg(tr('Se o endereço estiver associado a uma conta, receberás instruções.','If the address has an account, instructions will be sent.'));
else msg(tr('Sessão iniciada.','Signed in.'));
const {data}=await client.auth.getSession();session=data.session;buttons();announce()
}catch(err){msg(String(err.message||err),true);buttons()}
finally{btn.disabled=false;buttons()}
});
$('#auth-signout').addEventListener('click',async()=>{if(!client)return;const {error}=await client.auth.signOut();if(error){msg(error.message,true);return}session=null;buttons();announce();msg(tr('Sessão terminada.','Signed out.'))});
}
function $$(s){return Array.from(document.querySelectorAll(s))}
async function connect(){
if(!configured)return;
if(client){const {data,error}=await client.auth.getSession();if(!error){session=data.session;buttons();announce()}return;}
try{
if(!window.supabase?.createClient)await new Promise((resolve,reject)=>{
const script=document.createElement('script');
script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
script.referrerPolicy='no-referrer';
script.onload=resolve;script.onerror=()=>reject(new Error('Falha ao carregar o serviço de autenticação'));
document.head.appendChild(script);
});
if(!window.supabase?.createClient)throw Error('Biblioteca de autenticação indisponível.');
client=window.supabase.createClient(cfg.url,cfg.publishableKey);
client.auth.onAuthStateChange((event,newSession)=>{
session=newSession;
if(event==='PASSWORD_RECOVERY'){recovery=true;tab='login';setTimeout(()=>{msg(tr('Introduz a nova palavra-passe.','Enter your new password.'));buttons();announce()},0)}
else setTimeout(()=>{buttons();announce()},0);
});
const {data,error}=await client.auth.getSession();if(error)throw error;session=data.session;buttons();announce();
}catch(err){const state=$('#auth-state');if(state){state.textContent=tr('Não foi possível iniciar a autenticação: ','Could not initialize authentication: ')+String(err.message||err);state.className='auth-note warn'}}
}
function init(){const form=$('#auth-form');if(!form||form===activeForm)return;activeForm=form;addListeners();buttons();connect()}
window.addEventListener('academy-auth-render',init);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();