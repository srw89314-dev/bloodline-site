// GET /.netlify/functions/stats?key=ADMIN_KEY
// Admin-only aggregate read for the dashboard (public/admin.html). Gated by
// a shared-secret query param checked against the ADMIN_KEY environment
// variable set in the Netlify site's dashboard (Site configuration ->
// Environment variables) -- not a real login system, but enough to keep
// this off of Google and out of casual reach for a solo-dev admin view.
import { getStore } from '@netlify/blobs';

// Keep in sync with the ACHIEVEMENTS list in public/index.html.
const ACHIEVEMENT_LABELS = {
  centenarian: 'Live to 100',
  millionaire: 'Die a Millionaire',
  legendary_life: 'Legendary Life',
  black_belt: 'Black Belt',
  prodigy: 'Prodigy',
  elite_athlete: 'Elite Athlete',
  master_artist: 'Master Artist',
  well_rounded: 'Well-Rounded',
  nest_egg: 'Nest Egg',
  fully_connected: 'Fully Connected',
  retired_in_style: 'Retired in Style',
  big_winner: 'Big Winner',
  dynasty: 'Dynasty',
  century_bloodline: 'Century Bloodline',
};

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  const statsStore = getStore('stats');
  const stats = (await statsStore.get('global', { type: 'json' })) || {
    totalPlayers: 0, repeatPlayers: 0, totalSessions: 0, totalLivesStarted: 0, totalDeaths: 0, achievementCounts: {}, eraStarts: {},
  };

  const achievements = {};
  Object.keys(ACHIEVEMENT_LABELS).forEach((id) => {
    const count = stats.achievementCounts[id] || 0;
    achievements[id] = {
      label: ACHIEVEMENT_LABELS[id],
      count,
      pct: stats.totalDeaths > 0 ? Math.round((count / stats.totalDeaths) * 1000) / 10 : 0,
    };
  });

  const idx = getStore('feedback-index');
  const ids = (await idx.get('ids', { type: 'json' })) || [];
  const feedbackStore = getStore('feedback');
  const recent = (await Promise.all(ids.slice(0, 50).map((id) => feedbackStore.get(id, { type: 'json' })))).filter(Boolean);

  return new Response(JSON.stringify({
    totalPlayers: stats.totalPlayers,
    repeatPlayers: stats.repeatPlayers,
    repeatPct: stats.totalPlayers > 0 ? Math.round((stats.repeatPlayers / stats.totalPlayers) * 1000) / 10 : 0,
    totalSessions: stats.totalSessions,
    totalLivesStarted: stats.totalLivesStarted,
    totalDeaths: stats.totalDeaths,
    eraStarts: stats.eraStarts,
    achievements,
    feedbackCount: ids.length,
    recentFeedback: recent,
    updatedAt: stats.updatedAt || null,
  }), { headers: { 'content-type': 'application/json' } });
};
