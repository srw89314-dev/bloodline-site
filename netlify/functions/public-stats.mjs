// GET /.netlify/functions/public-stats
// Public, unauthenticated read of a *safe subset* of the same aggregate data
// stats.mjs serves to the admin dashboard — total players/deaths and
// per-achievement unlock percentages only. No player-identifying data, no
// feedback text. Used by the death screen to show a player-facing teaser
// like "Only 4% of players have earned Millionaire." Degrades to an empty
// response (not an error) if no stats exist yet, so the caller can just
// hide the teaser rather than handle a special case.
import { getStore } from '@netlify/blobs';

// Keep in sync with the ACHIEVEMENTS list in public/index.html and the copy
// in stats.mjs.
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

export default async () => {
  const statsStore = getStore('stats');
  const stats = (await statsStore.get('global', { type: 'json' })) || {
    totalPlayers: 0, totalDeaths: 0, achievementCounts: {},
  };

  const achievements = {};
  Object.keys(ACHIEVEMENT_LABELS).forEach((id) => {
    const count = stats.achievementCounts[id] || 0;
    achievements[id] = {
      label: ACHIEVEMENT_LABELS[id],
      pct: stats.totalDeaths > 0 ? Math.round((count / stats.totalDeaths) * 1000) / 10 : 0,
    };
  });

  return new Response(JSON.stringify({
    totalPlayers: stats.totalPlayers || 0,
    totalDeaths: stats.totalDeaths || 0,
    achievements,
  }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
};
