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

## Getting the mouse back without clicking (feedback: after ESC you had to click to regain control)
- Browsers always release the mouse on ESC and only allow taking it back on a click or key press (never on ESC itself).
- **Any key** pressed while walking around now re-captures the mouse (W to walk is enough). The hint says "CLICK OR PRESS ANY KEY TO LOOK AROUND".
- **E closes the PC, the rack and the lever screen** and puts you straight back in control (ESC still closes them, but then needs a key press or click). Not during a microgame, where E is a letter you type. The screens now say [E] LOG OUT / LEAVE / BACK AWAY.
- Chrome refuses a re-capture for about a second after release; the key press is retried once automatically.
- Files: `game/GameManager.jsx`, `ui/HUD.jsx`, `ui/ComputerUI.jsx`, `ui/RackUI.jsx`, `ui/LeverUI.jsx`, controls text in `ui/Passdown.jsx` and `ui/MenuScreen.jsx`.
- Tested in a real (non-headless) Chrome window: re-capture after release with a key, after E at the PC, and after a quick E (retry).

## Story is the gentle mode (feedback: story felt too fast, too much reading for a first-timer)
Story now has its own ease profile (`game/shifts.js`, `LENGTHS.story.ease`); Quick and Endless keep the arcade pace.
| | Story now | Arcade (Quick / Endless) |
|---|---|---|
| Time to OUTAGE | ~2.5 min for 11 PM pages → ~75 s by dawn (an incident keeps the speed it arrived with) | ~45–70 s |
| Microgame time | ×1.5 (~15 s for the first one) | normal |
| Dream task time | ×1.3 | normal |
| Greg rings / time to reply | 18 s / 14 s | 12 s / 7 s |
| Page counts as missed | 40 s (+20 s until you've found the phone) | 25 s |
| Escalates to Greg | 20 s | 12 s |
| Stress gained | ×0.6 | ×1 |

Story night shape (from the real schedule, 60 seeds):
| Hour | Pages | Pile-ups | Time to OUTAGE |
|---|---|---|---|
| 11 PM | 1.0 | 0% | ~157 s |
| 12 AM | 0.4 | 0% | ~134 s |
| 1 AM | 0.7 | 2% | ~117 s |
| 2 AM | 1.2 | 23% | ~104 s |
| 3 AM | 1.4 | 32% | ~94 s |
| 4 AM | 1.8 | 50% | ~85 s |
| 5 AM | 1.4 | 37% | ~78 s |
| 6 AM | 0.8 | 0% | ~75 s (then the Director) |
- About 9 pages a night (was ~14); no pages pile up before a third of the way through; queue/cascade incidents from ~2:20 AM.
- Mechanics are introduced later and further apart in Story: the first hour is just the pager and the PC. Greg + escalation + partner at 1 AM, the rack at 2 AM, Wi-Fi from 1:30, power cuts at 3 AM, the lever at 3:30 AM (`game/gates.js`).
- **Less reading at once**: Dave's notes now show one at a time (7 s each), the rest wait in a queue. The pager and Director notes jump the queue.
- Replaces the earlier "training wheels" (half speed before 1 AM) with the smooth ramp above. The first page is still pre-diagnosed.
- Tested in the browser: first page 147 s to OUTAGE and pre-diagnosed, first microgame 15.4 s, Greg 18 s / 14 s, one note at a time with the pager note first.

## Story mode explains the dream tasks (and pauses while you read)
- **Story shifts only**: the first nap opens with a **HOW THIS WORKS** card (the bank, the multiplier, W to wake, half if the pager wakes you, perfect wake), and each task type gets a **NEW TASK** card the first time it shows up (SIMian, CRUD Reviews, Qwip, Banana Mail, BananaDeploy, Planning Poker, and the red leaked ticket).
- **The whole night pauses** while a card is up: clock, escalation meters, the pager, Greg (`paused` in the store; `tick` skips while it's set). The card says "⏸ the night is paused".
- **Space** (or GOT IT) continues; the task then starts with its full time.
- Each card shows once per browser (`game/unlocks.js`: `introSeen` / `markIntroSeen`).
- Quick and Endless: no cards, just the extra time for new task types.
- Files: `dreams/sprintTasks.js` (`INTROS`), `dreams/DreamSprint.jsx`, `game/GameState.js` (`paused`, `setPaused`), `game/unlocks.js`, `dreams/dreams.css`.
- Tested in the browser: story card shown, game time frozen for 3 s while it's up and running again after; no cards in Quick.

## Typing microgame readability (feedback: the text was hard to see)
- The command is now **big** (about twice the size) in a boxed line, in high-contrast colors: **white** = typed, an **inverted green block** = the next key (blinks), **bright green** = still to type. It used to be small and the untyped part was the dim background green.
- The shell prompt moved above the box; a **progress counter** ("5 / 17") sits under it.
- A typo flashes the block **red** and shakes it briefly (it no longer stays red).
- Files: `ui/microgames/games.jsx` (`TypeCommand`), `ui/microgames/microgames.css`.
