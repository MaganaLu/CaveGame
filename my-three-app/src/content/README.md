# Game text

Every word the player sees lives here, one folder per language, so the game can be
translated without touching code. `locales/en/` is the original and the fallback.

## Adding a language

1. Copy `locales/en/` to `locales/<code>/` (an ISO code: `es`, `fr`, `pt-br`…).
2. Translate the values. **Don't rename keys, and leave `{placeholders}` as they are.**
   You can delete anything you haven't translated yet: missing files and missing keys
   fall back to English.
3. That's it. The language is picked at startup from `?lang=<code>` in the URL, then
   the player's saved choice, then the browser's language. Once there's more than one
   language, a picker shows up on the sign-in screen.

Lists (for example Greg's calls or the incident logs) are replaced as a whole, not
merged entry by entry. Translate the whole list or leave it out.

## Templates

`fill(template, vars)` in `src/game/text.js` fills these in:

- `{name}` is replaced by a value, e.g. `"Big Red Lever (🧨×{charges})"`.
- `{name|s}` adds the suffix only when the value isn't 1, e.g. `"{n} incident{n|s}"`.
  For languages with other plural rules, rewrite the sentence so it reads well with
  any number (e.g. `"incidents: {n}"`).

`**word**` makes it bold where the UI supports it (`ui/Rich.jsx`).

## Files

| File | Text |
| --- | --- |
| `ui.json` | Every screen's labels, buttons, statuses and hints (menu, HUD, phone, PC, rack, lever, score, handoff, dream, microgames) |
| `messages.json` | Toasts, banners, score pops, logs |
| `passdown.json` | The how-to-play screen after login |
| `interactions.json` | "E to …" prompts on objects |
| `calls.json` | Greg's calls, the escalation call, voicemails, the Director's join and leave lines |
| `tips.json` | Dave's notes, shown the first time something comes up |
| `principles.json` | Banana Principles and posters |
| `incidents.json` | Incident titles, causes, dashboard rows, logs, hints and fixes, per archetype |
| `night.json` | Story schedule, Endless script, wave names |
| `scoring.json` | Escalation stages, streak tiers, night grade titles, night bonuses |
| `shifts.json` | Shift lengths and modifiers |
| `handoff.json` | The 7 AM Qwip handoff doc |
| `microgames.json` | Fix microgame briefs, AWS commands, rack tasks |
| `credits.json` | Credits |
| `dreams/*.json` | Dream Sprint: tickets, PRs, COEs, emails, deploys, stories, feedback, intro cards, app chrome |

## Keys that aren't text

Some values are looked up by the code and must stay as they are, even in a translation:
`id`, `answer`, `kind`, `key`, `requires`, `link`, `status`, `sev`, and the keys of
`ui.json → computer.statuses / serviceNames` and `call.callers` (translate the values
only). In `incidents.json`, keep the `services` names; their display names are in `ui.json`.

## Careful with `incidents.json` and `microgames.json`

Incidents are generated from a seed, and shift seeds are shared daily. Adding or removing
entries in a list changes which entry a seed picks, so everyone's "same" shift changes too.
Editing the wording of an entry is always safe.

## Fonts

The bundled pixel fonts cover Latin (with accents), Cyrillic and Japanese (DotGothic16,
the body font). Other scripts (Chinese, Korean, Arabic, Thai…) will need a font added in
`src/psx/fonts.js`, or they fall back to a system font.
