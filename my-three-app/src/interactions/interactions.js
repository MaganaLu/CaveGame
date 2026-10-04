import { isRinging } from '../game/GameState'

// Every interactable in the game, in one place. World objects only carry an id
// (see Interactable.jsx); labels and behavior live here. An id like "pickup:3"
// passes "3" as the second argument.
export const INTERACTIONS = {
  // Your partner sleeps here. Run out their patience and it's the couch for you.
  bed: {
    label: (s) => (s.onCouch ? 'Bed (occupied. furious.)' : s.wave ? 'Nap (bonus stage)' : 'Sleep'),
    run: (s) => (s.onCouch ? s.toast('A voice from under the blanket: "Couch."', 'bad') : s.requestSleep()),
  },
  couch: {
    label: (s) => (s.wave ? 'Nap on the couch (bonus stage)' : 'Sleep on the couch'),
    run: (s) => s.requestSleep(),
    enabled: (s) => s.onCouch,
  },
  phone: {
    label: (s) => (isRinging(s) ? 'Answer' : 'Pick Up Phone'),
    run: (s) => s.pickUpPhone(),
    enabled: (s) => !s.hasPhone,
  },
  computer: {
    label: (s) => (s.home.power ? 'Use Computer' : 'Computer (no power)'),
    run: (s) => s.useComputer(),
  },
  // Second terminal on the kitchen counter. On battery: works when the power's out.
  laptop: {
    label: () => 'Use Laptop',
    run: (s) => s.useComputer('laptop'),
  },
  // Server rack in the bathroom, for the hardware half of some fixes
  rack: {
    label: (s) => (s.incidents.some((i) => i.awaitingRack) ? 'Fix Hardware' : 'Server Rack'),
    run: (s) => s.useRack(),
  },
  // RESTART EVERYTHING, on the side of the rack. Opens the hold-to-pull screen.
  // Zip-tied shut until it's introduced (gates.js)
  lever: {
    label: (s) => (!s.leverGiven ? 'Big Red Lever (zip-tied shut)' : s.reboot ? 'Restarting everything…' : s.charges > 0 ? `Big Red Lever (🧨×${s.charges})` : 'Big Red Lever (no 🧨 left)'),
    run: (s) =>
      !s.leverGiven ? s.toast('A note on the zip tie: "NOT YET. — Dave"')
        : s.charges > 0 && !s.reboot ? s.openOverlay('lever') : s.pullLever(),
  },

  router: {
    label: (s) => (s.home.wifi ? 'Router (working)' : 'Reset Router'),
    run: (s) => s.resetRouter(),
  },
  breaker: {
    label: (s) => (s.home.power ? 'Breaker Box' : 'Flip Breaker'),
    run: (s) => s.flipBreaker(),
  },
  pickup: {
    label: () => 'Grab Golden Banana',
    run: (s, arg) => s.collectPickup(Number(arg)),
  },
  flashlight: {
    label: () => 'Take Flashlight',
    run: (s) => s.pickUpFlashlight(),
  },



  door: {
    label: () => 'Leave',
    run: (s) => s.toast('Padlocked. From the outside. HR calls it "retention".', 'bad'),
  },
}
