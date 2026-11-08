/* Academia Linux · primeira password, perfil mínimo e MFA TOTP.
 * Exclusivamente Supabase Auth + RLS. Nunca registar passwords/códigos/segredos.
 * Requer migração 002. Esta UI não substitui as políticas RLS do servidor.
 */
(() => {
'use strict';
const $=(selector,root=document)=>root.querySelector(selector);
const el=(tag,props={})=>{
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(props)){
    if(key==='text')node.textContent=value;
    else if(key==='className')node.className=value;
    else node.setAttribute(key,value);
  }
  return node;
};
const translate=(pt,en)=>{try{return localStorage.getItem('academia-linux-lang')==='en'?en:pt}catch{return pt}};
let api=null,user=null,seq=0,securityRow=null,currentAal='aal1',verifiedFactor=null,pendingFactor=null,enrollingFactor=null,working=false;
const policy=pass=>typeof pass==='string'&&pass.length>=10&&/[a-z]/.test(pass)&&/[A-Z]/.test(pass)&&/[0-9]/.test(pass)&&/[^A-Za-z0-9]/.test(pass);
const tracks=[
 ['', 'Selecionar percurso','Choose a track'],
 ['linux','Linux e administração','Linux administration'],
 ['soc','SOC / Blue Team','SOC / Blue Team'],
 ['forensics','Forense digital','Digital forensics'],
 ['dev','Programação e automação','Programming and automation'],
 ['security','Segurança de sistemas','System security']
];
const levels=[
 ['','Selecionar nível','Choose a level'],
 ['beginner','Iniciação','Beginner'],
 ['intermediate','Intermédio','Intermediate'],
 ['advanced','Avançado','Advanced']
];
function field(id,label,type,props={}){
 const wrapper=el('label',{className:'academy-field'});
 wrapper.append(el('span',{text:label}));
 const input=el('input',{id,type,...props});
 wrapper.append(input);
 return wrapper;
}
function selectField(id,label,items){
 const wrapper=el('label',{className:'academy-field'});
 wrapper.append(el('span',{text:label}));
 const select=el('select',{id});
 for(const [value,pt,en] of items)select.append(el('option',{value,text:translate(pt,en)}));
 wrapper.append(select);
 return wrapper;
}
function button(text,id=''){return el('button',{type:'button',className:'btn dark',...(id?{id}:{}),text})}
function section(title,id){
 const box=el('section',{className:'academy-security-section',id});
 box.append(el('h3',{text:title}));
 return box;
}
function note(root,message,type=''){
 const p=el('p',{className:'academy-security-note '+type,text:message,role:'status'});
 root.append(p);return p;
}
function screen(){
 const slot=$('#auth-session');
 if(!slot||slot.hidden||!user)return null;
 let host=$('#academy-student-security');
 if(!host){host=el('div',{id:'academy-student-security'});slot.append(host)}
 host.replaceChildren();
 return host;
}
function requiredPassword(host){
 const box=section(translate('1. Definir palavra-passe pessoal','1. Set your own password'),'first-password');
 note(box,translate('O acesso inicial requer uma palavra-passe nova, exclusiva e diferente da credencial provisória. Os conteúdos reservados permanecem bloqueados até concluíres esta etapa.','Your first access requires a new, unique password. Restricted content remains locked until you complete this step.'),'warn');
 const form=el('form',{id:'academy-change-password',className:'auth-form'});
 form.append(
  field('academy-new-password',translate('Nova palavra-passe','New password'),'password',{autocomplete:'new-password',minlength:'10',required:''}),
  field('academy-new-confirm',translate('Confirmar nova palavra-passe','Confirm new password'),'password',{autocomplete:'new-password',minlength:'10',required:''})
 );
 note(form,translate('Mínimo de 10 caracteres, maiúsculas, minúsculas, números e símbolos. Não utilizes a mesma palavra-passe noutros serviços.','At least 10 characters including uppercase, lowercase, numbers and symbols. Do not reuse a password.'),'subtle');
 const send=el('button',{className:'btn primary',type:'submit',text:translate('Guardar palavra-passe e continuar','Save password and continue')});
 form.append(send);
 const feedback=note(form,'');
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(working)return;
  const password=$('#academy-new-password',form).value,confirm=$('#academy-new-confirm',form).value;
  if(!policy(password)||password!==confirm){
   feedback.textContent=translate('A palavra-passe não cumpre os requisitos ou a confirmação não corresponde.','Password requirements were not met or confirmation differs.');
   return;
  }
  working=true;send.disabled=true;
  try{
   const {error}=await api.auth.updateUser({password});
   if(error)throw error;
   $('#academy-new-password',form).value='';$('#academy-new-confirm',form).value='';
   await refresh();
  }catch(error){feedback.textContent=translate('Não foi possível alterar a palavra-passe. ','Password change failed. ')+String(error.message||error)}
  finally{working=false;send.disabled=false}
 });
 box.append(form);host.append(box);
}
async function checkMfa(){
 const [levelResult,factorResult]=await Promise.all([api.auth.mfa.getAuthenticatorAssuranceLevel(),api.auth.mfa.listFactors()]);
 if(levelResult.error)throw levelResult.error;
 if(factorResult.error)throw factorResult.error;
 const all=Array.isArray(factorResult.data?.all)?factorResult.data.all:[];
 const factors=(factorResult.data?.totp||[]).filter(f=>f.status==='verified');
 currentAal=levelResult.data?.currentLevel||'aal1';
 verifiedFactor=factors[0]||null;
 // listFactors().totp devolve apenas fatores verificados; .all inclui os pendentes.
 // Nunca remover automaticamente fatores verificados ou de outro tipo.
 pendingFactor=all.find(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name==='Academia Linux')||null;
}
function showMfa(host){
 const box=section(translate('2. Autenticação multifator (MFA)','2. Multi-factor authentication (MFA)'),'academy-mfa-panel');
 note(box,translate('O acesso às unidades avançadas exige um código temporário de uma aplicação autenticadora (TOTP). Não pedimos número de telefone.','Advanced lessons require a time-based code from an authenticator app (TOTP). We do not ask for your phone number.'));
 if(currentAal==='aal2'){
  note(box,translate('MFA validado nesta sessão (AAL2).','MFA verified for this session (AAL2).'),'success');
  host.append(box);return;
 }
 if(verifiedFactor){
  note(box,translate('A aplicação autenticadora já está associada. Introduz o código atual para validar esta sessão.','An authenticator is enrolled. Enter its current code to verify this session.'));
  const form=el('form',{className:'auth-form'});
  form.append(field('academy-mfa-challenge-code',translate('Código da aplicação','Authenticator code'),'text',{inputmode:'numeric',pattern:'[0-9]{6}',maxlength:'6',autocomplete:'one-time-code',required:''}));
  const b=el('button',{type:'submit',className:'btn primary',text:translate('Validar MFA','Verify MFA')});
  form.append(b);const feedback=note(form,'');
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(working)return;working=true;b.disabled=true;
   try{
    const code=$('#academy-mfa-challenge-code',form).value.trim();
    if(!/^[0-9]{6}$/.test(code))throw Error(translate('Código inválido.','Invalid code.'));
    const challenge=await api.auth.mfa.challenge({factorId:verifiedFactor.id});
    if(challenge.error)throw challenge.error;
    const verified=await api.auth.mfa.verify({factorId:verifiedFactor.id,challengeId:challenge.data.id,code});
    if(verified.error)throw verified.error;
    $('#academy-mfa-challenge-code',form).value='';
    await refresh();
   }catch(error){feedback.textContent=translate('Não foi possível validar o MFA: ','MFA verification failed: ')+String(error.message||error)}
   finally{working=false;b.disabled=false}
  });
  box.append(form);host.append(box);return;
 }
 if(pendingFactor){
  note(box,translate(
   'Foi iniciada anteriormente uma associação MFA que ficou por confirmar. Podes reiniciar apenas essa configuração pendente, sem eliminar a tua conta ou fatores já validados.',
   'An earlier MFA setup was started but not confirmed. You can restart only that pending setup without deleting your account or verified factors.'
  ),'warn');
  const reset=button(translate('Reiniciar configuração MFA pendente','Restart pending MFA setup'),'academy-restart-mfa');
  box.append(reset);
  const resultNote=note(box,'');
  reset.addEventListener('click',async()=>{
   if(working||!pendingFactor||pendingFactor.status!=='unverified')return;
   // A alteração requer uma ação explícita; este botão não apaga MFA validado.
   working=true;reset.disabled=true;
   try{
    const factors=await api.auth.mfa.listFactors();
    if(factors.error)throw factors.error;
    const actual=(factors.data?.all||[]).find(f=>f.id===pendingFactor.id&&f.status==='unverified'&&f.factor_type==='totp'&&f.friendly_name==='Academia Linux');
    if(!actual)throw Error(translate('O fator já não está pendente. Atualiza a página.','Factor is no longer pending. Refresh the page.'));
    const removed=await api.auth.mfa.unenroll({factorId:actual.id});
    if(removed.error)throw removed.error;
    pendingFactor=null;
    await refresh();
   }catch(err){
    resultNote.textContent=translate('Não foi possível reiniciar o MFA: ','Could not restart MFA: ')+String(err.message||err);
    reset.disabled=false;
   }finally{working=false}
  });
  host.append(box);
  return;
 }
 note(box,translate('Ainda não tens MFA configurado. Ativa-o para concluir o primeiro acesso.','MFA is not enrolled. Set it up to complete onboarding.'),'warn');
 const start=button(translate('Configurar aplicação autenticadora','Set up authenticator'),'academy-enroll');
 box.append(start);
 const staging=el('div',{id:'academy-enrollment'});box.append(staging);
 start.addEventListener('click',async()=>{
  if(working)return;working=true;start.disabled=true;staging.replaceChildren();
  try{
   const result=await api.auth.mfa.enroll({factorType:'totp',friendlyName:'Academia Linux'});
   if(result.error)throw result.error;
   enrollingFactor=result.data.id;
   const qr=result.data.totp?.qr_code;
   if(qr){
    const img=el('img',{alt:translate('Código QR de MFA pessoal: não partilhar','Personal MFA QR: do not share'),className:'academy-mfa-qr'});
    if(qr.startsWith('data:image/svg+xml'))img.src=qr;
    else if(qr.trim().startsWith('<svg'))img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(qr);
    staging.append(img);
   }
   note(staging,translate('Digitaliza o QR com a função Ler QR do 2FAS. Não partilhes o QR nem o incluas em capturas de ecrã.','Scan the QR with the 2FAS QR scanner. Do not share the QR or include it in screenshots.'),'warn');
   const secret=result.data.totp?.secret;
   if(typeof secret==='string'&&secret.length>0){
    const manual=button(translate('Não consegues ler o QR? Introduzir chave manualmente','Cannot scan QR? Enter setup key manually'),'academy-manual-mfa');
    manual.className='btn outline';
    staging.append(manual);
    const secretPanel=el('div',{id:'academy-mfa-manual',hidden:''});
    note(secretPanel,translate('No 2FAS escolhe Adicionar conta → Introdução manual. Nome: Academia Linux. Utiliza a chave abaixo e o tipo TOTP de 6 dígitos. Nunca partilhes esta chave.','In 2FAS choose Add account → Manual entry. Name: Academia Linux. Use the key below and six-digit TOTP. Never share this secret.'),'warn');
    const secretText=el('code',{id:'academy-mfa-secret',text:secret});
    secretPanel.append(secretText);
    staging.append(secretPanel);
    manual.addEventListener('click',()=>{
     const visible=secretPanel.hidden;
     secretPanel.hidden=!visible;
     manual.textContent=visible?translate('Ocultar chave privada','Hide private key'):translate('Mostrar chave manual','Show manual setup key');
    });
   }
   const form=el('form',{className:'auth-form'});
   form.append(field('academy-enroll-code',translate('Código de seis dígitos','Six-digit code'),'text',{inputmode:'numeric',pattern:'[0-9]{6}',maxlength:'6',autocomplete:'one-time-code',required:''}));
   const verify=el('button',{className:'btn primary',type:'submit',text:translate('Ativar MFA','Activate MFA')});
   form.append(verify);const feedback=note(form,'');
   form.addEventListener('submit',async e=>{
    e.preventDefault();if(working)return;working=true;verify.disabled=true;
    try{
     const code=$('#academy-enroll-code',form).value.trim();
     if(!/^[0-9]{6}$/.test(code))throw Error(translate('Código inválido.','Invalid code.'));
     const challenge=await api.auth.mfa.challenge({factorId:enrollingFactor});
     if(challenge.error)throw challenge.error;
     const checked=await api.auth.mfa.verify({factorId:enrollingFactor,challengeId:challenge.data.id,code});
     if(checked.error)throw checked.error;
     enrollingFactor=null;
     await refresh();
    }catch(error){feedback.textContent=translate('Código não validado: ','Code could not be verified: ')+String(error.message||error)}
    finally{working=false;verify.disabled=false}
   });
   staging.append(form);
  }catch(error){note(staging,translate('Não foi possível iniciar a configuração MFA: ','Unable to enroll MFA: ')+String(error.message||error),'warn');start.disabled=false}
  finally{working=false}
 });
 host.append(box);
}
async function showProfile(host){
 const box=section(translate('3. Perfil formativo','3. Learning profile'),'academy-profile-panel');
 note(box,translate('Guardamos apenas um nome de apresentação, nível e percurso. Não solicitamos morada, telefone ou dados sensíveis.','We only store a display name, level and learning track. We do not request address, phone or sensitive information.'));
 const form=el('form',{className:'auth-form',id:'academy-profile-form'});
 form.append(
  field('academy-display-name',translate('Nome de apresentação (opcional)','Display name (optional)'),'text',{maxlength:'80',autocomplete:'nickname'}),
  selectField('academy-experience',translate('Nível de conhecimentos','Knowledge level'),levels),
  selectField('academy-track',translate('Percurso de estudo','Learning track'),tracks)
 );
 const save=el('button',{className:'btn outline',type:'submit',text:translate('Guardar perfil','Save profile')});
 form.append(save);const feedback=note(form,'');
 try{
  const {data,error}=await api.from('student_profiles').select('display_name,experience_level,learning_track').eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  $('#academy-display-name',form).value=data?.display_name||'';
  $('#academy-experience',form).value=data?.experience_level||'';
  $('#academy-track',form).value=data?.learning_track||'';
 }catch{feedback.textContent=translate('Perfis ainda indisponíveis. Falta executar a migração de segurança 002.','Profiles are not available until security migration 002 is applied.');save.disabled=true}
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(working)return;working=true;save.disabled=true;
  try{
   const {error}=await api.from('student_profiles').upsert({
    user_id:user.id,
    display_name:$('#academy-display-name',form).value.trim().slice(0,80)||null,
    experience_level:$('#academy-experience',form).value||null,
    learning_track:$('#academy-track',form).value||null,
    updated_at:new Date().toISOString()
   },{onConflict:'user_id'});
   if(error)throw error;
   feedback.textContent=translate('Perfil atualizado.','Profile updated.');
  }catch(error){feedback.textContent=translate('Não foi possível guardar: ','Could not save: ')+String(error.message||error)}
  finally{working=false;save.disabled=false}
 });
 box.append(form);host.append(box);
}

async function showProgress(host){
 const sectionEl=section(translate('4. Acompanhamento da aprendizagem','4. Learning progress'),'academy-my-progress');
 note(sectionEl,translate('Atividades registadas na tua conta. Estes dados de exercícios simulados não substituem avaliação certificada.','Activity saved to your account. Simulated exercises are not certified assessments.'));
 try{
  const {data,error}=await api.from('student_progress')
   .select('activity_type,activity_id,completed_at').eq('user_id',user.id)
   .order('completed_at',{ascending:false}).limit(100);
  if(error)throw error;
  const completedUnits=(data||[]).filter(x=>x.activity_type==='unit').length;
  const completedLabs=(data||[]).filter(x=>x.activity_type==='lab').length;
  sectionEl.append(el('p',{className:'academy-security-note success',text:
    translate('Unidades concluídas: ','Units completed: ')+completedUnits+' · '+
    translate('Laboratórios concluídos: ','Labs completed: ')+completedLabs
  }));
  if(data?.length){
   const list=el('ul',{className:'academy-progress-list'});
   for(const item of data.slice(0,10)){
    const date=item.completed_at?new Date(item.completed_at).toLocaleDateString():''; 
    list.append(el('li',{text:item.activity_id+' · '+date}));
   }
   sectionEl.append(list);
  }
 }catch{
  note(sectionEl,translate('A sincronização do progresso ainda não está disponível.','Progress synchronization is not available yet.'),'warn');
 }
 host.append(sectionEl);
}

async function refresh(){
 const epoch=++seq;
 const host=screen();if(!host||!api||!user)return;
 note(host,translate('A validar estado da conta...','Checking account security...'));
 try{
  const [{data,error},level]=await Promise.all([
   api.from('student_security').select('must_change_password').eq('user_id',user.id).maybeSingle(),
   api.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);
  if(epoch!==seq)return;
  if(error||!data){
   host.replaceChildren();
   note(host,translate('A configuração do primeiro acesso ainda não foi aplicada no Supabase (migração 002). A conta de teste continua utilizável, mas as unidades avançadas ficam protegidas.','First-login controls are not yet installed in Supabase (migration 002). The test account still works, but advanced lessons remain protected.'),'warn');
   return;
  }
  securityRow=data;
  host.replaceChildren();
  if(data.must_change_password){requiredPassword(host);return}
  await checkMfa();if(epoch!==seq)return;
  showMfa(host);
  if(currentAal==='aal2'){await showProfile(host);if(epoch===seq)await showProgress(host)}
 }catch(error){
  if(epoch!==seq)return;
  host.replaceChildren();
  note(host,translate('Não foi possível verificar a segurança da conta: ','Could not check account security: ')+String(error.message||error),'warn');
 }
}
window.addEventListener('academy-auth-session',async event=>{
 const next=event.detail||{};
 api=next.client||null;
 const session=next.session||null;
 user=session?.user||null;
 const cycle=++seq;
 if(!api||!user)return;
 try{
  const verified=await api.auth.getUser();
  if(cycle!==seq)return;
  if(verified.error||!verified.data?.user)return;
  user=verified.data.user;
  await refresh();
 }catch{/* A sessão não fica autorizada sem verificação. */}
});
})();
