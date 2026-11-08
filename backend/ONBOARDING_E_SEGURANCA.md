# Academia Linux · Procedimento de convites, MFA e supervisão (pré-produção)

## Regra de credenciais por email

**Não enviar palavras-passe temporárias por email.** Utilizar o convite de uso limitado do Supabase:
**Authentication → Users → Add user → Send invitation**, após configurar SMTP próprio e o endereço de retorno.
Cada convite é individual e contém um token. O aluno abre o link, define uma **palavra-passe pessoal e exclusiva** e configura MFA TOTP. O Supabase armazena hashes das palavras-passe; o GitHub e os logs não as recebem.

O email de convite pode usar o modelo de `backend/email/convite-aluno.html` em **Authentication → Emails → Invite user**. A variável `{{ .ConfirmationURL }}` é substituída pelo serviço Supabase. Nunca substituir por um token fixo.

A opção **Allow new users to sign up** continua desativada até teste e decisão explícita. Para turmas por convite, a inscrição pública pode permanecer desativada.

## Migrações SQL (executar por ordem)

1. `backend/supabase/001_modelo_misto.sql` — **já aplicado**: cursos avançados e progresso (RLS).
2. `backend/supabase/002_identidade_primeiro_login_mfa.sql` — **por aplicar**: perfil mínimo e primeiro acesso; trigger de alteração efetiva da password e acesso avançado apenas com AAL2.
3. `backend/supabase/003_atividade_e_formador.sql` — **por aplicar**: eventos pedagógicos e resumo de progresso para formador autorizado.

As migrações 002 e 003 devem ser ensaiadas num projeto de teste antes de produção. A alteração de `auth.users` com triggers merece validação específica: um trigger com falha pode impedir inscrições ou mudanças de palavra-passe.

## Sequência recomendada de validação

- Criar/utilizar uma conta de teste autorizada.
- Aplicar a migração 002 e confirmar `student_security.must_change_password = true`.
- No site, iniciar sessão, definir password nova e confirmar que a mudança real faz o indicador passar a `false`.
- Configurar MFA (TOTP): digitalizar QR privado, validar código e confirmar AAL2.
- Confirmar que aluno sem MFA não consegue ler `registered_lessons`, mesmo que estejam publicadas.
- Aplicar migração 003, completar uma unidade e verificar `student_progress` e `student_activity`.
- Em dois alunos distintos, confirmar que cada um vê apenas o seu próprio perfil, progresso e atividade.
- Configurar separadamente o papel de formador em **`app_metadata.academy_role = "admin"`** através de um processo administrativo de confiança. **Não usar `user_metadata` nem controlar o papel apenas no navegador.**
- Com sessão MFA/AAL2 e papel admin, testar `formador.html`. Uma conta sem esse papel deve ver acesso negado.
- Testar recuperação de palavra-passe, expiração de sessões, logs e restabelecimento de MFA.

## Tipos de logs e sua fiabilidade

**Registos de segurança:** usar *Auth Audit Logs* nativos do Supabase para logins, alterações de password, recuperação e MFA. São consultados pelo administrador no Dashboard, não expostos ao site.

**Eventos pedagógicos:** `student_activity` guarda apenas `unit_opened`, `unit_completed`, `lab_completed`, `activity_id`, data e ID do aluno. Não guardar IP, User-Agent, senha, token, QR, comando digitado nem resposta a questões.

**Aviso:** os eventos/contagens originados no JavaScript do aluno podem ser falsificados. São indicadores de acompanhamento **não certificados**. Para exames/avaliação oficial, usar validação e classificação num serviço de backend confiável.

## Emails, privacidade e operação

- Para enviar convites a alunos externos à equipa Supabase, configurar SMTP próprio, domínio e autenticação de email (SPF/DKIM/DMARC) antes de lançamento.
- O SMTP por defeito destina-se a testes limitados e não a produção; confirmar políticas e limites atuais.
- Usar o mínimo de dados do aluno: nome de apresentação opcional, nível e percurso.
- Informar previamente finalidades, base legal, responsáveis, retenção, direitos, subcontratantes e eventuais transferências RGPD.
- Definir período de conservação, rotação e controlo de acessos aos logs.
- Rever manualmente segurança, RLS e acessibilidade antes de abrir inscrições.

Referências oficiais:
- https://supabase.com/docs/guides/auth/users
- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/auth-mfa/totp
- https://supabase.com/docs/guides/auth/audit-logs
- https://supabase.com/docs/guides/database/postgres/row-level-security
