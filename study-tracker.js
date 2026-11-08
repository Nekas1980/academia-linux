/* Academia Linux · eventos pedagógicos mínimos.
 * Apenas com sessão autenticada. Não recolhe IP, UA, comandos digitados,
 * respostas de quizzes ou passwords. Eventos do browser são autodeclarados,
 * não constituem provas de exame ou registos de segurança.
 */
(() => {
'use strict';
const cfg=window.ACADEMY_AUTH_CONFIG||{};
if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.url||'')||
   !/^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.publishableKey||''))return;
let clientPromise=null;
const permitted=new Set(['unit_opened','unit_completed','lab_completed']);
const key=(e,id)=>'academy-activity:'+e+':'+id;
function validEvent(event){
 const id=String(event.activity_id||'').toUpperCase(),kind=event.event_type;
 return permitted.has(kind)&&
  ((kind.startsWith('unit_')&&/^UC(?:0[1-9]|1[0-6])$/.test(id))||
   (kind==='lab_completed'&&/^L(?:0[1-9]|1[0-2])$/.test(id)))?
  {event_type:kind,activity_id:id}:null;
}
async function client(){
 if(!clientPromise)clientPromise=new Promise((resolve,reject)=>{
  if(window.supabase?.createClient)return resolve(window.supabase.createClient(cfg.url,cfg.publishableKey));
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload=()=>window.supabase?.createClient?resolve(window.supabase.createClient(cfg.url,cfg.publishableKey)):reject(Error('SDK not ready'));
  script.onerror=()=>reject(Error('SDK unavailable'));document.head.append(script);
 }).catch(err=>{clientPromise=null;throw err});
 return clientPromise;
}
async function log(event){
 const data=validEvent(event||{});if(!data)return;
 // Visitas repetidas à mesma lição na mesma sessão: máximo a cada 30 min.
 if(data.event_type==='unit_opened'){
  const id=key(data.event_type,data.activity_id);
  try{
   const previous=Number(sessionStorage.getItem(id)||0);
   if(Date.now()-previous<30*60*1000)return;
   sessionStorage.setItem(id,String(Date.now()));
  }catch{}
 }
 try{
  const sdk=await client();const {data:userData,error:authErr}=await sdk.auth.getUser();
  if(authErr||!userData?.user)return; // visitantes anónimos não são registados
  const user_id=userData.user.id;
  await sdk.from('student_activity').insert({user_id,...data});
  if(data.event_type.endsWith('_completed')){
   await sdk.from('student_progress').upsert({
    user_id,
    activity_type:data.event_type.startsWith('unit_')?'unit':'lab',
    activity_id:data.activity_id,
    completed_at:new Date().toISOString()
   },{onConflict:'user_id,activity_type,activity_id'});
  }
 }catch{
  // Registos pedagógicos são auxiliares; nunca bloqueiam a aula.
 }
}
window.addEventListener('academy-study-event',event=>{void log(event.detail)});
function ready(){
 const page=document.body.dataset.page;
 if(page!=='lesson')return;
 const id=new URLSearchParams(location.search).get('uc')||'UC01';
 void log({event_type:'unit_opened',activity_id:id.toUpperCase()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
else ready();
})();
