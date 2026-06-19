-- Discovery Agent v2 — Supabase schema
-- Correr en Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- 1. Briefs (los product briefs)
create table briefs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  area text,
  context text not null,
  system_prompt text,
  config jsonb default '{"voice_enabled": true, "model": "claude-sonnet-4-6"}'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Preguntas de cada brief
create table questions (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references briefs(id) on delete cascade,
  text text not null,
  target_role text,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- 3. Operadores (se auto-registran al entrar)
create table operators (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text unique not null,
  name text,
  role text,
  area text,
  created_at timestamptz default now()
);

-- 4. Conversaciones
create table conversations (
  id uuid primary key default gen_random_uuid(),
  brief_id uuid references briefs(id) on delete cascade,
  operator_id uuid references operators(id),
  session_key text unique not null,
  status text default 'active' check (status in ('active', 'completed')),
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Respuestas extraídas
create table answers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  question_id uuid references questions(id),
  answer_text text not null,
  agent_notes text,
  answered_at timestamptz default now()
);

-- Índices
create index idx_questions_brief on questions(brief_id);
create index idx_conversations_brief on conversations(brief_id);
create index idx_conversations_operator on conversations(operator_id);
create index idx_conversations_session on conversations(session_key);
create index idx_answers_conversation on answers(conversation_id);
create index idx_answers_question on answers(question_id);
create index idx_operators_email on operators(email);

-- Trigger para updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger briefs_updated_at before update on briefs
  for each row execute function update_updated_at();
create trigger conversations_updated_at before update on conversations
  for each row execute function update_updated_at();

-- Habilitar RLS
alter table briefs enable row level security;
alter table questions enable row level security;
alter table operators enable row level security;
alter table conversations enable row level security;
alter table answers enable row level security;

-- Políticas: el service_role key (usado por el worker) bypasea RLS.
-- Para el frontend (anon key), solo lectura de briefs activos y questions.
create policy "Briefs activos son públicos" on briefs
  for select using (is_active = true);

create policy "Questions son públicas" on questions
  for select using (true);

-- Los operadores autenticados pueden ver/crear su propio registro
create policy "Operador ve su registro" on operators
  for select using (auth.uid() = auth_user_id);

create policy "Operador crea su registro" on operators
  for insert with check (auth.uid() = auth_user_id);

-- Conversaciones: operador ve las suyas
create policy "Operador ve sus conversaciones" on conversations
  for select using (
    operator_id in (select id from operators where auth_user_id = auth.uid())
  );
