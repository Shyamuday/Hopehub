export const LISTENER_TRAINING_VERSION = 'listener-training-v1-2026-08-07';

export const LISTENER_TRAINING_MODULES = [
  {
    title: '1. Start every session safely',
    points: [
      'Introduce yourself as an emotional support listener, not a therapist or emergency responder.',
      'Invite the user to share what feels heaviest right now.',
      'If the user mentions immediate danger, self-harm, abuse, or violence, move to escalation instead of ordinary listening.',
    ],
    example: {
      good: 'I’m here to listen and support you. What feels most difficult right now?',
      avoid: 'I can solve this for you. Tell me everything and I’ll fix it.',
    },
  },
  {
    title: '2. Listen before guiding',
    points: [
      'Reflect emotions before suggesting any step.',
      'Use short, warm replies so the user does not feel interrogated.',
      'Ask one open question at a time.',
    ],
    example: {
      good: 'That sounds exhausting. When did it start feeling this heavy?',
      avoid: 'You should just stop thinking about it and stay positive.',
    },
  },
  {
    title: '3. Keep boundaries clear',
    points: [
      'Never move users to personal phone, personal social media, or private payment links.',
      'Do not create romantic, financial, dependency, or friendship expectations.',
      'If a user asks for personal contact, gently redirect them to Hope Hub channels.',
    ],
    example: {
      good: 'For your safety and mine, I can only continue support through Hope Hub.',
      avoid: 'Message me personally later; I’ll help you outside the platform.',
    },
  },
  {
    title: '4. Know red flags',
    points: [
      'Escalate self-harm, harm to others, abuse, stalking, overdose, medical emergency, or child/minor safety concerns.',
      'Do not handle high-risk situations alone.',
      'Use calm wording and encourage emergency/local trusted support where needed.',
    ],
    example: {
      good: 'I’m concerned about your safety. Let’s involve immediate support now — emergency services, a trusted person nearby, or Hope Hub escalation.',
      avoid: 'Promise me you won’t tell anyone else. I’ll keep this secret.',
    },
  },
  {
    title: '5. Do not diagnose or prescribe',
    points: [
      'Do not label a user with depression, anxiety disorder, trauma disorder, or any diagnosis.',
      'Do not suggest medication, dosage, stopping medication, or medical treatment.',
      'You can suggest speaking with a qualified professional for clinical concerns.',
    ],
    example: {
      good: 'I can’t diagnose this, but it sounds worth discussing with a qualified professional.',
      avoid: 'This is definitely depression; you need this medicine.',
    },
  },
  {
    title: '6. Close with one safe next step',
    points: [
      'Summarize what you heard in simple language.',
      'Ask what small next step feels doable.',
      'If risk is present, close only after escalation or safety handoff is clear.',
    ],
    example: {
      good: 'Today we talked about feeling alone after the breakup. One gentle next step could be messaging a trusted friend or booking structured support.',
      avoid: 'Okay bye, good luck.',
    },
  },
];
