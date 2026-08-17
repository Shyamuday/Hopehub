const quotes = [
  'You do not need to solve everything today.',
  'Rest is part of moving forward, not a step away from it.',
  'A difficult day does not erase your progress.',
  'You are allowed to take up space and ask for support.',
  'Small steps still carry you forward.',
  'Your feelings deserve kindness, not judgment.',
  'Starting again is a form of courage.',
  'You can care deeply without carrying everything alone.',
  'A pause can be productive when your mind needs room.',
  'Being gentle with yourself is a useful skill.',
  'You are more than the hardest thing you are facing.',
  'It is okay if today is about getting through, not getting ahead.',
  'Boundaries can protect care instead of ending it.',
  'You can miss someone and still choose what is healthy for you.',
  'Healing rarely moves in a straight line.',
  'Your pace is still a valid pace.',
  'One honest conversation can make a heavy day lighter.',
  'You do not have to earn rest.',
  'Courage can look like asking someone to listen.',
  'Not every thought deserves to be treated as a fact.',
  'You can be grateful and still need support.',
  'A calm moment is worth noticing.',
  'Progress may be quiet before it becomes visible.',
  'You are allowed to change your mind when you learn more.',
  'Today can be imperfect and still meaningful.',
  'You can choose one small thing and leave the rest for later.',
  'Feeling deeply is not the same as being weak.',
  'The way you speak to yourself matters.',
  'You deserve support before things become unbearable.',
  'You do not have to carry the weight of the world alone.'
];

const prompts = [
  'What is one small thing that would make today feel lighter?',
  'What are you carrying today?',
  'What helped you get through a difficult moment recently?',
  'What would you say to a friend who felt the way you do?',
  'What is one boundary you want to protect this week?',
  'What does a genuinely restful hour look like for you?',
  'What is one thing you handled today that nobody noticed?',
  'Which feeling has been asking for your attention?',
  'What is one kind thing you can do for your future self?',
  'What helps you feel heard in a conversation?',
  'What is something you are learning to release?',
  'Where do you feel safest being yourself?',
  'What is one task you can make smaller today?',
  'What song helps your mind slow down?',
  'What is one win from this week, however small?',
  'What makes it easier for you to ask for help?',
  'What would “enough for today” look like?',
  'What is one habit that quietly supports you?',
  'Which part of your day needs more gentleness?',
  'What helps you return to the present moment?',
  'What are you proud of surviving?',
  'What is one thing you can postpone without guilt?',
  'What kind of support feels comfortable right now?',
  'What helps you feel less alone?',
  'What is one expectation you can loosen today?',
  'What would you like to hear from someone you trust?',
  'What is one place, person, or memory that feels calming?',
  'What does emotional safety mean to you?',
  'What are you ready to begin again?',
  'What would make tomorrow morning a little easier?'
];

const resets = [
  '🌿 One-minute reset\n\nRelax your shoulders. Breathe in slowly, then let the breath out a little longer.',
  '💧 Gentle reset\n\nTake a sip of water and notice the temperature. Let this be your only task for a moment.',
  '🪟 Grounding pause\n\nLook around and name three things you can see, two you can hear, and one you can feel.',
  '🫶 Self-kindness pause\n\nPlace a hand somewhere comfortable and say: “This is difficult, and I can take it one step at a time.”',
  '🚶 Small reset\n\nStand, stretch, or walk for one minute. Let your body change the pace of your thoughts.',
  '📵 Quiet minute\n\nPut the phone down, unclench your jaw, and take three unhurried breaths.',
  '📝 Mind-clearing pause\n\nWrite the next one small action. You do not need to plan the whole day.',
  '🌤️ Gentle perspective\n\nAsk: “Will this need my attention now, later, or not at all?”',
  '🎧 Listening reset\n\nNotice the furthest sound you can hear, then the closest. Return slowly to the room.',
  '💙 Permission to pause\n\nFor the next minute, you do not need to fix, explain, or decide anything.'
];

const polls = [
  [
    'What would feel most supportive right now?',
    ['Someone to listen', 'Quiet time', 'Practical ideas', 'A gentle distraction'],
    true
  ],
  ['How is your energy today?', ['Very low', 'A little low', 'Steady', 'High'], false],
  [
    'What is taking the most space in your mind?',
    ['Work or study', 'Relationships', 'Health', 'The future'],
    true
  ],
  [
    'Which kind of group activity would you join?',
    ['A voice circle', 'A guided check-in', 'A wellbeing discussion', 'A quiet listening space'],
    true
  ],
  [
    'What helps you reset after a hard day?',
    ['Sleep or rest', 'Talking', 'Music or movement', 'Time alone'],
    true
  ],
  [
    'When do you most need emotional support?',
    ['Morning', 'Afternoon', 'Evening', 'Late night'],
    false
  ],
  ['What would you like more of this week?', ['Calm', 'Connection', 'Motivation', 'Clarity'], true],
  [
    'How comfortable are you asking for help?',
    ['Not yet', 'A little', 'Usually', 'Very comfortable'],
    false
  ],
  [
    'Which topic should we discuss next?',
    ['Overthinking', 'Loneliness', 'Boundaries', 'Confidence'],
    true
  ],
  [
    'What kind of check-in feels easiest?',
    ['A poll', 'One word', 'A short message', 'Listening only'],
    true
  ]
] as const;

const quizzes = [
  [
    'A friend shares a difficult feeling. What is the best first response?',
    [
      'Give immediate advice',
      'Ask whether they want listening or ideas',
      'Compare it with your experience'
    ],
    1,
    'Asking what support they want respects their needs.'
  ],
  [
    'Which sentence is a kind boundary?',
    ['I must always be available', 'I care, and I need to rest now', 'Do not speak to me again'],
    1,
    'Clear, respectful boundaries can protect both people.'
  ],
  [
    'Which action can help during overthinking?',
    [
      'Solve every possible future',
      'Return attention to one present action',
      'Judge yourself for worrying'
    ],
    1,
    'A small present action can interrupt the worry loop.'
  ],
  [
    'What makes peer support safer?',
    ['Keeping personal stories private', 'Diagnosing other members', 'Pressuring people to share'],
    0,
    'Privacy, consent, and non-judgment make sharing safer.'
  ],
  [
    'What is a helpful listening habit?',
    [
      'Planning your reply while they speak',
      'Reflecting what you heard',
      'Telling them how to feel'
    ],
    1,
    'Reflecting what you heard helps someone feel understood.'
  ],
  [
    'Which is a realistic self-care step?',
    ['Fix everything today', 'Choose one manageable action', 'Ignore every feeling'],
    1,
    'Small, manageable actions are easier to sustain.'
  ],
  [
    'What can you say when you do not know how to help?',
    ['You are overreacting', 'I may not have answers, but I can listen', 'Just be positive'],
    1,
    'Presence can be supportive even without answers.'
  ],
  [
    'Which thought is most balanced?',
    [
      'Everything will go wrong',
      'This is hard, and I can handle the next step',
      'I should never struggle'
    ],
    1,
    'Balanced thoughts acknowledge difficulty without predicting disaster.'
  ],
  [
    'What should come before giving personal advice?',
    ['Consent', 'A long explanation', 'A comparison'],
    0,
    'Ask whether the person wants suggestions before offering them.'
  ],
  [
    'Which response avoids minimising?',
    ['Others have it worse', 'That sounds heavy', 'It is not a big deal'],
    1,
    'Acknowledging a feeling is kinder than comparing or dismissing it.'
  ]
] as const;

export const TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS = [
  ...quotes.map((text) => ({ kind: 'MESSAGE', text: `💙 A thought for today\n\n${text}` })),
  ...prompts.map((text) => ({
    kind: 'MESSAGE',
    text: `💬 Community prompt\n\n${text}\n\nShare only what feels comfortable.`
  })),
  ...resets.map((text) => ({ kind: 'MESSAGE', text })),
  ...polls.map(([pollQuestion, pollOptions, pollMultiple]) => ({
    kind: 'POLL',
    pollQuestion,
    pollOptions: [...pollOptions],
    pollAnonymous: true,
    pollMultiple,
    pollQuiz: false,
    closeAfterMinutes: 720
  })),
  ...quizzes.map(([pollQuestion, pollOptions, correctOption, pollExplanation]) => ({
    kind: 'POLL',
    pollQuestion,
    pollOptions: [...pollOptions],
    pollAnonymous: true,
    pollMultiple: false,
    pollQuiz: true,
    correctOptionIds: [correctOption],
    pollExplanation,
    closeAfterMinutes: 720
  }))
];
