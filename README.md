# Academia Linux · Open Learning Lab

Plataforma gratuita de aprendizagem Linux em **português de Portugal e inglês**, alojável no **GitHub Pages**, com navegação por páginas, cursos, comandos, laboratórios e vídeos. Projeto independente, sem chat, sem execução real de comandos e sem analytics instalados.

## Modelo misto: público + alunos registados (preparado em 08/11/2026)

### Matriz de acesso

| Área | Visitante sem conta | Aluno com sessão válida |
|---|---|---|
| Página inicial, história, distribuições, videoteca, biblioteca de comandos | Público | Público |
| UC01–UC11 e UC15 (iniciação / intermédio) | Acesso às 12 unidades completas | Acesso às mesmas 12 unidades |
| UC12, UC13, UC14 e UC16 (aplicação / avançado) | Apenas título, resumo e convite a entrar | Conteúdo obtido de `registered_lessons` quando publicado |
| Laboratórios simulados | Permanecem públicos nesta fase | Permanecem públicos nesta fase |
| Histórico pessoal sincronizado | Não disponível | Preparado em `student_progress` para futuras funcionalidades |

**Estado real:** a parte visual e a estrutura SQL de controlo de acesso estão implementadas. A inscrição e a leitura autenticada ainda requerem um projeto Supabase configurado. Até lá, as quatro unidades avançadas mostram um ecrã informativo e não carregam uma aula completa.

### Como concluir a ativação

1. Criar e associar um projeto Supabase à academia, com controlo administrativo do proprietário.
2. Em **Authentication → Providers → Email**, manter **Confirm Email** ativo. Configurar envio de mensagens (SMTP apropriado), limites e proteção contra abuso.
3. Em **Authentication → URL Configuration**, usar:
   - **Site URL:** `https://nekas1980.github.io/academia-linux/`
   - **Redirect URLs:** `https://nekas1980.github.io/academia-linux/inscricao.html`
4. Executar `backend/supabase/001_modelo_misto.sql` no SQL Editor. Rever grants e políticas RLS e testar com dois utilizadores distintos antes de abrir inscrições.
5. Preencher **somente** os valores públicos `url` e `publishableKey` do ficheiro `auth-config.js` (nunca uma chave administrativa).
6. Inserir as lições avançadas em `public.registered_lessons` diretamente no backend, para `unit_id` UC12, UC13, UC14 e UC16, em `language` pt/en, com `published = true`, depois de validar o formato e o conteúdo. Não incluir os textos premium no GitHub.
7. Verificar: visitante anónimo recebe zero linhas; inscrito autenticado consegue ler as aulas publicadas; utilizador A não lê nem modifica progresso do utilizador B. Testar confirmação de email, login, recuperação e logout.
8. Atualizar a informação RGPD da página `privacidade.html`, incluindo identidade/contactos do responsável, finalidades, retenção, fornecedores, direitos e transferências aplicáveis, antes de recolher inscrições.

### Segurança e limites

- **Não é uma proteção por JavaScript**: o backend é quem controla a leitura das aulas através de políticas RLS. Ocultar botões ou redirecionar no browser não protege conteúdos publicados num repositório GitHub aberto.
- Os ficheiros públicos agora contêm apenas metadados das quatro unidades avançadas. **As versões anteriormente publicadas permanecem potencialmente acessíveis pelo histórico Git**, pelo que não se deve considerar o texto antigo confidencial. Os novos módulos reservados devem ser escritos e mantidos exclusivamente no backend.
- As tarefas de laboratório e os comandos de referência continuam a ser exercícios **simulados e públicos**. Reservar laboratórios reais exige uma infraestrutura isolada e autenticação adicional.
- A infraestrutura Supabase **não foi criada, ligada nem testada com contas reais** por esta alteração.
- Os conteúdos avançados não aparecem automaticamente após o registo: é necessário carregá-los e publicá-los na tabela autorizada.

## Estrutura da versão 2

| Página | Funcionalidade |
|---|---|
| `index.html` | Homepage simplificada com ligações para todas as áreas |
| `cursos.html` | 16 unidades PT/EN, pesquisa e filtros de nível |
| `aula.html?uc=UC01` | Página própria da unidade, objetivos, matéria, comandos e quiz |
| `comandos.html` | 53 comandos de referência, categorias, exemplos e cópia |
| `laboratorios.html` | 12 missões simuladas por nível e validação passo a passo |
| `videos.html` | 8 vídeos externos, filtros temáticos, grelha/lista e três tamanhos de reprodução |
| `inscricao.html` | Estrutura para registo, login e recuperação por email via Supabase Auth |
| `privacidade.html` | Informação inicial de privacidade, a rever antes de ativar contas |
| `peppery.html` | Peppery Linux, perfis técnicos e documentação da distribuição em desenvolvimento |
| `formador.html` | Gestão de evolução pedagógica acessível só ao formador com papel admin e MFA AAL2 |

Outros ficheiros: `portal.css`, `portal.js`, `conteudos-extra.js`, `curriculum.js`, `auth.js`, `auth-config.js`, `tests.mjs`, `.github/workflows/validar-site.yml` e `.nojekyll`.

Os antigos `app.js` e `styles.css` pertencem à versão inicial; a nova navegação não depende deles.

## Publicação no GitHub Pages

1. Abrir `https://github.com/Nekas1980/academia-linux`.
2. Em **Settings → Pages**, manter **Deploy from a branch → main → /(root)**.
3. Depois do deployment, abrir **https://nekas1980.github.io/academia-linux/**.
4. Cada alteração integrada em `main` é publicada pelo GitHub Pages, sem domínio próprio e sem servidor local.
5. Em **Actions**, consultar `Testar Academia Linux` e `pages build and deployment`.

## Inscrição de alunos — situação importante

**Não existem contas ativas nesta versão enquanto `auth-config.js` estiver vazio.** O formulário fica desativado; nenhuma palavra-passe é recolhida. O conteúdo educativo permanece público.

GitHub Pages é alojamento estático e não executa código de servidor: não é possível validar emails, guardar passwords em segurança ou bloquear autenticamente as páginas só com HTML/JavaScript. A funcionalidade de autenticação foi preparada com **Supabase Auth**, mas exige configuração do titular do projeto.

### Ativar Supabase Auth de forma segura

1. Criar um projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. Em **Authentication → Providers**, configurar Email e a confirmação de endereço. Antes de abertura pública, configurar um SMTP adequado e limites de utilização.
3. Em **Authentication → URL Configuration**, definir:
   - Site URL: `https://nekas1980.github.io/academia-linux/`
   - Redirect URL autorizada: `https://nekas1980.github.io/academia-linux/inscricao.html`
4. Em **Project Settings**, obter **Project URL** (HTTPS) e uma chave **publishable** (prefixo `sb_publishable_`).
5. Preencher **apenas** os dois campos públicos de `auth-config.js`:
   ```js
   window.ACADEMY_AUTH_CONFIG = {
     url: 'https://exemplo-id.supabase.co',
     publishableKey: 'sb_publishable_EXEMPLO_PUBLICO'
   };
   ```
6. **Nunca** colocar no repositório chaves secretas, `service_role`, tokens administrativos ou credenciais de utilizadores. Se futuramente houver base de dados de progresso, criar tabelas com **Row Level Security (RLS)** corretamente definida.
7. Revisar a informação de privacidade, a base jurídica, contactos de responsável, conservação e direitos de titulares antes de ativar inscrições reais.
8. Testar a criação de conta, confirmação de email, início e fim de sessão e recuperação de password com contas de teste.

A inscrição, por si só, **não restringe o acesso às páginas públicas nem sincroniza progresso**. Para uma área de aluno privada ou sincronização de avaliação, será necessário um backend autorizado com controlos de acesso.

Referências:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/reference/javascript/installing
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

## Laboratórios

- A consola é um simulador limitado e seguro. **Não é um shell Linux**: as respostas, processos, utilizadores, ficheiros e endereços IP são demonstrativos.
- As 12 missões pedem sequências de comandos, com resultado de aprendizagem validado pela correspondência de texto.
- A biblioteca apresenta 53 comandos de referência, mas as demonstrações visuais não substituem um laboratório com máquinas virtuais.
- O estado das unidades, missões e idioma é guardado no **localStorage do navegador**; não há perfis nem sincronização nesta fase.

## Vídeos

- 8 ligações a vídeos publicados nos respetivos canais do YouTube.
- Podem ser reproduzidos no leitor com maior privacidade (`youtube-nocookie.com`) após clique ou abertos diretamente no YouTube.
- Existem modos de tamanho pequeno, normal e cinema e organização grelha/lista.
- Não existem descarregamentos ou cópias dos vídeos. A incorporação pode ser desativada pelos autores.

## Testes

Executar num clone do projeto:

```bash
node tests.mjs
node --check portal.js
node --check auth.js
```

O GitHub Actions executa os testes automaticamente.

### Renderização HTML e prevenção de XSS

O ficheiro `portal.js` utiliza um renderizador com `DOMParser` e cópia de nós através de uma **lista restrita de elementos e atributos**. Não aceita elementos `script`, eventos `on*`, `javascript:` em ligações nem HTML/SVG arbitrário. Os dados dinâmicos continuam a ser codificados como texto. A proteção será revista antes de aceitar conteúdos criados por alunos ou importados de terceiros. Existem testes funcionais de regressão em `smoke-test.mjs`; esta mitigação não substitui auditoria completa de segurança.

## Roadmap

- Autenticação Supabase e política de privacidade operacional.
- Área de aluno com progressão por UC, se existir serviço backend com RLS.
- Percursos especializados Debian/Ubuntu, Kali, Fedora/RHEL, openSUSE e Arch.
- Laboratórios Linux reais em VMs isoladas, complementares às simulações.
- Analytics com documentação e controlos de privacidade.
- Dicionário de comandos por distribuição, avaliações e evidências práticas.

---

## English summary

Academia Linux is an independent, bilingual (European Portuguese/English) learning site with **10 separate pages**, **16 course units**, **53 command examples**, **12 safe simulated labs**, **8 YouTube videos** and optional registration prepared for Supabase Auth. The homepage is intentionally short. The account UI remains disabled until secure authentication is configured; public lessons remain open. No real shell commands are executed.


## Integração do Peppery Linux

A Academia apresenta agora uma página pública [Peppery Linux](peppery.html), que referencia o projeto [Nekas1980/peppery-linux](https://github.com/Nekas1980/peppery-linux). São seis perfis planeados: Core, Dev, Data, Forensics, SOC e Pentest Lab opcional. A página identifica claramente a base Ubuntu 26.04 LTS e o estado **0.1.0-dev**, sem prometer imagens bootáveis ou acesso remoto já operacionais. O Peppery reutiliza o kernel fornecido por Ubuntu; não desenvolve kernel novo nesta versão. Para dar a cada aluno um terminal Linux real teremos de validar a imagem numa VM isolada e usar um serviço de laboratórios com limites de recursos, sessões e resets. Supabase destina-se às contas, progresso e conteúdos reservados; não é um hipervisor.


## Próxima etapa: inscrição por convite, MFA e monitorização

A infraestrutura de segurança avançada foi preparada nos ficheiros `backend/supabase/002_identidade_primeiro_login_mfa.sql` e `backend/supabase/003_atividade_e_formador.sql`, **ainda não executados no Supabase**. Não afirmar que a abertura de inscrições está concluída.

Recomendamos **convites individuais enviados por email através do Supabase Auth**, em vez de enviar passwords provisórias em texto simples. O aluno segue a ligação de ativação, escolhe a primeira password pessoal (10+ caracteres, complexidade), confirma MFA TOTP e completa um perfil opcional de formação. Um estado controlado no servidor `must_change_password` impede acesso avançado antes da mudança, e as políticas RLS exigem AAL2 (MFA válido) para as aulas reservadas.

A página `formador.html` apresenta progressão de unidades/laboratórios e eventos pedagógicos aos utilizadores com **`app_metadata.academy_role=admin` atribuído no servidor** e MFA AAL2. Não deve haver qualquer autorização administrativa baseada apenas no navegador ou em `user_metadata`.

Os registos reais de login, recuperação de conta e MFA permanecem nos **Auth Audit Logs** nativos do Supabase. `student_activity` contém somente eventos pedagógicos de utilizadores autenticados e não substitui auditoria forense nem avaliação certificada. O progresso registado pelo browser é **autodeclarado** e só poderá contar para certificados quando existir avaliação validada por backend.

O procedimento de rollout, privacidade e testes encontra-se em [backend/ONBOARDING_E_SEGURANCA.md](backend/ONBOARDING_E_SEGURANCA.md). O modelo de convite encontra-se em [backend/email/convite-aluno.html](backend/email/convite-aluno.html).
