import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const here = path.dirname(new URL(import.meta.url).pathname);
const source = name => fs.readFileSync(path.join(here, name), 'utf8');
const pages = ['index.html','cursos.html','aula.html','comandos.html','laboratorios.html','videos.html','inscricao.html','privacidade.html'];
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
  assert.equal(doc.querySelectorAll('.nav a').length, 6, name + ': navigation');
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
  assert.equal(doc.querySelectorAll('.card').length,6,'Home page navigation cards');
  dom.window.close();
}
{
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
console.log('OK: '+tested+' pages + home, search, PT/EN, quiz, commands, mission, video modes and registration safeguards.');
