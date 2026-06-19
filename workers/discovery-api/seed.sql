-- Seed: Brief de Registro de Visitas y Acompañantes
-- Correr en Supabase SQL Editor

INSERT INTO briefs (slug, title, area, context, system_prompt, config) VALUES (
  'registro-visitas',
  'Registro de Visitas y Acompañantes de Menores',
  'Accesos y Recepción',
  'Estamos diseñando mejoras al sistema MyFrac para digitalizar dos flujos: (1) el registro de invitados con cupones, y (2) el registro de acompañantes de menores. Hoy ambos dependen parcialmente de Google Sheets y bitácoras en papel.

Ya tuvimos conversaciones previas donde entendimos los procesos actuales. Ahora necesitamos resolver preguntas específicas que quedaron abiertas para completar el diseño de la solución. Las respuestas van directo al Product Brief que recibe el equipo de desarrollo (Kiritek).

IMPORTANTE: Estas son preguntas operativas específicas, no una entrevista exploratoria. Ya tenemos el panorama general — ahora necesitamos datos puntuales. Sé directo y concreto.',
  NULL,
  '{"voice_enabled": true, "model": "claude-sonnet-4-6"}'::jsonb
);

-- Insertar preguntas
INSERT INTO questions (brief_id, text, sort_order) VALUES
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), '¿Cuántos invitados se registran por semana aproximadamente? ¿Y cuántos acompañantes de menores están activos hoy en el Sheets?', 0),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), '¿Qué roles existen hoy en MyFrac? ¿Qué debería poder hacer cada uno — alta, edición, consulta, reportes? ¿Tienes un rol especial de auditoría?', 1),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), 'Los cupones de menor dicen 3-10 años, pero en el Sheets de acompañantes hay menores de 16-17 años. ¿Hasta qué edad aplica el proceso de acompañante de menor?', 2),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), '¿Cómo se da de baja a un acompañante hoy? ¿El socio avisa formalmente? ¿Y si quiere cambiar de acompañante — ya no viene una persona y ahora viene otra?', 3),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), '¿Hay un formato estándar del CxC (cuenta por cobrar) que se pueda digitalizar? ¿Cómo funciona ese proceso hoy?', 4),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), 'En el Sheets hay socios que compran paquetes de 20 ingresos. ¿Cómo funciona? ¿Pago directo en caja? ¿Bloque de brazaletes? ¿El saldo se lleva en el Sheets?', 5),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), '¿Cuántos operadores de accesos no tienen cuenta en MyFrac? ¿Quiénes son? ¿Por qué no se les ha dado — licencias, no se ha pedido, o Kiritek no las ha activado?', 6),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), 'Cuando un hijo de socio cumple 26 años y pierde la membresía, ¿cómo funciona para que entre como invitado? ¿Hace trámite especial o simplemente llega con cupón?', 7),
  ((SELECT id FROM briefs WHERE slug = 'registro-visitas'), 'En las observaciones del Sheets hay discrepancias entre número de acción en Tablet y en Clubes/Cibermundo. ¿Es frecuente? ¿Por qué pasa?', 8);
