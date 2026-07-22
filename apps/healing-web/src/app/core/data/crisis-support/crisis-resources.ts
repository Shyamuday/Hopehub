import { CrisisResource, CrisisType } from '../../models/crisis-support.model';

export const CRISIS_RESOURCES: CrisisResource[] = [
    // Immediate Help Articles
    {
        id: 'immediate-safety-steps',
        title: 'Immediate Safety Steps When Having Suicidal Thoughts',
        description: 'Quick actions you can take right now to stay safe during a crisis',
        type: 'article',
        content: `
# Immediate Safety Steps

If you're having thoughts of suicide, these steps can help you stay safe right now:

## 1. Reach Out Immediately
- Call 988 (Suicide & Crisis Lifeline)
- Text "HELLO" to 741741 (Crisis Text Line)
- Call a trusted friend or family member
- Go to your nearest emergency room

## 2. Remove Means of Harm
- Put away any items that could be used for self-harm
- Ask someone to hold medications, sharp objects, or other items
- Go to a safe location with other people

## 3. Use Grounding Techniques
- Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste
- Hold ice cubes or splash cold water on your face
- Listen to calming music
- Practice deep breathing

## 4. Remember Your Reasons
- Think of people who care about you
- Remember your goals and dreams
- Consider pets or others who depend on you
- Recall times when you felt hopeful

## 5. Stay Connected
- Don't isolate yourself
- Stay with trusted friends or family
- Keep talking to crisis counselors
- Make a plan for ongoing support

Remember: These feelings are temporary. Help is available, and you deserve support.
    `,
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS],
        immediateHelp: true
    },
    {
        id: 'panic-attack-help',
        title: 'Managing a Panic Attack: Immediate Techniques',
        description: 'Step-by-step guide to cope with panic attacks as they happen',
        type: 'article',
        content: `
# Managing a Panic Attack

Panic attacks can feel overwhelming, but these techniques can help you through them:

## Recognize the Signs
- Racing heart, sweating, trembling
- Shortness of breath, chest pain
- Nausea, dizziness
- Fear of losing control or dying

## Immediate Techniques

### 1. Box Breathing
- Breathe in for 4 counts
- Hold for 4 counts
- Breathe out for 4 counts
- Hold for 4 counts
- Repeat until calm

### 2. 5-4-3-2-1 Grounding
- 5 things you can see
- 4 things you can touch
- 3 things you can hear
- 2 things you can smell
- 1 thing you can taste

### 3. Remind Yourself
- "This is a panic attack, not a heart attack"
- "This will pass in 10-20 minutes"
- "I am safe right now"
- "I have survived this before"

### 4. Physical Comfort
- Sit or lie down in a comfortable position
- Loosen tight clothing
- Use a cool cloth on your forehead
- Hold a comforting object

## After the Attack
- Rest and be gentle with yourself
- Drink water and eat something light
- Consider what triggered the attack
- Plan follow-up care with a professional

Remember: Panic attacks are not dangerous, even though they feel scary.
    `,
        crisisTypes: [CrisisType.PANIC_ATTACK, CrisisType.SEVERE_ANXIETY],
        immediateHelp: true
    },

    // Breathing Exercises
    {
        id: 'emergency-breathing',
        title: 'Emergency Breathing Techniques',
        description: 'Quick breathing exercises to use during acute anxiety or panic',
        type: 'exercise',
        content: `
# Emergency Breathing Techniques

## 4-7-8 Breathing (Instant Calm)
1. Exhale completely through your mouth
2. Close your mouth, inhale through nose for 4 counts
3. Hold your breath for 7 counts
4. Exhale through mouth for 8 counts
5. Repeat 3-4 times

## Box Breathing (Anxiety Relief)
1. Inhale for 4 counts
2. Hold for 4 counts
3. Exhale for 4 counts
4. Hold empty for 4 counts
5. Repeat for 2-5 minutes

## Belly Breathing (Grounding)
1. Place one hand on chest, one on belly
2. Breathe so only the belly hand moves
3. Inhale slowly through nose
4. Exhale slowly through mouth
5. Continue for 5-10 minutes

## Quick Reset (30 seconds)
1. Take 3 deep breaths
2. On each exhale, say "relax"
3. Drop your shoulders
4. Soften your face muscles
5. Feel your feet on the ground
    `,
        duration: '1-10 minutes',
        crisisTypes: [CrisisType.PANIC_ATTACK, CrisisType.SEVERE_ANXIETY],
        immediateHelp: true
    },

    // Audio Resources
    {
        id: 'guided-crisis-meditation',
        title: 'Guided Crisis Meditation',
        description: 'Calming guided meditation specifically for crisis moments',
        type: 'audio',
        url: 'https://example.com/crisis-meditation', // Would be actual audio file
        duration: '10 minutes',
        crisisTypes: [CrisisType.SEVERE_ANXIETY, CrisisType.PANIC_ATTACK, CrisisType.DEPRESSION_CRISIS],
        immediateHelp: true
    },

    // Video Resources
    {
        id: 'grounding-techniques-video',
        title: 'Grounding Techniques for Crisis Moments',
        description: 'Visual guide to grounding techniques you can do anywhere',
        type: 'video',
        url: 'https://example.com/grounding-video', // Would be actual video
        duration: '5 minutes',
        crisisTypes: [CrisisType.PANIC_ATTACK, CrisisType.SEVERE_ANXIETY, CrisisType.TRAUMA],
        immediateHelp: true
    },

    // Self-Harm Alternatives
    {
        id: 'self-harm-alternatives',
        title: 'Alternatives to Self-Harm',
        description: 'Healthy ways to cope with urges to self-harm',
        type: 'article',
        content: `
# Alternatives to Self-Harm

When you feel the urge to self-harm, try these alternatives:

## Physical Alternatives
- Hold ice cubes in your hands
- Take a very hot or cold shower
- Exercise intensely (run, do jumping jacks)
- Punch a pillow or scream into it
- Squeeze a stress ball very hard
- Snap a rubber band on your wrist

## Emotional Release
- Write angry letters (don't send them)
- Tear up paper or old magazines
- Cry as much as you need to
- Call a crisis line and talk
- Record voice memos of your feelings
- Draw or paint your emotions

## Distraction Techniques
- Watch funny videos or movies
- Play intense video games
- Do puzzles or brain teasers
- Clean or organize something
- Learn something new online
- Text or call a friend

## Soothing Activities
- Take a warm bath with nice scents
- Listen to calming music
- Pet an animal
- Use soft textures (blankets, stuffed animals)
- Practice gentle yoga or stretching
- Make yourself a warm drink

## Creative Expression
- Write poetry or stories
- Draw, paint, or sculpt
- Make music or sing
- Dance to your favorite songs
- Take photographs
- Start a creative project

Remember: The urge to self-harm will pass. You can get through this moment safely.
    `,
        crisisTypes: [CrisisType.SELF_HARM, CrisisType.DEPRESSION_CRISIS],
        immediateHelp: true
    },

    // Trauma Support
    {
        id: 'trauma-flashback-help',
        title: 'Coping with Trauma Flashbacks',
        description: 'Techniques to manage trauma flashbacks and dissociation',
        type: 'article',
        content: `
# Coping with Trauma Flashbacks

## Recognize You're Having a Flashback
- Remind yourself: "This is a flashback"
- Say: "I am safe now"
- Look around and notice where you are
- Remember what year it is

## Grounding Techniques
### 5-4-3-2-1 Method
- 5 things you can see
- 4 things you can touch
- 3 things you can hear
- 2 things you can smell
- 1 thing you can taste

### Physical Grounding
- Feel your feet on the floor
- Hold a cold object
- Splash cold water on your face
- Press your back against a wall
- Squeeze and release your muscles

## Breathing and Movement
- Take slow, deep breaths
- Move your body gently
- Stretch your arms and legs
- Walk around if possible
- Do gentle exercises

## Self-Soothing
- Wrap yourself in a soft blanket
- Hold a comforting object
- Listen to calming music
- Use pleasant scents
- Drink something warm

## After the Flashback
- Be gentle and patient with yourself
- Rest and recover
- Talk to someone you trust
- Write about the experience
- Consider professional support

Remember: Flashbacks are memories, not current reality. You survived then, and you're safe now.
    `,
        crisisTypes: [CrisisType.TRAUMA, CrisisType.DEPRESSION_CRISIS],
        immediateHelp: true
    },

    // Substance Abuse Crisis
    {
        id: 'substance-crisis-help',
        title: 'Substance Use Crisis Support',
        description: 'Immediate help for substance use emergencies and cravings',
        type: 'article',
        content: `
# Substance Use Crisis Support

## If Someone is Overdosing
- Call 911 immediately
- Stay with the person
- If they're unconscious, put them on their side
- Give rescue breathing if trained
- Use naloxone (Narcan) if available for opioids
- Don't leave them alone

## Managing Intense Cravings
### Immediate Actions
- Call your sponsor or support person
- Go to a safe place with other people
- Remove yourself from triggers
- Use the "urge surfing" technique
- Remember: cravings are temporary

### Urge Surfing
1. Notice the craving without acting
2. Observe how it feels in your body
3. Breathe through the sensation
4. Remind yourself it will pass
5. Wait it out - cravings peak and fade

### Distraction Techniques
- Call someone in recovery
- Go to a meeting (AA, NA, etc.)
- Exercise or go for a walk
- Take a shower or bath
- Do something creative
- Help someone else

## Emergency Contacts
- SAMHSA Helpline: 1-800-662-4357
- Crisis Text Line: Text HOME to 741741
- Local AA/NA hotlines
- Your sponsor or recovery coach
- Trusted friends in recovery

## Remember Your Why
- Think about your recovery goals
- Remember what you're working toward
- Consider the people who support you
- Recall how good sobriety feels
- Focus on tomorrow's possibilities

Recovery is a journey. One moment at a time, one day at a time.
    `,
        crisisTypes: [CrisisType.SUBSTANCE_ABUSE],
        immediateHelp: true
    }
];

// Helper functions
export function getImmediateHelpResources(): CrisisResource[] {
    return CRISIS_RESOURCES.filter(resource => resource.immediateHelp);
}

export function getCrisisResourcesByType(crisisType: CrisisType): CrisisResource[] {
    return CRISIS_RESOURCES.filter(resource =>
        resource.crisisTypes.includes(crisisType)
    );
}

export function getCrisisResourcesByFormat(type: 'article' | 'video' | 'audio' | 'exercise'): CrisisResource[] {
    return CRISIS_RESOURCES.filter(resource => resource.type === type);
}