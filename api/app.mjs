// Yuyi API: serves the AI assistant on the CV site. Loads 5 prompt sections from api/prompts/ in numeric order, combines them into a system prompt, and proxies user messages to the LLM API. The API key lives only in .env (gitignored) so the browser never sees it.
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 3001;
const API_KEY = process.env.LLM_API_KEY;
const BASE_URL = process.env.LLM_BASE_URL || 'https://openrouter.ai/api/v1';
const MODEL = process.env.LLM_MODEL || 'google/gemma-4-26b-a4b-it';
const SITE_URL = process.env.SITE_URL || 'http://localhost:4321';

const promptsDir = join(__dirname, 'prompts');
const persona = readFileSync(join(promptsDir, '01-persona.md'), 'utf-8');
const mission = readFileSync(join(promptsDir, '02-mission.md'), 'utf-8');
const examples = readFileSync(join(promptsDir, '03-examples.md'), 'utf-8');
const knowledge = readFileSync(join(promptsDir, '04-knowledge.md'), 'utf-8');
const context = readFileSync(join(promptsDir, '05-context.md'), 'utf-8');
// Resolve relative markdown link paths (/foo.png) against SITE_URL so the AI can use short paths in context files without hardcoding the domain.
const systemPrompt = `${persona}\n\n---\n\n${mission}\n\n---\n\n${examples}\n\n---\n\n${knowledge}\n\n---\n\n${context}`.replace(
  /\]\((\/[^)]+)\)/g,
  `](${SITE_URL}$1)`,
);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function send(res, status, body, extraHeaders = {}) {
  res.statusCode = status;
  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));
  Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return send(res, 204, '');
  }

  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, JSON.stringify({ ok: true, model: MODEL }), {
      'Content-Type': 'application/json',
    });
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!API_KEY) {
      return send(res, 500, JSON.stringify({ error: 'LLM_API_KEY not configured' }), {
        'Content-Type': 'application/json',
      });
    }

    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return send(res, 400, JSON.stringify({ error: 'Invalid JSON' }), {
        'Content-Type': 'application/json',
      });
    }

    const { messages } = payload;
    if (!Array.isArray(messages) || messages.length === 0) {
      return send(res, 400, JSON.stringify({ error: 'messages must be a non-empty array' }), {
        'Content-Type': 'application/json',
      });
    }

    const sanitized = messages
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
      .map((m) => {
        if (typeof m.content === 'string') {
          return { role: m.role, content: m.content.slice(0, 2000) };
        }
        if (Array.isArray(m.content)) {
          const parts = m.content
            .map((p) => {
              if (p && p.type === 'text') {
                return { type: 'text', text: String(p.text ?? '').slice(0, 2000) };
              }
              if (p && p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string') {
                return { type: 'image_url', image_url: { url: p.image_url.url } };
              }
              return null;
            })
            .filter((p) => p !== null);
          return { role: m.role, content: parts };
        }
        return null;
      })
      .filter((m) => m !== null)
      .slice(-20);

    try {
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'system', content: systemPrompt }, ...sanitized],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('LLM error', response.status, errText);
        return send(res, response.status, JSON.stringify({ error: `LLM API error: ${response.status}` }), {
          'Content-Type': 'application/json',
        });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content ?? 'Sin respuesta del modelo.';

      return send(res, 200, JSON.stringify({ message: reply }), {
        'Content-Type': 'application/json',
      });
    } catch (err) {
      console.error('Chat error:', err);
      return send(res, 500, JSON.stringify({ error: 'Internal server error' }), {
        'Content-Type': 'application/json',
      });
    }
  }

  return send(res, 404, 'Not found');
});

server.listen(PORT, () => {
  console.log(`Yuyi server running on http://localhost:${PORT}`);
  if (!API_KEY) {
    console.warn('  ⚠ LLM_API_KEY not set. Add it to .env and restart.');
  }
});
