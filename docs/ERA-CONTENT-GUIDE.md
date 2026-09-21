# Era Content Guide

Use this checklist for every action, event, storyline, item, career, and piece of interface copy added to Bloodline.

## Content Contract

Every reusable content definition may declare:

- `minEraIndex`: first era where the content is valid.
- `maxEraIndex`: last era where the content is valid.
- `eras`: exact allowed era IDs when a continuous range is not appropriate.
- `eraOverrides`: era-specific label or story text for a mechanically reusable action.

`isEraEligible()` is the single eligibility rule. New content surfaces must use it before exposing a definition to the player.

## Era Boundaries

| Era | Years | Content standard |
| --- | --- | --- |
| Wild West | 1872-1899 | No cars, radio, television, modern school culture, consumer credit language, internet language, or contemporary organized sports wording. |
| Roaring Twenties | 1920-1935 | Motorcars and radio are valid. Avoid television, internet language, and postwar suburban assumptions. |
| Postwar Boom | 1950-1968 | Cars, television, suburbs, and formal school athletics are valid. Avoid internet, smartphones, and gig-economy language. |
| Modern Day | 2005-2026 | Contemporary technology and work are valid. Keep dated platform names out so events age gracefully. |
| Near Future | 2061-2090 | Future technology should create a choice or consequence, not merely rename a modern action. |

## Review Checklist

1. Search labels and text for technology, institutions, slang, jobs, transportation, and entertainment.
2. Confirm the content is valid for every era in which it can appear.
3. Add a range restriction or an override when only the mechanic is timeless.
4. Play the earliest and latest eligible era once.
5. Add or update an automated assertion for any player-reported authenticity mistake.

The standard is player belief, not merely technical historical possibility. When wording feels conspicuously modern, prefer period-native language even if the underlying activity existed.
