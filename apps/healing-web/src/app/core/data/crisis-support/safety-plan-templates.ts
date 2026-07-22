import { SafetyPlanStep } from '../../models/crisis-support.model';

export const SAFETY_PLAN_STEPS: SafetyPlanStep[] = [
    {
        stepNumber: 1,
        title: 'Recognize Warning Signs',
        description: 'Identify thoughts, images, moods, situations, and behaviors that indicate a crisis may be developing.',
        prompts: [
            'What thoughts do you have when you start feeling suicidal?',
            'What images or memories come to mind?',
            'How does your mood change?',
            'What situations trigger these feelings?',
            'How does your behavior change?'
        ],
        examples: [
            'Thoughts: "I can\'t handle this anymore", "Everyone would be better off without me"',
            'Images: Visualizing methods of self-harm',
            'Moods: Feeling hopeless, empty, or overwhelmed',
            'Situations: Being alone, anniversaries, conflicts with others',
            'Behaviors: Isolating from others, sleeping too much or too little, using substances'
        ]
    },
    {
        stepNumber: 2,
        title: 'Internal Coping Strategies',
        description: 'List things you can do on your own, without contacting another person, to help you cope and stay safe.',
        prompts: [
            'What activities help you feel better when you\'re distressed?',
            'What relaxation techniques work for you?',
            'What positive self-talk helps?',
            'What physical activities help you cope?',
            'What creative activities are soothing?'
        ],
        examples: [
            'Listen to calming music or favorite songs',
            'Take a warm bath or shower',
            'Practice deep breathing or meditation',
            'Go for a walk or exercise',
            'Write in a journal',
            'Draw, paint, or do crafts',
            'Watch funny videos or movies',
            'Play with a pet',
            'Practice yoga or stretching'
        ]
    },
    {
        stepNumber: 3,
        title: 'Social Settings and People for Distraction',
        description: 'List people and social settings that provide distraction and support, where you do not need to talk about being suicidal.',
        prompts: [
            'Who can you spend time with when you need distraction?',
            'What places feel safe and comforting?',
            'What social activities help you feel better?',
            'Where can you go to be around people?',
            'What group activities do you enjoy?'
        ],
        examples: [
            'People: Close friends, family members, coworkers, neighbors',
            'Places: Coffee shops, libraries, parks, community centers, places of worship',
            'Activities: Going to movies, shopping, attending events, visiting friends',
            'Groups: Support groups, hobby clubs, fitness classes, volunteer activities'
        ]
    },
    {
        stepNumber: 4,
        title: 'People to Ask for Help',
        description: 'List people you can reach out to when you need support and can talk about your suicidal thoughts.',
        prompts: [
            'Who are the people you trust most?',
            'Who has been supportive in the past?',
            'Who would you feel comfortable talking to about your struggles?',
            'Who is usually available when you need them?',
            'Who listens without judgment?'
        ],
        examples: [
            'Family members who are supportive',
            'Close friends who understand mental health',
            'Trusted coworkers or mentors',
            'Religious or spiritual leaders',
            'Support group members',
            'Online community members'
        ]
    },
    {
        stepNumber: 5,
        title: 'Professional Contacts',
        description: 'List mental health professionals and agencies to contact during a crisis.',
        prompts: [
            'Who is your therapist or counselor?',
            'Who is your psychiatrist or doctor?',
            'What mental health agencies do you know?',
            'What crisis hotlines are available?',
            'What emergency services can you contact?'
        ],
        examples: [
            'Primary therapist or counselor',
            'Psychiatrist or primary care doctor',
            'Crisis hotline numbers',
            'Local emergency room',
            'Mobile crisis team',
            'Community mental health center',
            '911 or local emergency services'
        ]
    },
    {
        stepNumber: 6,
        title: 'Make the Environment Safe',
        description: 'Identify and remove or secure items that could be used for self-harm.',
        prompts: [
            'What items in your environment could be harmful?',
            'Who can help you remove or secure these items?',
            'Where can these items be stored safely?',
            'What alternative locations feel safer?',
            'Who can check on your environment regularly?'
        ],
        examples: [
            'Remove or secure: Medications, sharp objects, firearms, ropes/cords',
            'Ask trusted person to hold items temporarily',
            'Use medication lock boxes',
            'Stay with trusted friends or family',
            'Avoid isolated locations',
            'Create physical barriers to harmful items'
        ]
    }
];

export const SAFETY_PLAN_TEMPLATE = {
    title: 'My Safety Plan',
    subtitle: 'A plan to help me stay safe when I have thoughts of suicide',
    instructions: 'Fill out each step with specific, personal information. Keep this plan with you and share it with trusted people in your life.',
    steps: SAFETY_PLAN_STEPS,
    emergencyReminder: 'If you are in immediate danger, call 911 or go to your nearest emergency room.',
    additionalResources: [
        'National Suicide Prevention Lifeline: 988',
        'Crisis Text Line: Text HOME to 741741',
        'International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres'
    ]
};

// Helper functions for safety plan creation
export function createEmptySafetyPlan() {
    return {
        warningSignsPersonal: [],
        copingStrategies: [],
        socialDistractions: {
            people: [],
            places: [],
            activities: []
        },
        supportContacts: [],
        professionalContacts: [],
        environmentSafety: {
            itemsToRemove: [],
            safeLocations: [],
            completed: false
        },
        reasonsForLiving: [],
        emergencyContacts: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

export function getSafetyPlanPrompts(stepNumber: number): string[] {
    const step = SAFETY_PLAN_STEPS.find(s => s.stepNumber === stepNumber);
    return step ? step.prompts : [];
}

export function getSafetyPlanExamples(stepNumber: number): string[] {
    const step = SAFETY_PLAN_STEPS.find(s => s.stepNumber === stepNumber);
    return step ? step.examples || [] : [];
}