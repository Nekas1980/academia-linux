import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);
const file=name=>fs.readFileSync(path.join(root,name),'utf8');
const context={window:{}};vm.createContext(context);
vm.runInContext(file('curriculum.js'),context,{filename:'curriculum.js'});
vm.runInContext(file('conteudos-extra.js'),context,{filename:'conteudos-extra.js'});
const {ACADEMY:A,ACADEMY_EXTRA:E}=context.window;
assert.equal(A.units.length,16);
assert.equal(E.commands.length>=50,true);
assert.equal(E.labs.length,12);
assert.equal(A.videos.length+E.videosExtra.length>=8,true);
assert.equal(new Set(A.units.map(u=>u.id)).size,A.units.length);
assert.equal(new Set(E.labs.map(l=>l.id)).size,E.labs.length);
assert.equal(new Set(E.commands.map(c=>c[1])).size,E.commands.length);
const restrictedIds=new Set(['UC12','UC13','UC14','UC16']);
assert.equal(A.units.filter(u=>u.restricted).length,4,'4 restricted courses');
assert.equal(A.units.filter(u=>!u.restricted).length,12,'12 public courses');
for(const unit of A.units){
  assert.equal(!!unit.restricted,restrictedIds.has(unit.id),'Access policy '+unit.id);
  for(const lang of ['pt','en']){
    const x=unit[lang];
    assert.ok(x?.title&&x.summary,unit.id+' '+lang);
    if(unit.restricted){
      assert.deepEqual(Array.from(x.steps),[],'Premium steps must not ship in public JS '+unit.id);
      assert.deepEqual(Array.from(x.commands),[],'Premium commands must not ship in public JS '+unit.id);
      assert.deepEqual(Array.from(x.quiz),[],'Premium quizzes must not ship in public JS '+unit.id);
      assert.deepEqual(Array.from(x.goals),[],'Premium goals must not ship in public JS '+unit.id);
      continue;
    }
    assert.ok(x.steps?.length>=3&&x.commands?.length&&x.quiz?.length>=3,unit.id+' '+lang);
    assert.ok(x.quiz[2]>=0&&x.quiz[2]<x.quiz[1].length);
  }
}
for(const cmd of E.commands){
  assert.equal(cmd.length,5);
  assert.ok(cmd[0].includes('|')&&cmd[1]&&cmd[2]&&cmd[3]&&cmd[4]);
}
const validVideoIds=[...A.videos,...E.videosExtra];
for(const v of validVideoIds)assert.match(v.id,/^[A-Za-z0-9_-]{11}$/);
for(const lab of E.labs){
  for(const lang of ['pt','en'])assert.ok(lab[lang]?.length===2);
  assert.ok(lab.steps?.length>=2);
}
const routes=['index.html','cursos.html','aula.html','comandos.html','laboratorios.html','videos.html','inscricao.html','privacidade.html'];
const files=['curriculum.js','conteudos-extra.js','portal.js','auth.js','auth-config.js','member-access.js','portal.css','favicon.svg','backend/supabase/001_modelo_misto.sql'];
for(const f of files)assert.ok(fs.existsSync(path.join(root,f)),f);
for(const f of ['curriculum.js','conteudos-extra.js','portal.js','auth.js','auth-config.js','member-access.js'])new vm.Script(file(f),{filename:f});
for(const p of routes){
  const html=file(p);
  assert.match(html,/<html lang="pt-PT">/);
  assert.match(html,/<div id="app">/);
  assert.match(html,/href="portal.css"/);
  for(const js of ['curriculum.js','conteudos-extra.js','portal.js'])assert.ok(html.includes('src="'+js+'"'),p+' needs '+js);
  assert.ok(!/chatbot|chatgpt|gtag\(|google-analytics\.com/i.test(html),'No assistant chat/tracking');
}
assert.match(file('inscricao.html'),/src="auth-config.js"/);
assert.match(file('inscricao.html'),/src="auth.js"/);
assert.match(file('portal.js'),/youtube-nocookie\.com\/embed/);
assert.match(file('portal.js'),/localStorage/);
assert.match(file('portal.js'),/SIMULAÇÃO|SIMULATION/);
assert.match(file('portal.js'),/privacidade\.html/);
assert.match(file('aula.html'),/src="member-access.js"/);
assert.match(file('aula.html'),/src="auth-config.js"/);
assert.match(file('portal.js'),/member-content/);
assert.match(file('member-access.js'),/\.from\('registered_lessons'\)/);
const dbMigration=file('backend/supabase/001_modelo_misto.sql');
assert.match(dbMigration,/enable row level security/);
assert.match(dbMigration,/to authenticated/);
assert.match(dbMigration,/revoke all on table public\.registered_lessons from anon, authenticated/);
assert.doesNotMatch(dbMigration,/grant\s+select\s+on\s+table\s+public\.registered_lessons\s+to\s+anon/i);
const authConfig=file('auth-config.js');
assert.doesNotMatch(authConfig,/sb_secret_|service_role|eyJ[A-Za-z0-9_-]{50,}/);
console.log('OK · 12 públicas + 4 reservadas; RLS e autenticação preparados; 8 páginas; '+A.units.length+' UCs PT/EN; '+E.commands.length+' comandos; '+E.labs.length+' labs; '+validVideoIds.length+' vídeos; JS e ligações verificados.');
