import { isRinging } from '../game/GameState'
import { fill } from '../game/text'
import T from '../content/interactions.json'

// Every interactable in the game, in one place. World objects only carry an id
// (see Interactable.jsx); behavior lives here, the words in
// content/interactions.json. An id like "pickup:3" passes "3" as the second argument.
export const INTERACTIONS = {
  // Your partner sleeps here. Run out their patience and it's the couch for you.
  bed: {
    label: (s) => (s.onCouch ? T.bed.occupied : s.wave ? T.bed.nap : T.bed.sleep),
    run: (s) => (s.onCouch ? s.toast(T.bed.occupiedToast, 'bad') : s.requestSleep()),
  },
  couch: {
    label: (s) => (s.wave ? T.couch.nap : T.couch.sleep),
    run: (s) => s.requestSleep(),
    enabled: (s) => s.onCouch,
  },
  phone: {
    label: (s) => (isRinging(s) ? T.phone.answer : T.phone.pickUp),
    run: (s) => s.pickUpPhone(),
    enabled: (s) => !s.hasPhone,
  },
  computer: {
    label: (s) => (s.home.power ? T.computer.use : T.computer.noPower),
    run: (s) => s.useComputer(),
  },
  // Second terminal on the kitchen counter. On battery: works when the power's out.
  laptop: {
    label: () => T.laptop.use,
    run: (s) => s.useComputer('laptop'),
  },
  // Server rack in the bathroom, for the hardware half of some fixes
  rack: {
    label: (s) => (s.incidents.some((i) => i.awaitingRack) ? T.rack.fix : T.rack.idle),
    run: (s) => s.useRack(),
  },
  // RESTART EVERYTHING, on the side of the rack. Opens the hold-to-pull screen.
  // Zip-tied shut until it's introduced (gates.js)
  lever: {
    label: (s) =>
      !s.leverGiven ? T.lever.locked : s.reboot ? T.lever.rebooting : s.charges > 0 ? fill(T.lever.charged, { charges: s.charges }) : T.lever.empty,
    run: (s) =>
      !s.leverGiven ? s.toast(T.lever.lockedToast)
        : s.charges > 0 && !s.reboot ? s.openOverlay('lever') : s.pullLever(),
  },
  router: {
    label: (s) => (s.home.wifi ? T.router.working : T.router.reset),
    run: (s) => s.resetRouter(),
  },
  breaker: {
    label: (s) => (s.home.power ? T.breaker.on : T.breaker.flip),
    run: (s) => s.flipBreaker(),
  },
  pickup: {
    label: () => T.pickup.grab,
    run: (s, arg) => s.collectPickup(Number(arg)),
  },
  flashlight: {
    label: () => T.flashlight.take,
    run: (s) => s.pickUpFlashlight(),
  },
  door: {
    label: () => T.door.leave,
    run: (s) => s.toast(T.door.lockedToast, 'bad'),
  },
}
