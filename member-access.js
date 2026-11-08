/* Academia Linux · acesso real por sessão Supabase + Row Level Security.
   O código PREMIUM nunca deve ser incluído nos ficheiros públicos do GitHub. */
(() => {
'use strict';
const cfg=window.ACADEMY_AUTH_CONFIG||{};
const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(cfg.url||'') &&
 /^sb_publishable_[A-Za-z0-9_-]+$/.test(cfg.publishableKey||'');
const restricted=new Set(['UC12','UC13','UC14','UC16']);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const lang=()=>{try{return localStorage.getItem('academia-linux-lang')==='en'?'en':'pt'}catch{return'pt'}};
const t=(pt,en)=>lang()==='pt'?pt:en;
const unitId=(new URLSearchParams(location.search).get('uc')||'').toUpperCase();
let client=null,attempt=0,loadingPromise=null;
function message(el,title,text){
 if(!el)return;
 el.replaceChildren();
 const h=document.createElement('h3');h.textContent=title;
 const p=document.createElement('p');p.textContent=text;
 el.append(h,p);
}
function ensureClient(){
 if(client)return Promise.resolve(client);
 if(loadingPromise)return loadingPromise;
 loadingPromise=new Promise((resolve,reject)=>{
  if(window.supabase?.createClient){resolve(window.supabase.createClient(cfg.url,cfg.publishableKey));return}
  const script=document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.referrerPolicy='no-referrer';
  script.onload=()=>{if(!window.supabase?.createClient){reject(Error('Authentication SDK not available'));return}resolve(window.supabase.createClient(cfg.url,cfg.publishableKey))};
  script.onerror=()=>reject(Error('Unable to load authentication SDK'));
  document.head.appendChild(script);
 }).then(v=>(client=v)).catch(err=>{loadingPromise=null;throw err});
 return loadingPromise;
}
function validContent(c){
 return c&&typeof c==='object'&&!Array.isArray(c) &&
 Array.isArray(c.goals)&&c.goals.every(v=>typeof v==='string') &&
 Array.isArray(c.steps)&&c.steps.every(v=>typeof v==='string') &&
 Array.isArray(c.commands)&&c.commands.every(v=>Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='string')) &&
 Array.isArray(c.quiz)&&c.quiz.length>=4&&typeof c.quiz[0]==='string' &&
 Array.isArray(c.quiz[1])&&c.quiz[1].every(x=>typeof x==='string') &&
 Number.isInteger(c.quiz[2])&&c.quiz[2]>=0&&c.quiz[2]<c.quiz[1].length &&
 typeof c.quiz[3]==='string';
}
function showLesson(el,c,sessionUser,db){
 const source=typeof c.source==='string'&&/^https:\/\//.test(c.source)?c.source:null;
 el.innerHTML=
 '<h3>'+esc(t('Objetivos de aprendizagem','Learning objectives'))+'</h3>'+
 '<ul>'+c.goals.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
 '<h3>'+esc(t('Conteúdo formativo','Course content'))+'</h3>'+
 c.steps.map((x,i)=>'<div class="lesson-step"><span class="tag">'+(i+1)+'</span><p>'+esc(x)+'</p></div>').join('')+
 '<h3>'+esc(t('Exemplos de comandos','Command examples'))+'</h3>'+
 c.commands.map(([cmd,why])=>'<div class="code-row"><code>'+esc(cmd)+'</code></div><p class="mini">'+esc(why)+'</p>').join('')+
 (source?'<p><a target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">'+esc(t('Consultar documentação','Read documentation'))+' ↗</a></p>':'')+
 '<div class="quiz"><h3>'+esc(t('Avaliação da unidade','Unit assessment'))+'</h3><p>'+esc(c.quiz[0])+'</p>'+
 '<form id="member-quiz">'+c.quiz[1].map((choice,i)=>'<label><input type="radio" name="member-answer" value="'+i+'"> '+esc(choice)+'</label>').join('')+
 '<button class="btn dark" type="submit">'+esc(t('Validar resposta','Check answer'))+'</button>'+
 '<p class="feedback" id="member-feedback" role="status"></p></form></div>';
 const form=el.querySelector('#member-quiz');
 form.addEventListener('submit',async e=>{
  e.preventDefault();
  const selected=el.querySelector('input[name="member-answer"]:checked');
  const feedback=el.querySelector('#member-feedback');
  if(!selected){feedback.textContent=t('Seleciona uma resposta.','Select an answer.');feedback.className='feedback bad';return}
  if(Number(selected.value)!==c.quiz[2]){feedback.textContent=t('Resposta incorreta. Revê a unidade.','Incorrect answer. Review the unit.');feedback.className='feedback bad';return}
  feedback.textContent=t('Resposta correta. A guardar progresso...','Correct. Saving progress...');
  feedback.className='feedback ok';
  try{
   const {error}=await db.from('student_progress').upsert({
    user_id:sessionUser.id,activity_type:'unit',activity_id:unitId,completed_at:new Date().toISOString()
   },{onConflict:'user_id,activity_type,activity_id'});
   if(error)throw error;
   feedback.textContent=t('Unidade concluída. Progresso guardado na tua conta.','Unit complete. Progress saved to your account.');
  }catch{
   feedback.textContent=t('Resposta correta, mas não foi possível sincronizar o progresso.','Correct answer, but progress could not be synchronized.');
  }
 });
}
async function mount(){
 const el=document.getElementById('member-content');if(!el||!restricted.has(unitId))return;
 const request=++attempt;
 if(!configured){
  message(el,t('Inscrição ainda indisponível','Registration not yet available'),
   t('A autenticação e a base de dados estão por configurar. Os conteúdos avançados não são publicados neste site.','Authentication and the database are not configured. Advanced lesson content is not publicly published on this site.'));
  return;
 }
 message(el,t('A validar a sessão','Checking session'),t('A consultar o serviço de autenticação.','Connecting to authentication provider.'));
 try{
  const api=await ensureClient();if(request!==attempt)return;
  const {data:userData,error:authError}=await api.auth.getUser();
  if(request!==attempt)return;
  if(authError||!userData?.user){
   message(el,t('Inicia sessão para aceder','Sign in to access'),
    t('É necessária uma conta de aluno válida para consultar esta aula.','A valid learner account is required to access this lesson.'));
   return;
  }
  const {data,error}=await api.from('registered_lessons')
   .select('content').eq('unit_id',unitId).eq('language',lang()).eq('published',true).maybeSingle();
  if(request!==attempt)return;
  if(error)throw error;
  if(!data?.content){
   message(el,t('Unidade ainda não publicada','Lesson not yet published'),
    t('A tua sessão está ativa, mas este conteúdo ainda não foi disponibilizado.','You are signed in, but this lesson has not been published yet.'));
   return;
  }
  if(!validContent(data.content))throw Error('Unexpected lesson format');
  showLesson(el,data.content,userData.user,api);
 }catch(err){
  if(request!==attempt)return;
  message(el,t('Não foi possível abrir a unidade','Unable to load this lesson'),
   t('Confirma a ligação à Internet e a configuração de permissões do serviço.','Check your connection and backend access settings.'));
  console.warn('Member course fetch failed:',err?.message||err);
 }
}
window.addEventListener('academy-member-render',mount);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
else mount();
})();