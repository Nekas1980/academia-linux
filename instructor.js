/* Painel do formador. Sem service_role, chaves secretas nem dados pessoais no código. */
(() => {
'use strict';
const config=window.ACADEMY_AUTH_CONFIG||{};
const state=document.getElementById('instructor-status');
const panel=document.getElementById('instructor-panel');
const $=sel=>document.querySelector(sel);
const display=(message,bad=false)=>{state.textContent=message;state.className='auth-note '+(bad?'warn':'')};
const make=(tag,content)=>{const node=document.createElement(tag);if(content!==undefined)node.textContent=String(content);return node};
function table(where,headers,records){
 const target=$(where);if(!target)return;target.replaceChildren();
 if(!records?.length){target.append(make('p','Ainda não existem dados de aprendizagem.'));return}
 const t=make('table'),th=make('thead'),body=make('tbody'),r=make('tr');
 for(const h of headers){const c=make('th',h);r.append(c)}th.append(r);t.append(th);
 for(const record of records){
  const row=make('tr');for(const value of record){row.append(make('td',value??'—'))}body.append(row);
 }t.append(body);target.append(t);
}
async function run(){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.url||'')||
  !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey||'')){
  display('Configuração Supabase em falta.',true);return
 }
 try{
  await new Promise((resolve,reject)=>{
   const js=document.createElement('script');js.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
   js.onload=resolve;js.onerror=()=>reject(Error('Falha ao carregar SDK'));document.head.append(js);
  });
  const db=window.supabase.createClient(config.url,config.publishableKey);
  const {data,error}=await db.auth.getUser();
  if(error||!data?.user){display('Inicia sessão em Inscrição → Entrar antes de abrir o painel.',true);return}
  if(data.user.app_metadata?.academy_role!=='admin'){
   display('Acesso reservado ao formador autorizado. Não tens permissões administrativas.',true);return
  }
  const assurance=await db.auth.mfa.getAuthenticatorAssuranceLevel();
  if(assurance.error||assurance.data?.currentLevel!=='aal2'){
   display('Acesso administrativo requer MFA verificado nesta sessão (AAL2).',true);return
  }
  const [summary,activity]=await Promise.all([
   db.rpc('academy_instructor_summary'),
   db.rpc('academy_instructor_activity')
  ]);
  if(summary.error)throw summary.error;
  if(activity.error)throw activity.error;
  table('#instructor-summary',
   ['Aluno (nome de apresentação)','Unidades','Laboratórios','Última conclusão'],
   (summary.data||[]).map(v=>[
    v.display_name||String(v.student_id).slice(0,8),
    v.completed_units,
    v.completed_labs,
    v.last_completion?new Date(v.last_completion).toLocaleString('pt-PT'):'—'
   ]));
  const names={unit_opened:'Unidade aberta',unit_completed:'Unidade concluída',lab_completed:'Laboratório concluído'};
  table('#instructor-activity',
   ['Aluno (ID parcial)','Ação','Atividade','Data'],
   (activity.data||[]).map(v=>[
    String(v.student_id).slice(0,8),
    names[v.event_type]||v.event_type,
    v.activity_id,
    new Date(v.occurred_at).toLocaleString('pt-PT')
   ]));
  panel.hidden=false;display('Painel autorizado. MFA verificado. Dados de acompanhamento carregados.');
 }catch(error){
  display('Não foi possível obter os relatórios. Confirma as migrações 002/003 e as permissões do formador. '+String(error.message||error),true);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});
else void run();
})();
