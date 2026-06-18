# Discovery API — Cloudflare Worker

Backend para el bot de entrevistas de discovery de ozom.ai.
Usa Claude Sonnet 4.6 para entrevistar operadores del club y envía
el resumen por email cuando termina.

## Setup

```bash
cd workers/discovery-api
npm install

# Login a Cloudflare
npx wrangler login

# Crear el KV namespace y copiar el ID en wrangler.toml
npx wrangler kv:namespace create SESSIONS

# Configurar secrets
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put NOTIFICATION_EMAIL
```

## Deploy

```bash
npx wrangler deploy
```

El worker queda en: `https://discovery-api.diegoarrieta.workers.dev`

## Dev local

```bash
npx wrangler dev
```

Corre en `http://localhost:8787`. Para probar con la página local,
sirve el sitio con un server local y apunta `API_URL` a localhost.

## Agregar un nuevo brief

1. Agrega la entrada en `briefs.js`
2. Crea la página HTML en el sitio (copia `discovery-ventas-cc.html` y cambia `BRIEF_ID`)
3. `npx wrangler deploy`

## Email

Usa [Resend](https://resend.com) para enviar emails. Free tier: 100 emails/día.
Configura el dominio `ozom.ai` en Resend para enviar desde `discovery@ozom.ai`,
o cambia el `from` en `worker.js`.
