-- Academia Linux · ETAPA 2 · identidade, primeiro acesso e MFA
-- REVISAR ANTES DE EXECUTAR num projeto Supabase de produção.
-- Pré-requisito: backend/supabase/001_modelo_misto.sql executado com sucesso.
-- Esta migração não guarda passwords em texto; Supabase Auth gere os hashes.
--
-- Ao criar um utilizador, a base assinala que é obrigatória uma alteração
-- de password no primeiro acesso. Uma atualização efetiva do hash de Auth
-- retira a obrigação através de trigger sob controlo do servidor.
-- Um utilizador normal não tem privilégios para alterar este estado.
-- Nota: deve ser testado com conta piloto antes de aplicar a alunos reais.

begin;

create table if not exists public.student_security (
  user_id uuid primary key references auth.users(id) on delete cascade,
  must_change_password boolean not null default true,
  password_changed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.student_security enable row level security;
revoke all on public.student_security from anon, authenticated;
grant select on public.student_security to authenticated;

drop policy if exists security_read_own on public.student_security;
create policy security_read_own on public.student_security
  for select to authenticated using (user_id = (select auth.uid()));

-- Perfil com informação mínima necessária à formação.
-- NÃO guardar data de nascimento, morada, telefone, NIF ou informações sensíveis.
create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (length(display_name) <= 80),
  experience_level text check (experience_level in ('beginner','intermediate','advanced')),
  learning_track text check (learning_track in ('linux','soc','forensics','dev','security')),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;
revoke all on public.student_profiles from anon, authenticated;
grant select, insert, update on public.student_profiles to authenticated;

drop policy if exists profiles_read_own on public.student_profiles;
create policy profiles_read_own on public.student_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists profiles_insert_own on public.student_profiles;
create policy profiles_insert_own on public.student_profiles
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists profiles_update_own on public.student_profiles;
create policy profiles_update_own on public.student_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- As funções executam com privilégios de postgres, search_path fixo
-- e objetos com schema explícito, para evitar pesquisa ambígua.
create or replace function public.academy_initialize_student()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_security (user_id, must_change_password)
  values (new.id, true)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists academy_student_insert on auth.users;
create trigger academy_student_insert
  after insert on auth.users
  for each row execute function public.academy_initialize_student();

create or replace function public.academy_note_password_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password
     and new.encrypted_password is not null
     and new.encrypted_password <> '' then
    update public.student_security
       set must_change_password = false, password_changed_at = now()
     where user_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists academy_student_password_change on auth.users;
create trigger academy_student_password_change
  after update of encrypted_password on auth.users
  for each row execute function public.academy_note_password_change();

-- Aplicável também à conta de teste já criada.
insert into public.student_security (user_id,must_change_password)
select id,true from auth.users
on conflict (user_id) do nothing;

-- Não basta estar autenticado: avançados exigem password inicial alterada
-- e sessão MFA comprovada (AAL2), verificadas do lado da base de dados.
drop policy if exists registered_read_published_lessons on public.registered_lessons;
create policy registered_read_published_lessons
on public.registered_lessons for select to authenticated
using (
  published = true
  and (select auth.uid()) is not null
  and (select auth.jwt()->>'aal') = 'aal2'
  and exists (
    select 1 from public.student_security ss
    where ss.user_id = (select auth.uid())
      and ss.must_change_password = false
  )
);

commit;

-- VERIFICAÇÕES (executar em consulta separada)
-- select tablename,rowsecurity from pg_tables
-- where schemaname='public'
-- and tablename in ('registered_lessons','student_progress','student_security','student_profiles');
-- select tablename,policyname from pg_policies
-- where schemaname='public'
-- and tablename in ('registered_lessons','student_progress','student_security','student_profiles');
--
-- Testar com duas contas distintas:
-- 1. Inicialmente must_change_password=true para ambas.
-- 2. Após auth.updateUser({password:'nova...'}), flag da conta é false.
-- 3. Sem MFA/AAL2 não é possível ler registered_lessons.
-- 4. Com MFA/AAL2 e password alterada, apenas conteúdos published=true.
-- 5. Um aluno nunca consegue alterar student_security de outro (nem o seu).
--
-- Para criação de credenciais temporárias pelo administrador:
-- Usar UI administrativa segura do Supabase ou Admin API SÓ no servidor.
-- Gerar password aleatória, única e forte para cada aluno, e fornecer
-- de forma segura. Não colocar passwords em logs, GitHub ou email normal.
-- A abordagem preferida é convite de utilização única por email validado
-- para o aluno escolher a password inicial, evitando distribuir passwords.
