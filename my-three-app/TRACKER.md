# On Call: build tracker

Steps agreed on 2026-10-03. Nothing is committed (by request).

| # | Step | Status |
|---|------|--------|
| 2 | Recover the deleted dream content (CRUD Reviews PRs, Qwip COEs) | ✅ Done |
| 3 | Dream Sprint: parody tasks + bank, multiplier, wake, perfect wake, pager leaks | ✅ Done |
| 4 | Escalation policy: ignored pages → Greg calls → the Director joins | ✅ Done |
| 5 | Partner patience: ringing wakes your partner; at zero you're on the couch | ✅ Done |
| 6 | Qwip handoff: the 7 AM score screen is your passdown for the next on-call | ✅ Done |

## 2. Recover deleted dream content
- `src/dreams/` was never committed, so the deleted files were rebuilt from the session history.
- Restored: `src/dreams/pullRequests.js` (24 PRs, file paths) and `src/dreams/coe.js` (5 COEs, rules, answer lines).
- Not restored on purpose: the old full-screen CodeReview / WriteTheCOE components (Dream Sprint uses single-card versions), the nightmare variants (horror was cut).

## 3. Dream Sprint
Built:
- Asleep → developer-parody tasks, one decision each (keys 1-4 or click), each flashed WarioWare-style first. Time per task shrinks from 6 s to 2.6 s the longer you stay.
- Tasks: **SIMian** triage, **CRUD Reviews** ship-or-not, **Qwip** COE (pick the blameless line), **Banana Mail** Reply-All (buttons swap), **BananaDeploy** Friday deploy, **Planning Poker** (go with the team, not the Director's 40).
- Each success: bank +150 × multiplier, multiplier +0.25 (max ×3), stress −3. Fumble: multiplier −0.5.
- **W** wakes you: keep the bank (×1.5 **PERFECT WAKE** inside the last 4 s). Pager wakes you: keep **50%**.
- ~14 s before the pager, the incoming incident **leaks** in as a red SIMian ticket. Triage it ANDON CORD → that incident arrives **pre-diagnosed** (💭 the right fix glows on the PC).
- Yanked awake and answer within 2 s → that incident escalates 20% slower (QUICK ANSWER).
- Endless: same during the break; the leak is the next wave's first incident.
- Removed: Ticket Factory as a full game (its tickets are the SIMian card).
- Files: `src/dreams/DreamSprint.jsx`, `sprintTasks.js`, `dreams.js`, `DreamScreen.jsx`; store: `dreamTask`, `wakeUp`, yank in `addIncident`.
- Tested in the browser: all six apps, bank/multiplier, leak → pre-diagnosed, perfect wake (1,464 → 2,196), yanked (750 → 375), quick answer (rate ×0.8).

## 4. Escalation policy
Built:
- An alert left ringing **12 s** pages Greg: toast "escalated to Greg", and Greg calls you about it (a dedicated call; reply with 1-3 as usual).
- Still unanswered at **25 s** (the existing "missed alert" point): **the Director joins the call**, with his boss effect (everything escalates 1.3× faster, Greg goes quiet).
- One Director at a time, and a **90 s cooldown** after he leaves before an escalation can summon him again.
- Starts at midnight / wave 3 (with Greg, see `gates.js`). Dave's tip explains it the first time.
- Files: `game/GameState.js` (incident loop, `ringCall`), `game/manager.js` (`ESCALATION_CALL`), `game/gates.js` (tip).
- Tested in the browser: Greg's escalation call at 12 s, the Director at 25 s, cooldown after fixing him.

## 5. Partner patience
Built:
- Your partner sleeps on the left side of the bed (a lump under the covers, hair on the pillow). They breathe, and toss and turn as patience runs out.
- **Patience** (0–100) drains **5/s** while anything rings (an alert or a Greg call) and recovers **0.8/s** when it's quiet.
- At **0**: banner **SENT TO THE COUCH**, +10 stress, the partner pulls the blanket over their head, and for the rest of the night the bed says "Couch." — the **living-room couch** is your bed (naps / Dream Sprint from there, farther from the desk).
- HUD: a PARTNER meter appears under STRESS once the phone has woken them; "🛋️ ON THE COUCH" after.
- Dave's tips explain it (first ring, and the couch).
- Files: `game/GameState.js` (tick, `patience`, `onCouch`), `apartment/Props.jsx` (`Partner`), `apartment/Apartment.jsx` (couch interactable), `interactions/interactions.js` (bed/couch), `ui/HUD.jsx`.
- Tested in the browser: 6 s of ringing → 70, 21 s → couch, bed/couch labels switch.

## 6. Qwip handoff
Built:
- The score screen's stats table is now a **Qwip doc**: "On-Call Handoff — Shift #N", written for the next on-call.
- Score up top, then TL;DR (by outcome), What happened (fixes, outages, breaches, missed pages, escalations, the Director's visits, lever pulls, naps / perfect wakes / yanks, the couch, Greg's calls, grade counts), Still on fire (incidents open at the end), Root cause (a joke, seeded per night), Action items (from what went wrong), Banana Principles demonstrated (night bonuses), Performance + Bonus $0.00.
- Margin comments: Greg ("six-pager by 9?"), the Director (👍) if he visited, your partner ("Couch.") if you were sent there.
- The shift grade and leaderboard / initials stay in the right column.
- Files: `game/handoff.js` (text), `ui/HandoffDoc.jsx` (layout), `ui/ScoreScreen.jsx`; new stats `directorVisits`, `escalations`, `leverPulls`, and `stillOpen` at the end of the night.
- Tested in the browser with a full night (fixes, the Director, lever, naps, couch, one incident left open).

## Final check
- Lint (project code) and production build pass.
- Earlier regression test still passes: gates, Dave's tips, grade payouts, lever unlock at 3 AM, modifier unlock, Endless wave pools.

## Tuning: gentler first hour (after playtest feedback: "really hard for the first level of the story shift")
- The night's **first page arrives pre-diagnosed** (the fix glows; Dave's first note says so). Not in Quick shifts.
- **Training wheels**: incidents that arrive before **1 AM** escalate at **half speed** for their whole life (first page: 120 s to OUTAGE instead of 60).
- **Missed alert** waits an extra **20 s** until you've picked up the phone once (you're still finding it on the nightstand).
- **Partner patience** starts at **midnight** (wave 2 in Endless), like Greg.
- **Microgames** start easier and ramp to the same late-night difficulty: 11 s → 5.5 s; whack 2 → 5 kills; purge 2 → 4 big files; timing 2 → 5 hits; restart order 3 → 6; cables 3 → 5; `top` reshuffles slower early.
- Quick shifts and Endless after wave 1 are unchanged.
- Knobs: `game/gates.js` (`fullSpeed`, `partner`), `game/GameState.js` (`TRAINING_SPEED`, `FIRST_PICKUP_GRACE`), `game/microgames.js` (`timeLimitFor`), `ui/microgames/games.jsx`.

## Dream tasks: learn by playing (no tutorial cards)
- Tried one-time explanation cards; removed them (they stopped the action). Instead:
- **Longer timers**: each task starts at **9 s** (was 6) and shrinks to **3.5 s** (was 2.6) the longer you stay asleep.
- **New task types get extra time**: the first **3** times you meet each kind, its timer is **×1.6** (about 14 s at the start of a nap). Remembered per browser (`game/unlocks.js`).
- The WarioWare-style instruction flash ("SHIP IT?", "TRIAGE IT!") stays as the only hint.
- Fixed: "never the same task type twice in a row" wasn't working; it is now.
- Knobs: `dreams/dreams.js` (`taskSeconds`, `NEW_TASK_BONUS`, `NEW_TASK_TIMES`).
- Tested in the browser with a fresh profile: ~14 s for new types, normal time from the 4th encounter, no repeats, no cards.

## Nothing covers the PC (feedback: Greg's call and text covered the computer screen)
- At a screen (PC, rack, lever) the **monitor sits on the left** and everything that talks to you moves into a **notification rail on the right**: Dave's notes and toasts at the top, then callouts (streak, Director), then the last fix's result card, and **Greg's call docked at the bottom**.
- The phone hides while you're at a screen (the PC shows the same alerts).
- Out in the apartment nothing changed: toasts top-center, calls bottom-center.
- Files: `ui/HUD.jsx` (`.hud-top.busy`), `ui/CallScreen.jsx`, `ui/PhoneUI.jsx`, `ui/ui.css`.
- Tested in the browser: ringing and active Greg calls, two Dave notes, a streak banner and a resolve card all open at once at the PC; the monitor's tabs, title and fix buttons stay uncovered.
