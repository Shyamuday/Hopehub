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
  '💙 Permission to pause\n\nFor the next minute, you do not need to fix, explain, or decide anything.',
  '🧊 Sensory reset\n\nHold something cool or wash your hands with cool water. Notice the sensation without rushing.',
  '🌱 Tiny task reset\n\nChoose one task that takes less than two minutes. Finish only that one.',
  '🫁 Box breathing\n\nBreathe in for four, hold for four, out for four, and pause for four. Repeat if it feels comfortable.',
  '🧍 Body check-in\n\nNotice your feet on the floor and soften one tense place in your body.',
  '🪞 Compassion reset\n\nSay one sentence to yourself that you would genuinely say to a friend.',
  '🌙 Thought parking\n\nWrite down one worry you cannot solve now. Give yourself permission to return to it later.',
  '☀️ Light reset\n\nIf you can, look toward daylight or step near a window for one slow breath.',
  '🤲 Five-finger reset\n\nTrace one hand with the finger of the other: breathe in as you move up, out as you move down.',
  '🔕 Noise reset\n\nTurn down one source of noise or notification for five quiet minutes.',
  '💬 Name it gently\n\nTry naming the feeling without judging it: “I notice I am feeling ____.”'
];

const singleChoicePolls = [
  [
    'What would feel most supportive right now?',
    ['Someone to listen', 'Quiet time', 'Practical ideas', 'A gentle distraction']
  ],
  ['How is your energy today?', ['Very low', 'A little low', 'Steady', 'High']],
  [
    'What is taking the most space in your mind?',
    ['Work or study', 'Relationships', 'Health', 'The future']
  ],
  [
    'Which kind of group activity would you join?',
    ['A voice circle', 'A guided check-in', 'A wellbeing discussion', 'A quiet listening space']
  ],
  [
    'What helps you reset after a hard day?',
    ['Sleep or rest', 'Talking', 'Music or movement', 'Time alone']
  ],
  ['When do you most need emotional support?', ['Morning', 'Afternoon', 'Evening', 'Late night']],
  ['What would you like more of this week?', ['Calm', 'Connection', 'Motivation', 'Clarity']],
  [
    'How comfortable are you asking for help?',
    ['Not yet', 'A little', 'Usually', 'Very comfortable']
  ],
  [
    'Which topic should we discuss next?',
    ['Overthinking', 'Loneliness', 'Boundaries', 'Confidence']
  ],
  [
    'What kind of check-in feels easiest?',
    ['A poll', 'One word', 'A short message', 'Listening only']
  ],
  [
    'How does the group feel for you today?',
    ['Quiet', 'Comforting', 'Helpful', 'I am still settling in']
  ],
  [
    'What would make the next hour easier?',
    ['A break', 'A conversation', 'Some movement', 'A simple plan']
  ],
  [
    'Which time feels best for a voice circle?',
    ['Morning', 'Afternoon', 'Evening', 'Late evening']
  ],
  [
    'What is your preferred way to participate?',
    ['Reading quietly', 'Reacting', 'Writing a message', 'Joining voice']
  ],
  ['How full does your mind feel?', ['Very full', 'Somewhat full', 'Manageable', 'Clear today']],
  ['Which strength do you want more of?', ['Patience', 'Confidence', 'Focus', 'Self-kindness']],
  [
    'What is your current pace?',
    ['I need to slow down', 'Steady', 'I need a small push', 'I am taking it moment by moment']
  ],
  [
    'What would you rather receive from the group?',
    ['Encouragement', 'Listening', 'Practical ideas', 'Quiet company']
  ],
  ['How are you ending this day?', ['Tired', 'Hopeful', 'Mixed feelings', 'At peace']],
  [
    'What would help you return tomorrow?',
    ['A kind reminder', 'A new topic', 'A voice circle', 'No pressure at all']
  ]
] as const;

const multipleChoicePolls = [
  [
    'What helps you feel grounded? Choose any that fit.',
    ['Slow breathing', 'Music', 'A walk', 'Talking to someone']
  ],
  [
    'Which topics would you like more support around?',
    ['Sleep', 'Overthinking', 'Relationships', 'Motivation']
  ],
  [
    'What can make a group feel safer?',
    ['Kind replies', 'Privacy', 'No pressure to share', 'Clear boundaries']
  ],
  [
    'Which small resets work for you?',
    ['Water', 'Stretching', 'Quiet time', 'Writing things down']
  ],
  [
    'What kinds of posts would you enjoy here?',
    ['Questions', 'Polls', 'Calming exercises', 'Voice-circle reminders']
  ],
  ['Which feelings have visited lately?', ['Stress', 'Loneliness', 'Hope', 'Tiredness']],
  [
    'What support can be useful after a difficult day?',
    ['Rest', 'A gentle chat', 'Fresh air', 'A simple routine']
  ],
  [
    'Which ways do you recharge?',
    ['Being alone', 'Being with people', 'Creative time', 'Movement']
  ],
  [
    'What would help you stay connected to yourself?',
    ['A reminder', 'A check-in', 'A boundary', 'A small goal']
  ],
  [
    'Which qualities matter in a supportive reply?',
    ['Kindness', 'Patience', 'Honesty', 'No judgment']
  ],
  [
    'What might you make space for this week?',
    ['Sleep', 'Food and water', 'Connection', 'A quiet break']
  ],
  [
    'Which community activities appeal to you?',
    ['Open chat', 'Voice circle', 'Guided topic', 'Anonymous poll']
  ],
  [
    'What can make a hard conversation easier?',
    ['Time to think', 'Listening first', 'Clear words', 'Permission to pause']
  ],
  [
    'What would you like to practise more?',
    ['Saying no', 'Asking for help', 'Resting', 'Speaking kindly to myself']
  ],
  [
    'Which reminders feel useful?',
    ['I can go slowly', 'I am not alone', 'Small steps count', 'I can ask for support']
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
  ],
  [
    'What is a useful first step before replying to someone in distress?',
    ['Pause and read carefully', 'Send a long solution immediately', 'Change the subject'],
    0,
    'A short pause helps you respond with care instead of reacting quickly.'
  ],
  [
    'Which statement respects consent in a conversation?',
    ['Tell me every detail', 'Would you like to talk about it?', 'You have to explain yourself'],
    1,
    'Inviting someone to share gives them a real choice.'
  ],
  [
    'What can be a sign that it is time to take a break?',
    [
      'You feel more tense and less present',
      'You have all the answers',
      'You are perfectly focused'
    ],
    0,
    'A short pause can protect your energy and the quality of a conversation.'
  ],
  [
    'Which response is most likely to build trust?',
    ['I believe you', 'You should be over it by now', 'Why did you let that happen?'],
    0,
    'Believing someone and avoiding blame makes it easier to speak honestly.'
  ],
  [
    'What is a healthy way to handle a mistake?',
    ['Hide it forever', 'Notice it, repair what you can, and learn', 'Blame yourself all day'],
    1,
    'Repair and learning are more useful than shame.'
  ],
  [
    'What can help when emotions are intense?',
    [
      'Slow down before deciding',
      'Make every decision immediately',
      'Pretend nothing is happening'
    ],
    0,
    'Slowing down can create space between a feeling and an action.'
  ],
  [
    'Which is a respectful way to disagree?',
    ['I see it differently', 'You are always wrong', 'Nobody cares what you think'],
    0,
    'You can disagree without attacking the person.'
  ],
  [
    'What makes a check-in helpful?',
    ['Keeping it simple and optional', 'Demanding an answer', 'Comparing people'],
    0,
    'A check-in works best when people can respond at their own pace.'
  ],
  [
    'What is a supportive response to “I feel alone”?',
    [
      'You are not a burden; I am here with you',
      'Stop being dramatic',
      'You should not feel that way'
    ],
    0,
    'Reassurance and presence can make loneliness feel less isolating.'
  ],
  [
    'Before sharing someone else’s story, what should you do?',
    ['Ask permission', 'Post it quickly', 'Remove only their name'],
    0,
    'Permission is essential even when you think the story may help others.'
  ]
] as const;

const conversationStarters = [
  'What is one comfort you have discovered recently?',
  'What is a small ritual that helps you feel like yourself?',
  'What is something you wish people understood about quiet people?',
  'What does a peaceful evening look like to you?',
  'What is a simple thing that made you smile this week?',
  'What kind of encouragement stays with you?',
  'What is one way you protect your energy?',
  'What would you put on a “gentle day” playlist?',
  'What is a lesson you learned slowly?',
  'What makes a space feel welcoming to you?',
  'What is one thing you are looking forward to, however small?',
  'What helps you come back after a difficult moment?',
  'What would you tell your younger self today?',
  'What is a healthy habit you want to make easier?',
  'What is one word you want more of in your week?'
];

const anonymousSharingReminders = [
  '🩷 You can share anonymously\n\nIf something feels easier to say without your name, send it to @Hopehubconfessionbot. Every submission is reviewed before publication.',
  '🩷 A private way to share\n\nSome thoughts need a little distance. You can use @Hopehubconfessionbot and choose what feels safe to share.',
  '🩷 Your story, your pace\n\nAnonymous sharing is available through @Hopehubconfessionbot. Please avoid personal details that could identify you or someone else.',
  '🩷 No pressure to speak publicly\n\nIf public chat feels too much, @Hopehubconfessionbot offers a reviewed anonymous sharing option.',
  '🩷 A gentle reminder\n\nYou can keep your name out of a story. Send an anonymous reflection to @Hopehubconfessionbot when you are ready.',
  '🩷 Share safely\n\nAnonymous posts are reviewed first. Use @Hopehubconfessionbot and protect your own and others’ privacy.',
  '🩷 Quiet sharing is welcome\n\nYou do not have to explain everything in the group. @Hopehubconfessionbot is there for anonymous reflections.',
  '🩷 If you need words without an audience\n\nTry @Hopehubconfessionbot. Share only what feels right, and leave out identifying details.',
  '🩷 There is room for your voice\n\nAnonymous sharing through @Hopehubconfessionbot is optional, reviewed, and on your terms.',
  '🩷 You can be heard without being named\n\nUse @Hopehubconfessionbot for a private submission that is reviewed before anything is posted.'
];

const privateSupportReminders = [
  '💚 Private support is available\n\nIf you would rather talk one-to-one, visit https://hopehub.in/#live-connect when you feel ready.',
  '💚 Need a quieter space?\n\nYou can choose private support at https://hopehub.in/#live-connect. Go at your own pace.',
  '💚 You do not have to carry it alone\n\nA caring listener is available through private support: https://hopehub.in/#live-connect',
  '💚 Group chat is not the only option\n\nFor one-to-one support, open https://hopehub.in/#live-connect whenever it feels right.',
  '💚 Want to talk privately?\n\nVisit https://hopehub.in/#live-connect to connect in the way that feels most comfortable.',
  '💚 A reminder for hard moments\n\nPrivate support is available at https://hopehub.in/#live-connect. You can choose chat, voice, or video when comfortable.',
  '💚 Support can be simple\n\nIf you need someone to listen, start privately at https://hopehub.in/#live-connect.',
  '💚 Take the next small step\n\nWhen group chat is not enough, private support is here: https://hopehub.in/#live-connect',
  '💚 You deserve personal support too\n\nOpen https://hopehub.in/#live-connect for a private, caring conversation.',
  '💚 Reach out in your own way\n\nPrivate support is available at https://hopehub.in/#live-connect whenever you are ready.'
];

export const TELEGRAM_COMMUNITY_CONTENT_COUNTS = {
  quotes: quotes.length,
  openQuestions: prompts.length,
  anonymousSingleChoicePolls: singleChoicePolls.length,
  multipleAnswerPolls: multipleChoicePolls.length,
  wellbeingQuizzes: quizzes.length,
  calmingActivities: resets.length,
  conversationStarters: conversationStarters.length,
  anonymousSharingReminders: anonymousSharingReminders.length,
  privateSupportReminders: privateSupportReminders.length
} as const;

export const TELEGRAM_COMMUNITY_ENGAGEMENT_ITEMS = [
  ...quotes.map((text) => ({ kind: 'MESSAGE', text: `💙 A thought for today\n\n${text}` })),
  ...prompts.map((text) => ({
    kind: 'MESSAGE',
    text: `💬 Community prompt\n\n${text}\n\nShare only what feels comfortable.`
  })),
  ...resets.map((text) => ({ kind: 'MESSAGE', text })),
  ...singleChoicePolls.map(([pollQuestion, pollOptions]) => ({
    kind: 'POLL',
    pollQuestion,
    pollOptions: [...pollOptions],
    pollAnonymous: true,
    pollMultiple: false,
    pollQuiz: false,
    closeAfterMinutes: 720
  })),
  ...multipleChoicePolls.map(([pollQuestion, pollOptions]) => ({
    kind: 'POLL',
    pollQuestion,
    pollOptions: [...pollOptions],
    pollAnonymous: true,
    pollMultiple: true,
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
  })),
  ...conversationStarters.map((text) => ({
    kind: 'MESSAGE',
    text: `🗣️ Gentle conversation starter\n\n${text}\n\nReply only if you would like to.`
  })),
  ...anonymousSharingReminders.map((text) => ({ kind: 'MESSAGE', text })),
  ...privateSupportReminders.map((text) => ({ kind: 'MESSAGE', text }))
];
