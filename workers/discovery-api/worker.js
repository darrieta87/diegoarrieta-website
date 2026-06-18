import { BRIEFS } from "./briefs.js";

const ALLOWED_ORIGINS = [
  "https://diegoarrieta.com",
  "https://www.diegoarrieta.com",
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  return false;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function buildSystemPrompt(brief) {
  const questionList = brief.questions
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  return `Eres un asistente de entrevistas de discovery para ozom.ai. Tu trabajo es entrevistar a ${brief.stakeholder} (${brief.rol}) del Club de Golf Tres Marías.

## Contexto
${brief.context}

## Tu personalidad
- Eres cálido, amigable y profesional
- Hablas en español mexicano informal pero respetuoso (tuteo)
- Eres curioso y genuinamente interesado en las respuestas
- Haces preguntas de seguimiento cuando la respuesta es vaga o interesante
- Nunca juzgas las respuestas — todo es valioso
- Eres conciso — no des párrafos largos, mantén la conversación ágil

## Preguntas que debes cubrir
${questionList}

## Instrucciones
1. Saluda brevemente. Preséntate como el asistente de Diego Arrieta de ozom.ai. Explica que esta es una entrevista corta (10-15 min) para entender mejor su trabajo y diseñar herramientas que le ayuden.
2. Haz las preguntas UNA POR UNA. No hagas varias a la vez.
3. Si una respuesta es interesante o vaga, haz UNA pregunta de seguimiento antes de pasar a la siguiente.
4. No repitas preguntas que ya se respondieron.
5. Cuando hayas cubierto todas las preguntas, agradece sinceramente y despídete.
6. Inmediatamente después de despedirte, genera un resumen estructurado en el siguiente formato exacto (esto no se muestra al usuario):

<discovery_summary>
{
  "brief_id": "${brief.title}",
  "stakeholder": "${brief.stakeholder}",
  "rol": "${brief.rol}",
  "respuestas": [
    {"pregunta": "...", "respuesta": "...", "notas": "..."}
  ],
  "hallazgos_clave": ["...", "..."],
  "siguiente_paso_sugerido": "..."
}
</discovery_summary>

En el campo "notas" incluye observaciones tuyas sobre la respuesta (emociones, énfasis, contradicciones, oportunidades).`;
}

async function getSession(env, sessionId) {
  const data = await env.SESSIONS.get(`session:${sessionId}`, "json");
  return data || { messages: [], briefId: null };
}

async function saveSession(env, sessionId, session) {
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: 2592000,
  });
}

async function sendEmail(env, brief, summary, transcript) {
  const to = env.NOTIFICATION_EMAIL;
  if (!to || !env.RESEND_API_KEY) return;

  const now = new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" });

  let summaryBlock = "";
  try {
    const parsed = JSON.parse(summary);
    const qas = parsed.respuestas
      .map((r) => `<p><strong>${r.pregunta}</strong></p><p>${r.respuesta}</p>${r.notas ? `<p><em>Notas: ${r.notas}</em></p>` : ""}<hr>`)
      .join("\n");
    const hallazgos = (parsed.hallazgos_clave || []).map((h) => `<li>${h}</li>`).join("");
    summaryBlock = `
      <h2>Respuestas</h2>${qas}
      <h2>Hallazgos clave</h2><ul>${hallazgos}</ul>
      <h2>Siguiente paso sugerido</h2><p>${parsed.siguiente_paso_sugerido || "N/A"}</p>`;
  } catch {
    summaryBlock = `<pre>${summary}</pre>`;
  }

  const transcriptHtml = transcript
    .map((m) => `<p><strong>${m.role === "user" ? brief.stakeholder : "Agente"}:</strong> ${m.content}</p>`)
    .join("\n");

  const html = `
    <h1>Discovery: ${brief.title}</h1>
    <p><strong>Stakeholder:</strong> ${brief.stakeholder} (${brief.rol})</p>
    <p><strong>Fecha:</strong> ${now}</p>
    ${summaryBlock}
    <hr>
    <h2>Transcripción completa</h2>
    ${transcriptHtml}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Discovery Bot <onboarding@resend.dev>",
      to: [to],
      subject: `[Discovery] ${brief.title} — ${brief.stakeholder} — ${now}`,
      html,
    }),
  });
}

async function handleChat(request, env) {
  const { session_id, message, brief_id } = await request.json();

  if (!session_id || !brief_id) {
    return new Response(JSON.stringify({ error: "Missing session_id or brief_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const brief = BRIEFS[brief_id];
  if (!brief) {
    return new Response(JSON.stringify({ error: "Brief not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const session = await getSession(env, session_id);
  session.briefId = brief_id;

  if (message && message !== "__init__") {
    session.messages.push({ role: "user", content: message });
  }

  const systemPrompt = buildSystemPrompt(brief);
  const claudeMessages =
    session.messages.length === 0
      ? [{ role: "user", content: "Hola, estoy listo para la entrevista." }]
      : session.messages;

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
      stream: true,
    }),
  });

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text();
    console.error("Claude API error:", claudeResponse.status, errText);
    return new Response(JSON.stringify({ error: "AI service error", status: claudeResponse.status, detail: errText }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  let fullResponse = "";

  const processStream = async () => {
    const reader = claudeResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const event = JSON.parse(data);

            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta"
            ) {
              const text = event.delta.text;
              fullResponse += text;

              const visibleText = text.replace(/<discovery_summary>[\s\S]*?<\/discovery_summary>/g, "");
              if (visibleText) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ text: visibleText })}\n\n`));
              }
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      // Handle discovery_summary that might span chunks
      let visibleResponse = fullResponse;
      const summaryMatch = fullResponse.match(/<discovery_summary>([\s\S]*?)<\/discovery_summary>/);
      if (summaryMatch) {
        visibleResponse = fullResponse.replace(/<discovery_summary>[\s\S]*?<\/discovery_summary>/, "").trim();

        const transcript = session.messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        }));
        if (visibleResponse) {
          transcript.push({ role: "assistant", content: visibleResponse });
        }

        try {
          await sendEmail(env, brief, summaryMatch[1].trim(), transcript);
        } catch (e) {
          console.error("Email send error:", e);
        }
      }

      session.messages.push({ role: "assistant", content: visibleResponse || fullResponse });
      await saveSession(env, session_id, session);

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("Stream processing error:", e);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`));
    } finally {
      await writer.close();
    }
  };

  processStream();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json", ...cors },
      });
    }


    if (url.pathname === "/chat" && request.method === "POST") {
      const response = await handleChat(request, env);
      for (const [key, val] of Object.entries(cors)) {
        response.headers.set(key, val);
      }
      return response;
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};
