// Ticket Factory content. Every ticket has exactly one right answer under the
// Plantation Priority Matrix™: each bin's `rule` is shown on its board column.
// Bin labels are Amazon-isms; the ids are what the tickets answer with.

export const BINS = [
  { id: 'now', key: '1', label: 'ANDON CORD', rule: 'Pull it: production is down, or an executive asked' },
  { id: 'schedule', key: '2', label: 'OP2 BACKLOG', rule: "Nice-to-haves, and anything a manager said can wait (until next year's planning)" },
  { id: 'close', key: '3', label: 'WORKS AS INTENDED', rule: 'Duplicates and "can\'t reproduce"' },
  { id: 'ignore', key: '4', label: 'DISAGREE & COMMIT', rule: 'Reply-alls, polls, and anything from Kevin. Disagree. Commit to ignoring.' },
]

export const TICKETS = [
  // DO NOW
  { sev: 1, title: 'Production is completely down', from: 'Monitoring', answer: 'now' },
  { sev: 1, title: "Checkout returns HTTP 418 (I'm a teapot)", from: 'Monitoring', answer: 'now' },
  { sev: 2, title: 'Every banana is priced at $0.00', from: 'Monitoring', answer: 'now' },
  { sev: 4, title: 'Make the logo 3% bigger', from: 'VP of Bananas', answer: 'now' },
  { sev: 4, title: 'Can the dashboard be more... yellow?', from: 'Chief Banana Officer', answer: 'now' },
  { sev: 3, title: "Rename the 'Submit' button to 'Synergize'", from: 'SVP of Synergy', answer: 'now' },

  // SCHEDULE
  { sev: 1, title: 'Production is completely down', from: 'Monitoring', comment: 'Can this wait until Monday? — Greg', answer: 'schedule' },
  { sev: 2, title: 'Database is 99% full', from: 'Monitoring', comment: "Let's revisit next quarter 😊 — Greg", answer: 'schedule' },
  { sev: 3, title: 'Dark mode for the banana tracker', from: 'Product', answer: 'schedule' },
  { sev: 4, title: 'Confetti animation when a ticket closes', from: 'Product', answer: 'schedule' },
  { sev: 4, title: 'Rewrite everything in Rust', from: 'Intern', answer: 'schedule' },

  // CLOSE
  { sev: 1, title: 'DUPLICATE: Production is completely down', from: 'Monitoring', answer: 'close' },
  { sev: 3, title: 'DUPLICATE of #4471: Button slightly too low', from: 'QA', answer: 'close' },
  { sev: 2, title: "Login is broken (can't reproduce)", from: 'Support', answer: 'close' },
  { sev: 3, title: "Checkout slow? (can't reproduce, works on my machine)", from: 'Dave', answer: 'close' },

  // IGNORE
  { sev: 3, title: 'RE: RE: RE: RE: Who took my yogurt', from: 'Kevin', answer: 'ignore' },
  { sev: 4, title: 'Lunch poll: 🍕 or 🍌?', from: 'Social Committee', answer: 'ignore' },
  { sev: 2, title: 'Reply-all: please remove me from this list', from: 'Everyone', answer: 'ignore' },
  { sev: 1, title: 'URGENT!!! I have a great idea for a podcast', from: 'Kevin', answer: 'ignore' },
  { sev: 4, title: 'Mandatory fun reminder 🎉 (attendance tracked)', from: 'HR Bot (poll)', answer: 'ignore' },

  // FAANG / public-postmortem deck (parody companies, real-ish incidents)
  { sev: 1, title: 'us-east-1 is down', from: 'Big River Web Services', art: '🌩️', flavor: "It's always us-east-1.", answer: 'now' },
  { sev: 2, title: 'Status page still shows green during the outage', from: 'Big River Web Services', art: '🟢', flavor: 'It was hosted on the thing that was down.', answer: 'now' },
  { sev: 4, title: 'Write a six-pager on why the button is blue', from: 'VP of Narratives', art: '📄', flavor: 'No slides. Only narratives.', answer: 'now' },
  { sev: 3, title: 'Launch a brand new chat app', from: 'Goggle L6 (up for promo)', art: '💬', flavor: 'Promo-driven development. Sunset date: TBD.', answer: 'schedule' },
  { sev: 3, title: 'Migrate off the deprecated framework', from: 'Goggle', art: '🪦', comment: 'Revisit after the next reorg 😊 — Greg', answer: 'schedule' },
  { sev: 2, title: 'DUPLICATE: Reply-all storm on BEDLAM-DL3', from: 'Macrohard Exchange', art: '📨', flavor: '13,000 people. One "please remove me."', answer: 'close' },
  { sev: 3, title: "Teams won't stop notifying (can't reproduce)", from: 'Macrohard', art: '🔔', answer: 'close' },
  { sev: 2, title: 'RE: RE: RE: please remove me from BEDLAM-DL3', from: 'Everyone (13,000)', art: '📧', flavor: 'This ticket has been CC\'d to the whole company.', answer: 'ignore' },
  { sev: 4, title: 'Year of Efficiency kickoff poll 🎉', from: 'FriendFace People Team (poll)', art: '📊', answer: 'ignore' },
  { sev: 1, title: "It looks like you're writing an incident. Need help? 📎", from: "Kevin's Clippy", art: '📎', answer: 'ignore' },
]


export const CORRECT_LINES = [
  '✓ Aligned.',
  '✓ Customer Obsessed.',
  '✓ Two-way door. Walked through it.',
  '✓ Raised the bar.',
  '✓ That will look great in your Forte.',
]
export const WRONG_LINES = [
  "✗ That's not how we prioritize at the Plantation.",
  '✗ HR has been notified.',
  '✗ Greg is "a little disappointed."',
  '✗ Please re-read the Matrix™.',
  '✗ That was a one-way door.',
  '✗ Escalated to your L8. On a Saturday.',
]
