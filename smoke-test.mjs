import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(new URL(import.meta.url).pathname);
const source = name => fs.readFileSync(path.join(here, name), 'utf8');
const pages = ['index.html','cursos.html','aula.html','comandos.html','laboratorios.html','videos.html','inscricao.html','privacidade.html','peppery.html'];
let tested = 0;
function openPage(name, query='') {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', err => errors.push(err.message));
  const dom = new JSDOM(source(name), {
    url: 'https://nekas1980.github.io/academia-linux/' + name + query,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const { window } = dom;
  window.eval(source('curriculum.js'));
  window.eval(source('conteudos-extra.js'));
  window.eval(source('portal.js'));
  assert.equal(errors.length, 0, name + ': JS errors: ' + errors.join('; '));
  const doc = window.document;
  assert.ok(doc.querySelector('.site-header'), name + ': site header missing');
  assert.ok(doc.querySelector('main'), name + ': main content missing');
  assert.equal(doc.querySelectorAll('.nav a').length, 7, name + ': navigation');
  return { dom, window, doc };
}
function click(window, element) {
  assert.ok(element, 'Missing click target');
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}
function change(window, element, value) {
  element.value = value;
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
  element.dispatchEvent(new window.Event('change', { bubbles: true }));
}
function submit(window, form) {
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
}
for (const page of pages) {
  const {doc, dom}=openPage(page);
  for(const link of doc.querySelectorAll('a[href]')){
    const href=link.getAttribute('href');
    if(href && !/^(https?:|#|mailto:)/.test(href)){
      const basename=href.split(/[?#]/)[0];
      if(basename)assert.ok(fs.existsSync(path.join(here,basename)), page + ' broken link '+href);
    }
  }
  dom.window.close();tested++;
}
{
  const {doc,dom}=openPage('index.html');
  assert.equal(doc.querySelectorAll('.card').length,7,'Home page navigation cards');
  dom.window.close();
}
{
{ 
 const {doc,window,dom}=openPage('peppery.html');
 assert.match(doc.body.textContent,/Peppery Linux/,'Peppery page loads');
 assert.match(doc.body.textContent,/Ubuntu 26\.04/,'Peppery distro base');
 assert.ok(doc.querySelector('a[href="https://github.com/Nekas1980/peppery-linux"]'),'Peppery source link');
 click(window,doc.querySelector('#en'));
 assert.match(doc.body.textContent,/technical profiles/i,'Peppery English content');
 dom.window.close();
}
  const {doc,window,dom}=openPage('cursos.html');
  assert.equal(doc.querySelectorAll('#course-cards .card').length,16,'16 course cards');
  change(window,doc.querySelector('#course-query'),'UC01');
  assert.equal(doc.querySelectorAll('#course-cards .card').length,1,'Course search');
  change(window,doc.querySelector('#course-query'),'');
  click(window,doc.querySelector('#en'));
  assert.equal(doc.documentElement.lang,'en','Switch to English');
  assert.equal(doc.querySelectorAll('#course-cards .card').length,16,'English courses');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('aula.html','?uc=UC01');
  assert.match(doc.body.textContent,/UC01/);
  const question=window.ACADEMY.units[0].pt.quiz;
  const answer=doc.querySelector('input[name="answer"][value="'+question[2]+'"]');
  answer.checked=true;
  submit(window,doc.querySelector('#quiz-form'));
  assert.ok(doc.querySelector('#quiz-feedback').classList.contains('ok'),'Quiz correct answer');
  assert.equal(JSON.parse(window.localStorage.getItem('academia-portal-progress')).UC01,true,'Quiz progress');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('cursos.html');
  assert.equal(doc.querySelectorAll('#course-cards .card').length,16);
  const lockCards=Array.from(doc.querySelectorAll('#course-cards .card')).filter(x=>/Reservado a alunos registados/.test(x.textContent));
  assert.equal(lockCards.length,4,'Four advanced courses must be labelled members only');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('aula.html','?uc=UC12');
  assert.ok(doc.querySelector('#member-content'),'Protected lesson placeholder');
  assert.equal(doc.querySelector('#quiz-form'),null,'Do not render premium quiz publicly');
  assert.ok(doc.querySelector('a[href="inscricao.html?next=UC12"]'),'Safe login CTA');
  window.eval(source('auth-config.js'));
  window.eval(source('member-access.js'));
  assert.equal(doc.querySelectorAll('#member-quiz').length,0,'Protected lesson must not load without credentials');
  click(window,doc.querySelector('#en'));
  assert.ok(doc.querySelector('#member-content'),'Language switch retains protected gate');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('cursos.html');
  // User-provided strings must not be interpreted as executable markup.
  const attack='<img src=x onerror="window.__xssTriggered=1"><script>window.__xssTriggered=2</script>';
  window.ACADEMY.units[0].pt.title=attack;
  click(window,doc.querySelector('#en'));
  click(window,doc.querySelector('#pt'));
  assert.equal(doc.querySelectorAll('#course-cards script,#course-cards img').length,0,'No injected executable markup');
  assert.equal(window.__xssTriggered,undefined,'No XSS execution');
  assert.match(doc.querySelector('#course-cards .card h3').textContent,/onerror/,'Attack string is displayed as plain text');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('comandos.html');
  assert.ok(doc.querySelectorAll('.cmd-card').length>=50,'50+ commands');
  change(window,doc.querySelector('#cmd-query'),'pwd');
  assert.ok(doc.querySelectorAll('.cmd-card').length>=1,'Command search');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('laboratorios.html');
  assert.equal(doc.querySelectorAll('[data-lab]').length,12,'12 labs');
  for(const cmd of ['whoami','pwd','uname -s']){
    const input=doc.querySelector('#term-cmd');
    input.value=cmd;
    submit(window,doc.querySelector('#term-form'));
  }
  assert.match(doc.querySelector('#lab-status').textContent,/concluída/i,'Mission completion');
  assert.equal(JSON.parse(window.localStorage.getItem('academia-portal-progress')).L01,true,'Lab progress');
  click(window,doc.querySelector('[data-lab="L07"]'));
  assert.match(doc.querySelector('#lab-detail').textContent,/rede/i,'Switch missions');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('videos.html');
  assert.equal(doc.querySelectorAll('[data-play]').length,8,'8 video cards');
  click(window,doc.querySelector('[data-play]'));
  assert.ok(doc.querySelector('iframe[src*="youtube-nocookie.com"]'),'YouTube embed created on click');
  click(window,doc.querySelector('[data-size="cinema"]'));
  assert.equal(doc.querySelector('.player-shell').dataset.size,'cinema','Cinema player');
  click(window,doc.querySelector('[data-layout="list"]'));
  assert.ok(doc.querySelector('.video-layout.list'),'List layout');
  dom.window.close();
}
{
  const {doc,window,dom}=openPage('inscricao.html');
  window.eval(source('auth-config.js'));
  window.eval(source('auth.js'));
  assert.equal(doc.querySelector('#auth-submit').disabled,true,'Registration must be inactive without auth configuration');
  assert.equal(doc.querySelector('#auth-email').disabled,true,'No collection of email');
  assert.ok(doc.querySelector('a[href="privacidade.html"]'),'Privacy notice link');
  dom.window.close();
}

{
  // Prova de regressão: um aluno já inscrito é obrigado a mudar
  // a password no primeiro login antes de ver o assistente MFA.
  const {doc,window,dom}=openPage('inscricao.html');
  window.eval(source('auth-config.js'));
  const mockUser={id:'00000000-0000-4000-8000-000000000123',email:'aluno@example.invalid',app_metadata:{}};
  let mustChange=true;
  const fakeClient={
    auth:{
      getSession:async()=>({data:{session:{user:mockUser}},error:null}),
      getUser:async()=>({data:{user:mockUser},error:null}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      updateUser:async({password})=>{assert.ok(password.length>=10);mustChange=false;return {data:{user:mockUser},error:null}},
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null}),
        listFactors:async()=>({data:{totp:[]},error:null})
      }
    },
    from:(table)=>({
      select:()=>({
        eq:()=>({
          maybeSingle:async()=>({data:table==='student_security'?{must_change_password:mustChange}:null,error:null})
        })
      })
    })
  };
  window.supabase={createClient:()=>fakeClient};
  window.eval(source('auth.js'));
  window.eval(source('academy-security.js'));
  doc.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise(done=>setTimeout(done,35));
  assert.equal(doc.querySelector('#auth-form').hidden,true,'Login screen must be hidden after login');
  assert.equal(doc.querySelector('#auth-session').hidden,false,'Session controls visible');
  assert.equal(doc.querySelector('[data-auth-tab="signup"]').hidden,true,'Public signup still closed');
  assert.ok(doc.querySelector('#academy-change-password'),'First login must require password change');
  doc.querySelector('#academy-new-password').value='Unique#NewPassWord2026';
  doc.querySelector('#academy-new-confirm').value='Unique#NewPassWord2026';
  submit(window,doc.querySelector('#academy-change-password'));
  await new Promise(done=>setTimeout(done,35));
  assert.equal(mustChange,false,'Server password-change flag cleared');
  assert.ok(doc.querySelector('#academy-mfa-panel'),'MFA onboarding follows password change');
  dom.window.close();
}

{
  // Registo MFA iniciado mas ainda não verificado: reiniciar apenas esse fator.
  const {doc,window,dom}=openPage('inscricao.html');
  window.eval(source('auth-config.js'));
  const mockUser={id:'00000000-0000-4000-8000-000000000777',email:'student@example.invalid',app_metadata:{}};
  let factors=[{id:'pending-1',factor_type:'totp',friendly_name:'Academia Linux',status:'unverified'}];
  let removed=0;
  const fakeClient={
    auth:{
      getSession:async()=>({data:{session:{user:mockUser}},error:null}),
      getUser:async()=>({data:{user:mockUser},error:null}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null}),
        listFactors:async()=>({data:{totp:factors.filter(x=>x.status==='verified'),all:factors},error:null}),
        unenroll:async({factorId})=>{
          assert.equal(factorId,'pending-1','Only the pending factor may be removed');
          const item=factors.find(x=>x.id===factorId);
          assert.equal(item?.status,'unverified','Never remove a verified factor');
          removed++;factors=factors.filter(x=>x.id!==factorId);return {data:{id:factorId},error:null};
        }
      }
    },
    from:table=>({
      select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='student_security'?{must_change_password:false}:null,error:null})})})
    })
  };
  window.supabase={createClient:()=>fakeClient};
  window.eval(source('auth.js'));
  window.eval(source('academy-security.js'));
  doc.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise(resolve=>setTimeout(resolve,45));
  assert.ok(doc.querySelector('#academy-restart-mfa'),'Pending factor must be recoverable');
  click(window,doc.querySelector('#academy-restart-mfa'));
  await new Promise(resolve=>setTimeout(resolve,45));
  assert.equal(removed,1,'Only one pending MFA factor should be unenrolled');
  assert.ok(doc.querySelector('#academy-enroll'),'Enrollment can restart after cleanup');
  dom.window.close();
}

{
  // QR indisponível ou não legível: disponibilizar entrada manual da chave TOTP.
  const {doc,window,dom}=openPage('inscricao.html');
  window.eval(source('auth-config.js'));
  const mockUser={id:'00000000-0000-4000-8000-000000000778',email:'student@example.invalid',app_metadata:{}};
  const client={
    auth:{
      getSession:async()=>({data:{session:{user:mockUser}},error:null}),
      getUser:async()=>({data:{user:mockUser},error:null}),
      onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
      mfa:{
        getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal1',nextLevel:'aal1'},error:null}),
        listFactors:async()=>({data:{totp:[],all:[]},error:null}),
        enroll:async()=>({data:{id:'factor-testing',totp:{
          qr_code:'data:image/svg+xml;base64,ZmFrZQ==',
          secret:'JBSWY3DPEHPK3PXP'
        }},error:null})
      }
    },
    from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({
      data:table==='student_security'?{must_change_password:false}:null,error:null
    })})})})
  };
  window.supabase={createClient:()=>client};
  window.eval(source('auth.js'));
  window.eval(source('academy-security.js'));
  doc.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise(done=>setTimeout(done,45));
  click(window,doc.querySelector('#academy-enroll'));
  await new Promise(done=>setTimeout(done,45));
  assert.ok(doc.querySelector('#academy-manual-mfa'),'Expected manual setup option');
  assert.equal(doc.querySelector('#academy-mfa-manual').hidden,true,'Secret must start hidden');
  click(window,doc.querySelector('#academy-manual-mfa'));
  assert.equal(doc.querySelector('#academy-mfa-manual').hidden,false,'Manual key only revealed on request');
  assert.equal(doc.querySelector('#academy-mfa-secret').textContent,'JBSWY3DPEHPK3PXP');
  dom.window.close();
}
console.log('OK: '+tested+' pages + public/premium gates, PT/EN, quiz, commands, missions, videos, and signup safeguards.');
