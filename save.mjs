// GET  /.netlify/functions/save?playerId=...  -> { state: <saved game JSON> | null }
// POST /.netlify/functions/save { playerId, state } -> { ok: true }
// One save slot per playerId, overwritten each time (mirrors the existing
// manual single-file JSON save — this just automates *when* it happens).
import { getStore } from '@netlify/blobs';

const MAX_SAVE_BYTES = 500_000; // generous headroom over a real save's size

export default async (req) => {
  const saves = getStore('saves');

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const playerId = url.searchParams.get('playerId');
    if (!playerId) {
      return new Response(JSON.stringify({ error: 'playerId required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const data = await saves.get(playerId, { type: 'json' });
    return new Response(JSON.stringify({ state: data || null }), { headers: { 'content-type': 'application/json' } });
  }

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const { playerId, state } = body || {};
    if (!playerId || !state) {
      return new Response(JSON.stringify({ error: 'playerId and state required' }), { status: 400, headers: { 'content-type': 'application/json' } });
    }
    const json = JSON.stringify(state);
    if (json.length > MAX_SAVE_BYTES) {
      return new Response(JSON.stringify({ error: 'save too large' }), { status: 413, headers: { 'content-type': 'application/json' } });
    }
    await saves.set(playerId, json);
    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  }

  return new Response('Method not allowed', { status: 405 });
};
