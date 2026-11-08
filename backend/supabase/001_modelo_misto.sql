-- Academia Linux · modelo misto · esquema de preparação.
-- Executar no SQL Editor de um projeto Supabase sob gestão do proprietário.
-- NÃO colocar material exclusivo nem credenciais neste repositório público.

begin;

-- Conteúdos reservados aos utilizadores autenticados.
create table if not exists public.registered_lessons (
  unit_id text not null check (unit_id ~ '^UC[0-9]{2}$'),
  language text not null check (language in ('pt', 'en')),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (unit_id, language)
);

alter table public.registered_lessons enable row level security;
revoke all on table public.registered_lessons from anon, authenticated;
grant select on table public.registered_lessons to authenticated;

drop policy if exists registered_read_published_lessons on public.registered_lessons;
create policy registered_read_published_lessons
on public.registered_lessons for select
to authenticated
using (published = true and (select auth.uid()) is not null);

-- Apenas o proprietário administra os textos através do Supabase Dashboard,
-- de um processo de backend autorizado ou de uma conexão segura de servidor.
-- Não existem políticas INSERT, UPDATE ou DELETE para anon/authenticated.

-- Progresso por utilizador (isolado por user_id).
create table if not exists public.student_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null check (activity_type in ('unit', 'lab')),
  activity_id text not null check (activity_id ~ '^(UC|L)[0-9]{2}$'),
  completed_at timestamptz not null default now(),
  primary key (user_id, activity_type, activity_id)
);

create index if not exists student_progress_user_idx
on public.student_progress(user_id);

alter table public.student_progress enable row level security;
revoke all on table public.student_progress from anon, authenticated;
grant select, insert, update, delete on table public.student_progress to authenticated;

drop policy if exists student_read_own_progress on public.student_progress;
create policy student_read_own_progress
on public.student_progress for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists student_insert_own_progress on public.student_progress;
create policy student_insert_own_progress
on public.student_progress for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists student_update_own_progress on public.student_progress;
create policy student_update_own_progress
on public.student_progress for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists student_delete_own_progress on public.student_progress;
create policy student_delete_own_progress
on public.student_progress for delete
to authenticated
using (user_id = (select auth.uid()));

commit;

-- Verificações sugeridas APÓS execução, via SQL Editor:
-- select tablename, rowsecurity from pg_tables
--   where schemaname='public' and tablename in ('registered_lessons','student_progress');
-- select tablename, policyname, roles, cmd from pg_policies
--   where schemaname='public' and tablename in ('registered_lessons','student_progress');

-- Exemplo do FORMATO JSONB (NÃO representa uma aula premium):
-- {
--   "goals": ["Objetivo 1"], "steps": ["Explicação 1"],
--   "commands": [["comando --exemplo", "Descrição didática"]],
--   "quiz": ["Pergunta?", ["Opção A", "Opção B"], 1, "Explicação"],
--   "source": "https://www.kernel.org/doc/"
-- }
-- Para publicar uma aula, criar cada linha em registered_lessons
-- com published=true e conteúdo PT/EN. Nunca inserir aulas neste GitHub público.
