// Apartment layout data shared outside Apartment.jsx (weather needs the windows).

// Window openings in the outer walls: [from, to] along the wall, [sill, top] height
export const WINDOWS = {
  bedroom: [-3.7, -2.3, 0.95, 2.05], // north wall: the street and the tall tower
  overBed: [0.9, 2.1, 1.6, 2.3], // north wall, above the bed's tall headboard
  desk: [-2.2, -1.3, 1.0, 2.1], // east wall, beside the desk
  kitchen: [-4.2, -2.9, 1.2, 2.1], // south wall, over the counter: the block next door
}

// Which outer wall each window is in (same convention as <Wall>): `along` is the
// axis the wall runs along, `at` is its plane on the other axis, and `out` is
// which way is outside (+1 or -1 on that other axis).
const WALL_OF = {
  bedroom: { along: 'x', at: -7.5, out: -1 },
  overBed: { along: 'x', at: -7.5, out: -1 },
  desk: { along: 'z', at: 5, out: 1 },
  kitchen: { along: 'x', at: 7.5, out: 1 },
}

// Outside ledge of every window, where rain splashes
export const SILLS = Object.entries(WINDOWS).map(([name, [a, b, y0]]) => ({ name, a, b, y0, ...WALL_OF[name] }))
