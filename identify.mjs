// POST /.netlify/functions/identify
// Establishes (or resumes) a player identity. Two paths:
//   - Guest: client has no stored playerId yet -> mint a new anonymous one.
//     If the client already has one (e.g. re-identifying after clearing some
//     other state), pass it as existingPlayerId and it's reused as-is.
//   - Google: client sends a Google ID token from Google Identity Services.
//     We verify it server-side, then look up (or create) the player record
//     keyed by the Google account's stable subject id, so the same Google
//     account always maps to the same playerId across devices.
import { getStore } from '@netlify/blobs';
import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const oauthClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

function newPlayer(id, authType, now) {
  return {
    id,
    authType,
    createdAt: now,
    lastSeenAt: now,
    sessionCount: 0,
    livesPlayed: 0,
    deaths: 0,
    achievementsUnlocked: [],
    bestBloodlineScore: 0,
  };
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  let body;
  try { body = await req.json(); } catch { body = {}; }

  const players = getStore('players');
  const now = new Date().toISOString();

  if (body.googleIdToken) {
    if (!oauthClient) {
      return new Response(JSON.stringify({ error: 'Google sign-in is not configured on this site yet.' }), {
        status: 500, headers: { 'content-type': 'application/json' },
      });
    }
    let payload;
    try {
      const ticket = await oauthClient.verifyIdToken({ idToken: body.googleIdToken, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      return new Response(JSON.stringify({ error: 'Could not verify Google sign-in.' }), {
        status: 401, headers: { 'content-type': 'application/json' },
      });
    }
    const index = getStore('player-index');
    const indexKey = `google:${payload.sub}`;
    let playerId = await index.get(indexKey, { type: 'text' });
    let player;
    if (playerId) {
      player = (await players.get(playerId, { type: 'json' })) || newPlayer(playerId, 'google', now);
    } else {
      playerId = crypto.randomUUID();
      player = newPlayer(playerId, 'google', now);
      await index.set(indexKey, playerId);
    }
    player.authType = 'google';
    if (payload.email) player.email = payload.email;
    player.lastSeenAt = now;
    await players.setJSON(playerId, player);
    return new Response(JSON.stringify({ playerId, authType: 'google' }), { headers: { 'content-type': 'application/json' } });
  }

  // Guest path.
  let playerId = body.existingPlayerId;
  let player = playerId ? await players.get(playerId, { type: 'json' }) : null;
  if (!player) {
    playerId = playerId || crypto.randomUUID();
    player = newPlayer(playerId, 'anon', now);
  }
  player.lastSeenAt = now;
  await players.setJSON(playerId, player);
  return new Response(JSON.stringify({ playerId, authType: player.authType }), { headers: { 'content-type': 'application/json' } });
};
