import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const admin = await readFile(new URL('../public/admin.html', import.meta.url), 'utf8');
const track = await readFile(new URL('../netlify/functions/track.mjs', import.meta.url), 'utf8');
const feedback = await readFile(new URL('../netlify/functions/feedback.mjs', import.meta.url), 'utf8');
const identify = await readFile(new URL('../netlify/functions/identify.mjs', import.meta.url), 'utf8');

const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1].trim())
  .filter(Boolean);
assert.ok(inlineScripts.length, 'game must contain an inline script');
inlineScripts.forEach((source) => new Function(source));

assert.match(html, /function isEraEligible\(/, 'shared era eligibility guard must exist');
assert.match(html, /filter\(ev => isEraEligible\(ev, eraIndex\)\)/, 'world events must use the era guard');
assert.match(html, /filter\(inEra\)/, 'stories must pass through the era guard');
assert.match(html, /Sell hand pies at the town social/, 'Wild West lemonade replacement must remain period-appropriate');
assert.match(html, /trackMilestone\('first_life_completed'\)/, 'first completed life must be measured');
assert.match(html, /trackMilestone\('second_generation_started'\)/, 'second generation must be measured');
assert.match(html, /type: isPulse \? 'pulse'/, 'post-life feedback must submit as a pulse');
assert.match(html, /familyReputation/, 'heirs must receive a visible family legacy');
assert.match(track, /'second_generation_started'/, 'backend must accept retention milestones');
assert.match(feedback, /'pulse'/, 'backend must accept structured pulse feedback');
assert.match(feedback, /playerId\.length > 128/, 'feedback IDs must be bounded');
assert.match(track, /playerId\.length > 128/, 'tracking IDs must be bounded');
assert.match(identify, /milestonesSeen: \[\]/, 'new identities must initialize milestone state');
assert.match(admin, /Player progression/, 'admin dashboard must expose the progression funnel');

console.log('Bloodline checks passed: syntax, era guard, legacy handoff, feedback, and retention funnel.');
