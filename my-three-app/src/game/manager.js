// Greg's phone calls. Each call is a short timed dialogue: Greg says a line, you
// pick a reply (keys 1-3) before the timer runs out. The blameless corporate answer
// is "good" (calms you down, scores MANAGED UP); anything else adds stress.
//
// Tiers by situation:
//   work - an incident is open: pressure and status updates
//   idle - nothing is broken: Greg is just... checking in
//   late - after 2 AM: Greg is running on cold brew and calendar invites

export const CALLS = [
  // ---------------------------------------------------------------- work
  {
    tier: 'work',
    from: 'GREG',
    steps: [
      {
        line: "Hey! Quick sync. What's the ETA?",
        choices: [
          { text: 'Mitigating now. Update in 15.', good: true, reply: 'Love it. Bias for Action. 🙌' },
          { text: 'No idea, honestly.', reply: "...I'll tell leadership \"soon\"." },
          { text: 'Greg, it is the middle of the night.', reply: "Customers don't sleep. Neither do we. 🙂" },
        ],
      },
    ],
  },
  {
    tier: 'work',
    from: 'GREG',
    steps: [
      {
        line: 'Leadership wants a one-pager on this by 9 AM. Can you own that?',
        choices: [
          { text: 'Yes. Disagree and commit.', good: true, reply: "That's the Ownership I like to see." },
          { text: "I'm a little busy fixing it.", reply: 'Fixing is great. Visibility is better.' },
          { text: 'Can Dana write it?', reply: 'Dana is asleep. Like a normal person. Anyway.' },
        ],
      },
      {
        line: 'Also. Is this incident... your fault?',
        choices: [
          { text: 'It was a process gap.', good: true, reply: 'Perfect. Blameless. Love it.' },
          { text: 'Maybe?', reply: "I'm going to pretend I didn't hear that." },
          { text: 'It was DNS.', good: true, reply: 'It is always DNS. Carry on.' },
        ],
      },
    ],
  },
  {
    tier: 'work',
    from: 'GREG',
    steps: [
      {
        line: 'Can you jump on a bridge call? The VP is on. Camera on, please.',
        choices: [
          { text: 'Joining now. Mitigating in parallel.', good: true, reply: 'Great. Smile. 🙂' },
          { text: "I'm in pajamas.", reply: 'Then turn the camera on anyway. It shows commitment.' },
          { text: "I can't fix it AND talk about it.", reply: "That's a growth area. Noted for Forte." },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- idle
  {
    tier: 'idle',
    from: 'GREG',
    steps: [
      {
        line: 'Hey, nothing broken? Just checking in. Are you... working on anything?',
        choices: [
          { text: 'Proactively reviewing dashboards.', good: true, reply: "That's what I like to hear. Keep going." },
          { text: 'Trying to sleep, Greg.', reply: 'Sleep is a cost center 🍌. Just kidding. Unless?' },
          { text: 'Why are YOU awake?', reply: "Leaders are always awake. That's the job." },
        ],
      },
    ],
  },
  {
    tier: 'idle',
    from: 'GREG',
    steps: [
      {
        line: 'Random thought: what did you do for the customer today?',
        choices: [
          { text: 'Kept production up.', good: true, reply: 'Customer Obsession. Chef\'s kiss.' },
          { text: 'Survived.', reply: "Let's reframe that as 'delivered results'." },
          { text: "It's 1 AM.", reply: "Day 1 doesn't have a clock." },
        ],
      },
    ],
  },

  // ---------------------------------------------------------------- late (after 2 AM)
  {
    tier: 'late',
    from: 'GREG',
    steps: [
      {
        line: "Your status has been green for four hours. Can you make it greener?",
        choices: [
          { text: "That's not how status works.", reply: "That's not a no." },
          { text: 'Working on it.', good: true, reply: 'Love that. Ship it.' },
          { text: 'Greg, it is 2 AM.', reply: "It's 9 AM somewhere. Probably." },
        ],
      },
    ],
  },
  {
    tier: 'late',
    from: 'GREG',
    steps: [
      {
        line: 'Quick one: can you jump on a call about this call?',
        choices: [
          { text: 'We are on a call.', reply: 'A different call. A meta-call.' },
          { text: 'Can it be an email?', good: true, reply: "Bold. Fine. I'll send a doc." },
          { text: 'Sure.', reply: 'Great, sending an invite for 30 minutes from now. And 30 after that.' },
        ],
      },
    ],
  },
  {
    tier: 'late',
    from: 'GREG',
    steps: [
      {
        line: "Heads up: the Director might drop in. He's 'just listening'.",
        choices: [
          { text: 'He is never just listening.', reply: 'He is never just listening.' },
          { text: "I'll have a status ready.", good: true, reply: 'Make it one slide. He reads one slide.' },
          { text: 'Who is the Director?', reply: 'Gold badge. Twenty-five years. The company is twelve.' },
        ],
      },
      {
        line: 'Also, can we do the COE in the morning? Before the incident ends?',
        choices: [
          { text: 'That is not possible.', reply: 'Disagree and commit.' },
          { text: "I'll start a draft.", good: true, reply: 'Working Backwards. Love it.' },
          { text: '...', reply: "I'll take that as a yes." },
        ],
      },
    ],
  },
]

// Escalation policy: your pager rang unanswered, so it paged Greg. He calls you
// about it (manager.js CALLS are random; this one is triggered, see GameState).
export const ESCALATION_CALL = {
  tier: 'escalation',
  from: 'GREG',
  steps: [
    {
      line: "Your pager escalated to me. Why is my pager going off at this hour?",
      choices: [
        { text: 'On it right now. Acking.', good: true, reply: 'Great. Next stop on the escalation policy is the Director. Just saying.' },
        { text: 'I was asleep.', reply: 'So was I. Now we are both awake. Together.' },
        { text: 'What pager?', reply: "...I'm adding a recurring 1:1." },
      ],
    },
  ],
}

// Voicemail after each missed/declined call, escalating (in calendar invites)
export const VOICEMAILS = [
  'Call me back. 🙂',
  'Call me back, please.',
  "I can see you're online.",
  "I've added a 30-minute 'quick sync' to your calendar.",
  "I've added three more. They're recurring.",
]

export const TIMEOUT_REPLY = "Hello? ...You're breaking up. I'll put 30 minutes on your calendar."

// The Director: gold badge, 25+ years of tenure at a 12-year-old company. He
// shows up for the boss incident and won't stop "just listening".
export const DIRECTOR_JOIN = 'THE DIRECTOR HAS JOINED THE CALL'
export const DIRECTOR_LINES = [
  'Quick question: is it fixed?',
  "I'm just here to listen. Why is the graph red?",
  'In my day we fixed prod with a screwdriver and a prayer.',
  'Can I get a 6-pager on this by 9?',
  "I've been here twenty-five years. This company is twelve.",
  "Let's take this offline. Prod already is.",
  'Have we tried Customer Obsession?',
  'Love the energy. Hate the graph.',
  "Who's the single-threaded owner here? You? Great.",
  'Is this a one-way door or a two-way door? Asking for the door.',
  'I used to be on call. Then I got a gold badge.',
  "Let's not boil the ocean. Just fix the ocean.",
]
export const DIRECTOR_LEAVES = [
  'He said "thanks team" to Greg. Greg is framing it.',
  'He left a 👍 on the doc. Nobody knows what it means.',
  'He has dropped. His camera was off the whole time.',
]
