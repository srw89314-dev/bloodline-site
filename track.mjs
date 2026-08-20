// POST /.netlify/functions/track { playerId, event, data }
// Records a lightweight play event and rolls it into both the per-player
// record and a single global aggregate-stats blob that the admin dashboard
// reads. Events: 'session_start' | 'life_started' | 'life_ended'.
//
// Known limitation: this does read-modify-write on shared blobs rather than
// atomic counters, so truly simultaneous requests could rarely clobber each
// other's increment. Fine at this game's scale (a solo/indie site); would be
// worth revisiting with a proper counter primitive if traffic gets heavy.
import { getStore } from '@netlify/blobs';

const STATS_KEY = 'global';

function emptyStats(now) {
  return {
    totalPlayers: 0,
    repeatPlayers: 0,
    totalSessions: 0,
    totalLivesStarted: 0,
    totalDeaths: 0,
    achievementCounts: {},
    eraStarts: {},
    updatedAt: now,
  };
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  let body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const { playerId, event, data } = body || {};
  if (!playerId || !event) {
    return new Response(JSON.stringify({ error: 'playerId and event required' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const players = getStore('players');
  const statsStore = getStore('stats');
  const now = new Date().toISOString();

  let player = await players.get(playerId, { type: 'json' });
  if (!player) {
    player = { id: playerId, authType: 'anon', createdAt: now, sessionCount: 0, livesPlayed: 0, deaths: 0, achievementsUnlocked: [], bestBloodlineScore: 0 };
  }
  let stats = await statsStore.get(STATS_KEY, { type: 'json' });
  if (!stats) stats = emptyStats(now);

  if (event === 'session_start') {
    const wasBrandNew = (player.sessionCount || 0) === 0;
    player.sessionCount = (player.sessionCount || 0) + 1;
    player.lastSeenAt = now;
    stats.totalSessions += 1;
    if (wasBrandNew) stats.totalPlayers += 1;
    else if (player.sessionCount === 2) stats.repeatPlayers += 1; // count once, the moment they cross into "returning"
  } else if (event === 'life_started') {
    player.livesPlayed = (player.livesPlayed || 0) + 1;
    stats.totalLivesStarted += 1;
    const era = data && data.era;
    if (era) stats.eraStarts[era] = (stats.eraStarts[era] || 0) + 1;
  } else if (event === 'life_ended') {
    player.deaths = (player.deaths || 0) + 1;
    stats.totalDeaths += 1;
    const score = (data && data.bloodlineScore) || 0;
    if (score > (player.bestBloodlineScore || 0)) player.bestBloodlineScore = score;
    const newlyUnlocked = (data && data.achievementsUnlocked) || [];
    const prevSet = new Set(player.achievementsUnlocked || []);
    newlyUnlocked.forEach((id) => {
      if (!prevSet.has(id)) {
        prevSet.add(id);
        stats.achievementCounts[id] = (stats.achievementCounts[id] || 0) + 1;
      }
    });
    player.achievementsUnlocked = Array.from(prevSet);
  } else {
    return new Response(JSON.stringify({ error: 'unknown event' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  stats.updatedAt = now;
  await players.setJSON(playerId, player);
  await statsStore.setJSON(STATS_KEY, stats);
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
};
