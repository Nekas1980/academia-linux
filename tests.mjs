import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
global.window = {};
require('./curriculum.js');
const data = window.ACADEMY;
assert.equal(data.units.length,16,'16 unidades de aprendizagem');
assert.equal(new Set(data.units.map(u=>u.id)).size,data.units.length,'IDs exclusivos');
for(const unit of data.units){
  assert.match(unit.id,/^UC\d{2}$/);
  assert.ok(['beginner','intermediate','advanced'].includes(unit.level));
  for(const lang of ['pt','en']){
    const lesson=unit[lang];
    for(const key of ['title','summary','goals','steps','commands','quiz','source']) assert.ok(lesson[key],`${unit.id}.${lang}.${key}`);
    assert.equal(lesson.steps.length,3,`${unit.id}.${lang}: 3 etapas`);
    assert.ok(lesson.commands.length>0);
    assert.ok(lesson.quiz[2]>=0 && lesson.quiz[2]<lesson.quiz[1].length);
    assert.ok(lesson.source.startsWith('https://'));
  }
}
assert.equal(data.distros.length,6);
assert.equal(data.videos.length,4);
for(const v of data.videos) assert.match(v.id,/^[A-Za-z0-9_-]{11}$/);
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
for(const id of ['course-grid','distro-grid','terminal-output','lesson-dialog','video-grid']) assert.ok(html.includes(`id="${id}"`));
assert.ok(!/gtag\(|google-analytics\.com|chatbot|chatgpt/i.test(html),'Não incorporar chat ou analytics');
console.log('OK · 16 UCs bilingues, 6 distribuições, 4 vídeos e estrutura HTML validada.');
