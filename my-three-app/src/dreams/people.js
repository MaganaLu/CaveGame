// Avatars as 2-letter pixel squares; color is stable per name
const COLORS = ['#c2334d', '#2f6fd6', '#1f8a5b', '#b8762c', '#7a3fb8', '#2c8a8a', '#a3368a', '#5b6478']

export function initials(name) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/)
  return ((words[0]?.[0] ?? '?') + (words[1]?.[0] ?? '')).toUpperCase()
}

export function avatarColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return COLORS[h % COLORS.length]
}

// Ticket severity, Amazon-style: what each level actually means at 3 AM
export const PRIORITY = {
  1: { label: 'Sev 1 · Page the VP', icon: '⇈', color: '#d9344f' },
  2: { label: 'Sev 2 · Page on-call', icon: '↑', color: '#e8710a' },
  3: { label: 'Sev 3 · Business hours', icon: '=', color: '#d4a106' },
  4: { label: 'Sev 4 · Heat death of universe', icon: '↓', color: '#2f6fd6' },
}
