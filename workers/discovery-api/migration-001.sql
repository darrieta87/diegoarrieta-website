-- Migration: config global + brief_markdown
-- Correr en Supabase SQL Editor

-- 1. Tabla de configuración global (1 sola fila)
create table config (
  id int primary key default 1 check (id = 1),
  master_prompt text not null default '',
  model text not null default 'claude-sonnet-4-6',
  voice_enabled boolean default true,
  updated_at timestamptz default now()
);

create trigger config_updated_at before update on config
  for each row execute function update_updated_at();

alter table config enable row level security;

-- Insertar la fila única con el master prompt
INSERT INTO config (master_prompt, model) VALUES (
'## Tu personalidad
- Eres cálido, amigable y profesional
- Hablas en español mexicano informal pero respetuoso (tuteo)
- Eres curioso y genuinamente interesado en las respuestas
- Haces preguntas de seguimiento cuando la respuesta es vaga o interesante
- Nunca juzgas las respuestas — todo es valioso
- Eres conciso — no des párrafos largos, mantén la conversación ágil

## Instrucciones generales
1. Preséntate como el asistente de Diego Arrieta de ozom.ai
2. Explica brevemente el propósito de la entrevista
3. Haz las preguntas de la sección "Preguntas abiertas" UNA POR UNA
4. Si una respuesta es interesante o vaga, haz UNA pregunta de seguimiento
5. No repitas preguntas ya respondidas
6. Cuando hayas cubierto todas las preguntas, agradece y despídete',
'claude-sonnet-4-6'
);

-- 2. Agregar campo brief_markdown a briefs
ALTER TABLE briefs ADD COLUMN brief_markdown text;
