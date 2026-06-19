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
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

// ===== SUPABASE HELPERS =====

function sb(env) {
  const base = `${env.SUPABASE_URL}/rest/v1`;
  const headers = {
    apikey: env.SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  return {
    async query(table, params = "") {
      const res = await fetch(`${base}/${table}?${params}`, { headers });
      if (!res.ok) throw new Error(`Supabase GET ${table}: ${res.status}`);
      return res.json();
    },
    async insert(table, data) {
      const res = await fetch(`${base}/${table}`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Supabase INSERT ${table}: ${res.status} ${err}`);
      }
      return res.json();
    },
    async update(table, data, filter) {
      const res = await fetch(`${base}/${table}?${filter}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Supabase UPDATE ${table}: ${res.status}`);
      return res.json();
    },
  };
}

// ===== BRIEF + SESSION LOADING =====

async function loadBrief(env, slug) {
  const briefs = await sb(env).query("briefs", `slug=eq.${slug}&is_active=eq.true`);
  if (!briefs.length) return null;
  const brief = briefs[0];
  const questions = await sb(env).query("questions", `brief_id=eq.${brief.id}&order=sort_order`);
  return { ...brief, questions };
}

async function getOrCreateOperator(env, email, name, role, area) {
  const existing = await sb(env).query("operators", `email=eq.${encodeURIComponent(email)}`);
  if (existing.length) {
    if (name && name !== existing[0].name) {
      await sb(env).update("operators", { name, role, area }, `id=eq.${existing[0].id}`);
    }
    return existing[0];
  }
  const created = await sb(env).insert("operators", { email, name, role, area });
  return created[0];
}

async function getOrCreateConversation(env, briefId, operatorId, sessionKey) {
  const existing = await sb(env).query("conversations", `session_key=eq.${sessionKey}`);
  if (existing.length) return existing[0];
  const created = await sb(env).insert("conversations", {
    brief_id: briefId,
    operator_id: operatorId,
    session_key: sessionKey,
    status: "active",
    messages: [],
  });
  return created[0];
}

// ===== SYSTEM PROMPT =====

function buildSystemPrompt(brief, operator) {
  const questionList = brief.questions
    .map((q, i) => `${i + 1}. ${q.text}`)
    .join("\n");

  const customPrompt = brief.system_prompt || "";

  return `Eres un asistente de entrevistas de discovery para ozom.ai. Tu trabajo es entrevistar a ${operator.name} (${operator.role || "operador"}) del Club de Golf Tres Marías.

## Contexto
${brief.context}

## Tu personalidad
- Eres cálido, amigable y profesional
- Hablas en español mexicano informal pero respetuoso (tuteo)
- Eres curioso y genuinamente interesado en las respuestas
- Haces preguntas de seguimiento cuando la respuesta es vaga o interesante
- Nunca juzgas las respuestas — todo es valioso
- Eres conciso — no des párrafos largos, mantén la conversación ágil
${customPrompt ? `\n## Instrucciones adicionales\n${customPrompt}` : ""}

## Preguntas que debes cubrir
${questionList}

## Instrucciones
1. Saluda brevemente a ${operator.name}. Preséntate como el asistente de Diego Arrieta de ozom.ai. Explica que esta es una entrevista corta (10-15 min) para entender mejor su trabajo y diseñar herramientas que le ayuden.
2. Haz las preguntas UNA POR UNA. No hagas varias a la vez.
3. Si una respuesta es interesante o vaga, haz UNA pregunta de seguimiento antes de pasar a la siguiente.
4. No repitas preguntas que ya se respondieron en esta conversación o en conversaciones anteriores.
5. Cuando hayas cubierto todas las preguntas, agradece sinceramente y despídete.
6. Inmediatamente después de despedirte, genera un resumen estructurado (esto no se muestra al usuario):

<discovery_summary>
{
  "respuestas": [
    {"pregunta": "texto de la pregunta", "respuesta": "resumen de lo que dijo", "notas": "tus observaciones"}
  ],
  "hallazgos_clave": ["...", "..."],
  "siguiente_paso_sugerido": "..."
}
</discovery_summary>

En "notas" incluye observaciones sobre la respuesta (emociones, énfasis, contradicciones, oportunidades).`;
}

// ===== EMAIL =====

async function sendEmail(env, brief, operator, summary, transcript) {
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
    .map((m) => `<p><strong>${m.role === "user" ? operator.name : "Agente"}:</strong> ${m.content}</p>`)
    .join("\n");

  const html = `
    <h1>Discovery: ${brief.title}</h1>
    <p><strong>Operador:</strong> ${operator.name} (${operator.role || "N/A"}) — ${operator.email}</p>
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
      subject: `[Discovery] ${brief.title} — ${operator.name} — ${now}`,
      html,
    }),
  });
}

// ===== SAVE ANSWERS =====

async function saveAnswers(env, conversationId, brief, summaryJson) {
  try {
    const parsed = JSON.parse(summaryJson);
    if (!parsed.respuestas) return;

    for (const resp of parsed.respuestas) {
      const matchedQ = brief.questions.find(
        (q) => q.text.toLowerCase().includes(resp.pregunta.toLowerCase().slice(0, 30))
      );
      await sb(env).insert("answers", {
        conversation_id: conversationId,
        question_id: matchedQ?.id || null,
        answer_text: resp.respuesta,
        agent_notes: resp.notas || null,
      });
    }

    await sb(env).update("conversations", { status: "completed" }, `id=eq.${conversationId}`);
  } catch (e) {
    console.error("Save answers error:", e);
  }
}

// ===== CHAT HANDLER =====

async function handleChat(request, env) {
  const { session_key, message, brief_slug, operator_email, operator_name, operator_role, operator_area } = await request.json();

  if (!session_key || !brief_slug || !operator_email) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const brief = await loadBrief(env, brief_slug);
  if (!brief) {
    return new Response(JSON.stringify({ error: "Brief not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const operator = await getOrCreateOperator(env, operator_email, operator_name, operator_role, operator_area);
  const conversation = await getOrCreateConversation(env, brief.id, operator.id, session_key);
  const messages = conversation.messages || [];

  if (message && message !== "__init__") {
    messages.push({ role: "user", content: message });
  }

  const systemPrompt = buildSystemPrompt(brief, operator);
  const claudeMessages =
    messages.length === 0
      ? [{ role: "user", content: "Hola, estoy listo para la entrevista." }]
      : messages;

  const model = brief.config?.model || "claude-sonnet-4-6";

  const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
      stream: true,
    }),
  });

  if (!claudeResponse.ok) {
    const errText = await claudeResponse.text();
    console.error("Claude API error:", claudeResponse.status, errText);
    return new Response(JSON.stringify({ error: "AI service error" }), {
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
            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              const text = event.delta.text;
              fullResponse += text;
              const visibleText = text.replace(/<discovery_summary>[\s\S]*?<\/discovery_summary>/g, "");
              if (visibleText) {
                await writer.write(encoder.encode(`data: ${JSON.stringify({ text: visibleText })}\n\n`));
              }
            }
          } catch { /* skip */ }
        }
      }

      let visibleResponse = fullResponse;
      const summaryMatch = fullResponse.match(/<discovery_summary>([\s\S]*?)<\/discovery_summary>/);

      if (summaryMatch) {
        visibleResponse = fullResponse.replace(/<discovery_summary>[\s\S]*?<\/discovery_summary>/, "").trim();

        const transcript = messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        }));
        if (visibleResponse) transcript.push({ role: "assistant", content: visibleResponse });

        await Promise.all([
          saveAnswers(env, conversation.id, brief, summaryMatch[1].trim()),
          sendEmail(env, brief, operator, summaryMatch[1].trim(), transcript),
        ]);
      }

      messages.push({ role: "assistant", content: visibleResponse || fullResponse });
      await sb(env).update("conversations", { messages }, `id=eq.${conversation.id}`);

      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("Stream error:", e);
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

// ===== OTP AUTH =====

async function handleSendOtp(request, env) {
  const { email } = await request.json();
  if (!email || !email.includes("@")) {
    return Response.json({ error: "Email inválido" }, { status: 400 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires_at = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await sb(env).insert("otp_codes", { email: email.toLowerCase(), code, expires_at });

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Discovery Bot <onboarding@resend.dev>",
      to: [email],
      subject: `Tu código de acceso: ${code}`,
      html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
        <p style="color:#6B6560;font-size:12px;letter-spacing:2px">OZOM.AI · DISCOVERY</p>
        <h2 style="color:#1A1714;margin:8px 0">Tu código de acceso</h2>
        <p style="color:#6B6560">Ingresa este código en la página:</p>
        <div style="font-size:36px;letter-spacing:10px;text-align:center;padding:20px;background:#F5F0E8;border-radius:12px;font-weight:bold;color:#1A1714;margin:16px 0">${code}</div>
        <p style="color:#9B9590;font-size:13px">Expira en 10 minutos. Si no solicitaste este código, ignora este email.</p>
      </div>`,
    }),
  });

  if (!emailRes.ok) {
    const err = await emailRes.text();
    console.error("OTP email error:", err);
    return Response.json({ error: "No se pudo enviar el código" }, { status: 500 });
  }

  return Response.json({ sent: true });
}

async function handleVerifyOtp(request, env) {
  const { email, code } = await request.json();
  if (!email || !code) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }

  const results = await sb(env).query(
    "otp_codes",
    `email=eq.${encodeURIComponent(email.toLowerCase())}&code=eq.${code}&used=eq.false&expires_at=gt.${new Date().toISOString()}&order=created_at.desc&limit=1`
  );

  if (!results.length) {
    return Response.json({ error: "Código incorrecto o expirado" }, { status: 401 });
  }

  await sb(env).update("otp_codes", { used: true }, `id=eq.${results[0].id}`);

  const operators = await sb(env).query("operators", `email=eq.${encodeURIComponent(email.toLowerCase())}`);
  const operator = operators.length ? operators[0] : null;

  return Response.json({
    verified: true,
    operator: operator ? { name: operator.name, role: operator.role, area: operator.area } : null,
  });
}

// ===== ADMIN API =====

function isAdmin(request, env) {
  const auth = request.headers.get("Authorization");
  return auth === `Bearer ${env.SUPABASE_SERVICE_KEY}`;
}

async function handleAdminAPI(request, env, path) {
  if (!isAdmin(request, env)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // GET /api/briefs
  if (path === "/api/briefs" && request.method === "GET") {
    const briefs = await sb(env).query("briefs", "order=created_at.desc");
    return Response.json(briefs);
  }

  // POST /api/briefs — create brief + questions
  if (path === "/api/briefs" && request.method === "POST") {
    const { slug, title, area, context, system_prompt, config, questions } = await request.json();
    const [brief] = await sb(env).insert("briefs", { slug, title, area, context, system_prompt, config });
    if (questions?.length) {
      const qs = questions.map((text, i) => ({ brief_id: brief.id, text, sort_order: i }));
      await sb(env).insert("questions", qs);
    }
    const full = await loadBrief(env, slug);
    return Response.json(full, { status: 201 });
  }

  // GET /api/briefs/:slug
  const briefMatch = path.match(/^\/api\/briefs\/([^/]+)$/);
  if (briefMatch && request.method === "GET") {
    const brief = await loadBrief(env, briefMatch[1]);
    if (!brief) return Response.json({ error: "Not found" }, { status: 404 });
    const conversations = await sb(env).query("conversations", `brief_id=eq.${brief.id}&order=created_at.desc`);
    return Response.json({ ...brief, conversations });
  }

  // PUT /api/briefs/:slug — update brief
  if (briefMatch && request.method === "PUT") {
    const data = await request.json();
    const briefs = await sb(env).query("briefs", `slug=eq.${briefMatch[1]}`);
    if (!briefs.length) return Response.json({ error: "Not found" }, { status: 404 });
    await sb(env).update("briefs", data, `id=eq.${briefs[0].id}`);
    return Response.json({ ok: true });
  }

  // GET /api/conversations/:id
  const convMatch = path.match(/^\/api\/conversations\/([^/]+)$/);
  if (convMatch && request.method === "GET") {
    const convs = await sb(env).query("conversations", `id=eq.${convMatch[1]}`);
    if (!convs.length) return Response.json({ error: "Not found" }, { status: 404 });
    const answers = await sb(env).query("answers", `conversation_id=eq.${convMatch[1]}`);
    const operator = await sb(env).query("operators", `id=eq.${convs[0].operator_id}`);
    return Response.json({ ...convs[0], answers, operator: operator[0] || null });
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

// ===== TTS HANDLER =====

async function handleTTS(request, env) {
  const { text } = await request.json();
  if (!text || !env.ELEVENLABS_API_KEY) {
    return Response.json({ error: "TTS not available" }, { status: 400 });
  }
  const ttsResponse = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
    {
      method: "POST",
      headers: {
        "xi-api-key": env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );
  if (!ttsResponse.ok) {
    const err = await ttsResponse.text();
    return Response.json({ error: "TTS error", detail: err }, { status: 502 });
  }
  return new Response(ttsResponse.body, { headers: { "Content-Type": "audio/mpeg" } });
}

// ===== BRIEF INFO (public) =====

async function handleBriefInfo(env, slug) {
  const brief = await loadBrief(env, slug);
  if (!brief) return Response.json({ error: "Brief not found" }, { status: 404 });
  return Response.json({
    title: brief.title,
    area: brief.area,
    config: brief.config,
  });
}

// ===== ROUTER =====

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    let response;

    if (url.pathname === "/health") {
      response = Response.json({ status: "ok" });
    } else if (url.pathname === "/auth/send-otp" && request.method === "POST") {
      response = await handleSendOtp(request, env);
    } else if (url.pathname === "/auth/verify-otp" && request.method === "POST") {
      response = await handleVerifyOtp(request, env);
    } else if (url.pathname === "/chat" && request.method === "POST") {
      response = await handleChat(request, env);
    } else if (url.pathname === "/tts" && request.method === "POST") {
      response = await handleTTS(request, env);
    } else if (url.pathname.match(/^\/brief\/([^/]+)$/) && request.method === "GET") {
      const slug = url.pathname.split("/")[2];
      response = await handleBriefInfo(env, slug);
    } else if (url.pathname.startsWith("/api/")) {
      response = await handleAdminAPI(request, env, url.pathname);
    } else {
      response = Response.json({ error: "Not found" }, { status: 404 });
    }

    for (const [key, val] of Object.entries(cors)) {
      response.headers.set(key, val);
    }
    return response;
  },
};
