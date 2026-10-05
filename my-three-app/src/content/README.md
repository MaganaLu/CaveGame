# Game text

All of On Call's words live here as JSON, so the writing can be edited without touching code.
Vite imports JSON directly (`import T from '../content/x.json'`); each `.js` module that used to
hold the text now just loads it and keeps the same exports.

## Templates

`fill(template, vars)` in `src/game/text.js` fills these in:

- `{name}` is replaced by a value, e.g. `"Big Red Lever (🧨×{charges})"`.
- `{name|s}` adds the suffix only when the value isn't 1, e.g. `"{n} incident{n|s}"`.

`passdown.json` also uses `**bold**`, which `ui/Rich.jsx` renders.

## Files

| File | Text |
| --- | --- |
| `calls.json` | Greg's calls, the escalation call, voicemails, the Director's join and leave lines |
| `tips.json` | Dave's notes, shown the first time something comes up |
| `principles.json` | Banana Principles and posters |
| `incidents.json` | Incident titles, causes, dashboard rows, logs, hints and fixes, per archetype |
| `night.json` | Story schedule, Endless script, wave names |
| `scoring.json` | Streak tiers, night grade titles, night bonuses |
| `shifts.json` | Shift lengths and modifiers |
| `handoff.json` | The 7 AM Qwip handoff doc |
| `microgames.json` | Fix microgame briefs, AWS commands, rack tasks |
| `messages.json` | Toasts, banners, score pops, logs |
| `interactions.json` | "E to …" prompts on objects |
| `passdown.json` | The how-to-play screen after login |
| `credits.json` | Credits |
| `dreams/*.json` | Dream Sprint: tickets, PRs, COEs, emails, deploys, stories, feedback, intro cards |

## Careful with `incidents.json` and `microgames.json`

Incidents are generated from a seed, and shift seeds are shared daily. Adding or removing
entries in a list changes which entry a seed picks, so everyone's "same" shift shifts too.
Editing the wording of an entry is always safe.
