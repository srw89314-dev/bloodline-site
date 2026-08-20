// POST /.netlify/functions/feedback { playerId, type: 'bug'|'suggestion', text, context }
// Stores a player-submitted bug report or suggestion, plus a recency-ordered
// index so the admin dashboard can list recent items without scanning the
// whole store.
import { getStore } from '@netlify/blobs';

const MAX_TEXT_LEN = 2000;
const MAX_INDEX_LEN = 500; // older entries stay in the store but drop off this quick-list

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { playerId, type, text, context } = body || {};
  if (!playerId || !type || !text) {
    return new Response(JSON.stringify({ error: 'playerId, type, and text required' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  if (type !== 'bug' && type !== 'suggestion') {
    return new Response(JSON.stringify({ error: 'type must be "bug" or "suggestion"' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const trimmed = String(text).slice(0, MAX_TEXT_LEN).trim();
  if (!trimmed) {
    return new Response(JSON.stringify({ error: 'text is empty' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const feedback = getStore('feedback');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const entry = { id, playerId, type, text: trimmed, context: context || {}, createdAt: now };
  await feedback.setJSON(id, entry);

  const idx = getStore('feedback-index');
  let list = await idx.get('ids', { type: 'json' });
  if (!Array.isArray(list)) list = [];
  list.unshift(id);
  if (list.length > MAX_INDEX_LEN) list = list.slice(0, MAX_INDEX_LEN);
  await idx.setJSON('ids', list);

  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
