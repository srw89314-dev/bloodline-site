// POST /.netlify/functions/feedback { playerId, type, text, answers, context }
// Stores a player-submitted bug report, suggestion, or post-life pulse, plus a recency-ordered
// index so the admin dashboard can list recent items without scanning the
// whole store.
import { getStore } from '@netlify/blobs';

const MAX_TEXT_LEN = 2000;
const MAX_INDEX_LEN = 500; // older entries stay in the store but drop off this quick-list
const ALLOWED_TYPES = new Set(['bug', 'suggestion', 'pulse']);
const ALLOWED_ANSWER_KEYS = new Set(['authenticity', 'continueIntent', 'priority']);

function cleanObject(value, allowedKeys, maxValueLength) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out = {};
  Object.entries(value).forEach(([key, item]) => {
    if (allowedKeys && !allowedKeys.has(key)) return;
    if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
      out[key] = String(item).slice(0, maxValueLength);
    }
  });
  return out;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { playerId, type, text, answers, context } = body || {};
  if (!playerId || !type) {
    return new Response(JSON.stringify({ error: 'playerId and type required' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (typeof playerId !== 'string' || playerId.length > 128) {
    return new Response(JSON.stringify({ error: 'invalid playerId' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (!ALLOWED_TYPES.has(type)) {
    return new Response(JSON.stringify({ error: 'unsupported feedback type' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const trimmed = String(text || '').slice(0, MAX_TEXT_LEN).trim();
  const cleanAnswers = cleanObject(answers, ALLOWED_ANSWER_KEYS, 80);
  if (type !== 'pulse' && !trimmed) {
    return new Response(JSON.stringify({ error: 'text is empty' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (type === 'pulse' && Object.keys(cleanAnswers).length === 0 && !trimmed) {
    return new Response(JSON.stringify({ error: 'pulse answer required' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const feedback = getStore('feedback');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const safeContext = cleanObject(context, new Set(['era', 'age', 'bracket', 'generation', 'source', 'challenge']), 80);
  const entry = { id, playerId, type, text: trimmed, answers: cleanAnswers, context: safeContext, createdAt: now };
  await feedback.setJSON(id, entry);

  const idx = getStore('feedback-index');
  let list = await idx.get('ids', { type: 'json' });
  if (!Array.isArray(list)) list = [];
  list.unshift(id);
  if (list.length > MAX_INDEX_LEN) list = list.slice(0, MAX_INDEX_LEN);
  await idx.setJSON('ids', list);

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
