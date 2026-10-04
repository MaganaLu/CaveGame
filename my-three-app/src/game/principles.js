// The 16 Banana Principles™ of CodeMonkey Corp, as adopted by The Banana Plantation.
// Used for wall posters (meme format: top text / emoji "image" / bottom text),
// style-bonus names, night-end bonuses and Greg's messages.

export const PRINCIPLES = [
  {
    name: 'Customer Obsession',
    official: 'We start with the customer and work backwards. Tonight the customer is a bot doing 40k req/s.',
    meme: { top: 'THE CUSTOMER IS ALWAYS RIGHT', emoji: '🤖', bottom: 'THE CUSTOMER IS A SCRAPER' },
    bg: '#b8382c',
  },
  {
    name: 'Ownership',
    official: 'We never say "that\'s not my job." We do say "why am I on call for 14 services."',
    meme: { top: '"THAT\'S NOT MY JOB"', emoji: '📟', bottom: 'IT IS NOW. ALL OF THEM.' },
    bg: '#2c5fb8',
  },
  {
    name: 'Invent and Simplify',
    official: 'We expect innovation and simplification. sleep(5000) is both.',
    meme: { top: 'INVENT AND SIMPLIFY', emoji: '💡', bottom: 'await sleep(5000)' },
    bg: '#c9a227',
  },
  {
    name: 'Are Right, A Lot',
    official: 'Strong judgment and good instincts. It was DNS.',
    meme: { top: 'ARE RIGHT, A LOT', emoji: '🎯', bottom: 'IT WAS DNS. IT IS ALWAYS DNS.' },
    bg: '#3a8a4c',
  },
  {
    name: 'Learn and Be Curious',
    official: 'We are never done learning, especially about why production is on fire.',
    meme: { top: 'STAY CURIOUS', emoji: '🔥', bottom: 'WHY IS PROD ON FIRE' },
    bg: '#8a3a8a',
  },
  {
    name: 'Hire and Develop the Best',
    official: 'We raise the bar with every hire, then add them to the on-call rotation.',
    meme: { top: 'HIRE THE BEST', emoji: '🐒', bottom: 'PUT THEM ON CALL DAY ONE' },
    bg: '#2c8a8a',
  },
  {
    name: 'Insist on the Highest Standards',
    official: 'Relentlessly high standards. We raised the bar. And the CPU. To 98%.',
    meme: { top: 'RAISE THE BAR', emoji: '📈', bottom: 'CPU: 98%' },
    bg: '#b85f2c',
  },
  {
    name: 'Think Big',
    official: 'A bold, inspiring direction. Our incidents are now SEV-1 sized.',
    meme: { top: 'THINK BIG', emoji: '🧠', bottom: 'NO, BIGGER. SEV-1 BIG.' },
    bg: '#4c3ab8',
  },
  {
    name: 'Bias for Action',
    official: 'Speed matters. Most decisions are reversible. Some were not.',
    meme: { top: 'DEPLOY ON FRIDAY', emoji: '🚀', bottom: 'ASK QUESTIONS ON MONDAY' },
    bg: '#b82c5f',
  },
  {
    name: 'Frugality',
    official: 'Accomplish more with less. Less sleep counts.',
    meme: { top: 'DO MORE WITH LESS', emoji: '🍌', bottom: 'LESS: SLEEP. MORE: PAGES.' },
    bg: '#8a7a2c',
  },
  {
    name: 'Earn Trust',
    official: 'We speak candidly and are vocally self-critical, e.g. "it\'s probably fine."',
    meme: { top: 'EARN TRUST', emoji: '🤝', bottom: '"IT\'S PROBABLY FINE"' },
    bg: '#2c8a5f',
  },
  {
    name: 'Dive Deep',
    official: 'We stay connected to the details. At 4 AM. In the logs. Alone.',
    meme: { top: 'DIVE DEEP', emoji: '🤿', bottom: 'INTO THE LOGS. AT 4 AM.' },
    bg: '#1f4f7a',
  },
  {
    name: 'Have Backbone; Disagree and Commit',
    official: 'We respectfully challenge decisions, then commit anyway. Mostly the second part.',
    meme: { top: 'I DISAGREE', emoji: '🙂', bottom: '*COMMITS TO MAIN ANYWAY*' },
    bg: '#7a1f4f',
  },
  {
    name: 'Deliver Results',
    official: 'We deliver the key inputs with quality and on time. The result was a 503.',
    meme: { top: 'DELIVER RESULTS', emoji: '📦', bottom: 'RESULT: 503' },
    bg: '#5f2cb8',
  },
  {
    name: "Strive to be Earth's Best Employer",
    official: 'A safe, productive, empowering environment. The pager is waterproof, for the shower.',
    meme: { top: "EARTH'S BEST EMPLOYER", emoji: '🌍', bottom: 'PAGER IS WATERPROOF NOW' },
    bg: '#2c7ab8',
  },
  {
    name: 'Success and Scale Bring Broad Responsibility',
    official: 'Leave things better than you found them. The campsite is on fire.',
    meme: { top: 'LEAVE IT BETTER THAN YOU FOUND IT', emoji: '🏕️', bottom: 'THE CAMPSITE: ON FIRE' },
    bg: '#7a5f1f',
  },
]

export const principleIndex = (name) => PRINCIPLES.findIndex((p) => p.name === name)

// Which principles hang on the apartment walls (see apartment/Posters.jsx)
export const POSTER_PRINCIPLES = [
  'Bias for Action',
  'Ownership',
  'Dive Deep',
  'Frugality',
  'Have Backbone; Disagree and Commit',
  'Are Right, A Lot',
  "Strive to be Earth's Best Employer",
  'Insist on the Highest Standards',
]
