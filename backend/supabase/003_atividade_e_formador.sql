-- Academia Linux · ETAPA 3 · atividade pedagógica e supervisão do formador
-- Executar APÓS 001_modelo_misto.sql e 002_identidade_primeiro_login_mfa.sql.
-- Sem IP, geolocalização, passwords, tokens, conteúdos de exercícios ou UA.
-- NÃO usar estes eventos cliente como evidência forense de segurança.

begin;

create table if not exists public.student_activity (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('unit_opened','unit_completed','lab_completed')),
  activity_id text not null check (activity_id ~ '^(UC|L)[0-9]{2}$'),
  occurred_at timestamptz not null default now()
);

create index if not exists student_activity_user_date_idx
on public.student_activity(user_id, occurred_at desc);

alter table public.student_activity enable row level security;
revoke all on public.student_activity from anon, authenticated;
grant select, insert on public.student_activity to authenticated;

drop policy if exists activity_insert_own on public.student_activity;
create policy activity_insert_own on public.student_activity
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists activity_read_own on public.student_activity;
create policy activity_read_own on public.student_activity
  for select to authenticated
  using (user_id = (select auth.uid()));

-- O formador recebe apenas agregados de formação, não dados de autenticação.
-- O papel "admin" TEM de ser atribuído por administrador no app_metadata
-- (NUNCA em user_metadata ou por alteração no navegador).
create or replace function public.academy_instructor_summary()
returns table (
  student_id uuid,
  display_name text,
  completed_units bigint,
  completed_labs bigint,
  last_completion timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt()->'app_metadata'->>'academy_role'),'') <> 'admin'
     or coalesce((select auth.jwt()->>'aal'),'') <> 'aal2' then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select ss.user_id,
         coalesce(nullif(sp.display_name,''), 'Aluno ' || left(ss.user_id::text,8)),
         count(*) filter(where p.activity_type='unit')::bigint as completed_units,
         count(*) filter(where p.activity_type='lab')::bigint as completed_labs,
         max(p.completed_at) as last_completion
    from public.student_security ss
    left join public.student_profiles sp on sp.user_id=ss.user_id
    left join public.student_progress p on p.user_id=ss.user_id
   group by ss.user_id,sp.display_name
   order by max(p.completed_at) desc nulls last, ss.user_id
   limit 500;
end;
$$;

revoke all on function public.academy_instructor_summary() from public,anon,authenticated;
grant execute on function public.academy_instructor_summary() to authenticated;

-- Relatório resumido do historial pedagógico; acesso admin + AAL2.
create or replace function public.academy_instructor_activity()
returns table (
  student_id uuid,
  event_type text,
  activity_id text,
  occurred_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if (select auth.uid()) is null
     or coalesce((select auth.jwt()->'app_metadata'->>'academy_role'),'') <> 'admin'
     or coalesce((select auth.jwt()->>'aal'),'') <> 'aal2' then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  return query
  select a.user_id,a.event_type,a.activity_id,a.occurred_at
    from public.student_activity a
   order by a.occurred_at desc
   limit 100;
end;
$$;

revoke all on function public.academy_instructor_activity() from public,anon,authenticated;
grant execute on function public.academy_instructor_activity() to authenticated;

commit;

-- RECOMENDAÇÕES OPERACIONAIS:
-- 1. Dados pedagógicos sujeitos a alteração pelo próprio aluno podem ser
--    manipulados. NÃO são certificados nem provas de exame.
-- 2. Antes de notas oficiais, validar tarefas no servidor, não no JS público.
-- 3. Definir política de conservação e limpeza periódica, com transparência RGPD.
-- 4. Auth Audit Logs: Supabase Dashboard -> Authentication -> Audit Logs
--    (ou Auth Logs, conforme versão). Não criar uma API de logs de segurança
--    acessível aos alunos nem expor auth.audit_log_entries no browser.
-- 5. O administrador só ganha acesso após configuração segura do app_metadata
--    e autenticação por MFA com AAL2.
