// Hand-written incidents. Most incidents are procedural (incidentGen.js); these
// two are story beats: the status page that dies with everything else, and the
// Director boss. Same shape as generated defs (nodes, actions, hint). Their text
// is in content/incidents.json (under "fixed").
import CONTENT from '../content/incidents.json'

export const FIXED_INCIDENTS = CONTENT.fixed

// An OUTAGE spawns this once, unless it's already open
export const FALLOUT_INCIDENT = 'status-page'
