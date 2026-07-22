import { AssessmentConfig, AssessmentType, AssessmentCategory } from '../../models/assessment.model';

export const BREAKUP_ASSESSMENTS: AssessmentConfig[] = [
    // Comprehensive Breakup Recovery Assessment
    {
        id: 'breakup-recovery',
        type: AssessmentType.BREAKUP,
        category: AssessmentCategory.BREAKUP,
        title: 'Breakup Recovery Assessment',
        description: 'A comprehensive assessment to evaluate your emotional state, coping mechanisms, and recovery progress after a relationship breakup.',
        instructions: 'Please answer the following questions honestly about how you have been feeling and coping since your breakup. There are no right or wrong answers.',
        timeframe: 'Since the breakup',
        duration: '8-10 minutes',
        questions: [
            // Emotional State (1-6)
            { id: 1, text: 'How intense are your feelings of sadness about the breakup?', category: 'emotional-state', subcategory: 'sadness' },
            { id: 2, text: 'How often do you experience anger or resentment about the breakup?', category: 'emotional-state', subcategory: 'anger' },
            { id: 3, text: 'How much do you miss your ex-partner?', category: 'emotional-state', subcategory: 'longing' },
            { id: 4, text: 'How often do you feel anxious or worried about the future?', category: 'emotional-state', subcategory: 'anxiety' },
            { id: 5, text: 'How much do you blame yourself for the breakup?', category: 'emotional-state', subcategory: 'self-blame' },
            { id: 6, text: 'How often do you experience feelings of loneliness?', category: 'emotional-state', subcategory: 'loneliness' },
            
            // Grief Processing (7-12)
            { id: 7, text: 'How well have you been able to accept that the relationship is over?', category: 'grief-processing', subcategory: 'acceptance' },
            { id: 8, text: 'How often do you find yourself replaying memories of the relationship?', category: 'grief-processing', subcategory: 'rumination' },
            { id: 9, text: 'How much do you still hope for reconciliation?', category: 'grief-processing', subcategory: 'hope' },
            { id: 10, text: 'How well have you processed the loss of the relationship?', category: 'grief-processing', subcategory: 'processing' },
            { id: 11, text: 'How often do you think about "what could have been"?', category: 'grief-processing', subcategory: 'regret' },
            { id: 12, text: 'How much have you been able to let go of the past relationship?', category: 'grief-processing', subcategory: 'letting-go' },
            
            // Self-Esteem & Identity (13-18)
            { id: 13, text: 'How has the breakup affected your self-esteem?', category: 'self-esteem', subcategory: 'confidence' },
            { id: 14, text: 'How much do you question your self-worth because of the breakup?', category: 'self-esteem', subcategory: 'self-worth' },
            { id: 15, text: 'How well do you feel you know who you are outside of the relationship?', category: 'self-esteem', subcategory: 'identity' },
            { id: 16, text: 'How confident do you feel about yourself as a person?', category: 'self-esteem', subcategory: 'confidence' },
            { id: 17, text: 'How much do you feel you lost a part of yourself in the breakup?', category: 'self-esteem', subcategory: 'identity' },
            { id: 18, text: 'How well are you able to see positive qualities in yourself?', category: 'self-esteem', subcategory: 'self-perception' },
            
            // Coping Mechanisms (19-24)
            { id: 19, text: 'How well are you taking care of your physical health (sleep, exercise, nutrition)?', category: 'coping', subcategory: 'self-care' },
            { id: 20, text: 'How often do you engage in healthy activities that bring you joy?', category: 'coping', subcategory: 'positive-activities' },
            { id: 21, text: 'How much are you relying on unhealthy coping mechanisms (excessive drinking, isolation, etc.)?', category: 'coping', subcategory: 'unhealthy-coping' },
            { id: 22, text: 'How well are you managing your daily responsibilities?', category: 'coping', subcategory: 'functioning' },
            { id: 23, text: 'How often do you practice self-compassion and kindness toward yourself?', category: 'coping', subcategory: 'self-compassion' },
            { id: 24, text: 'How well are you able to maintain routines and structure in your life?', category: 'coping', subcategory: 'routine' },
            
            // Social Support (25-30)
            { id: 25, text: 'How much support do you feel you have from friends and family?', category: 'social-support', subcategory: 'support-network' },
            { id: 26, text: 'How comfortable are you talking about the breakup with others?', category: 'social-support', subcategory: 'communication' },
            { id: 27, text: 'How often do you spend time with supportive people?', category: 'social-support', subcategory: 'social-connection' },
            { id: 28, text: 'How isolated do you feel from others?', category: 'social-support', subcategory: 'isolation' },
            { id: 29, text: 'How well do you feel understood by those around you?', category: 'social-support', subcategory: 'understanding' },
            { id: 30, text: 'How much have you been able to maintain or rebuild your social connections?', category: 'social-support', subcategory: 'rebuilding' },
            
            // Future Outlook (31-36)
            { id: 31, text: 'How optimistic are you about your future?', category: 'future-outlook', subcategory: 'optimism' },
            { id: 32, text: 'How much do you believe you can find love again?', category: 'future-outlook', subcategory: 'hope-for-love' },
            { id: 33, text: 'How well are you able to envision a happy future for yourself?', category: 'future-outlook', subcategory: 'vision' },
            { id: 34, text: 'How much are you looking forward to new experiences and opportunities?', category: 'future-outlook', subcategory: 'excitement' },
            { id: 35, text: 'How well have you been able to learn and grow from this experience?', category: 'future-outlook', subcategory: 'growth' },
            { id: 36, text: 'How ready do you feel to move forward with your life?', category: 'future-outlook', subcategory: 'readiness' },
            
            // Contact & Boundaries (37-40)
            { id: 37, text: 'How well have you been able to maintain boundaries with your ex-partner?', category: 'boundaries', subcategory: 'contact' },
            { id: 38, text: 'How often do you check your ex-partner\'s social media or try to contact them?', category: 'boundaries', subcategory: 'contact' },
            { id: 39, text: 'How much do you still feel emotionally attached to your ex-partner?', category: 'boundaries', subcategory: 'attachment' },
            { id: 40, text: 'How well have you been able to create distance and space from the relationship?', category: 'boundaries', subcategory: 'distance' }
        ],
        responseOptions: [
            { value: 0, label: 'Not at all' },
            { value: 1, label: 'Slightly' },
            { value: 2, label: 'Moderately' },
            { value: 3, label: 'Quite a bit' },
            { value: 4, label: 'Extremely' }
        ],
        scoring: [
            {
                min: 0, max: 60,
                level: 'Strong Recovery Progress',
                color: 'green',
                description: 'You are showing strong signs of recovery and adaptation. You have processed the breakup well and are moving forward positively.',
                suggestions: [
                    'Continue maintaining healthy boundaries and self-care practices',
                    'Keep engaging in positive activities and social connections',
                    'Focus on personal growth and future goals',
                    'Consider helping others going through similar experiences',
                    'Celebrate your resilience and progress',
                    'Continue building your independent identity'
                ]
            },
            {
                min: 61, max: 100,
                level: 'Moderate Recovery Progress',
                color: 'yellow',
                description: 'You are making progress in your recovery, but there are still areas that need attention. You\'re on the right path but may benefit from additional support.',
                suggestions: [
                    'Continue working on self-care and healthy coping strategies',
                    'Strengthen your support network and social connections',
                    'Practice self-compassion and challenge negative self-talk',
                    'Consider individual counseling or support groups',
                    'Focus on one area of recovery at a time',
                    'Set small, achievable goals for moving forward',
                    'Limit contact with your ex-partner if needed',
                    'Engage in activities that rebuild your sense of self'
                ]
            },
            {
                min: 101, max: 130,
                level: 'Early Recovery Stage',
                color: 'orange',
                description: 'You are in the early stages of recovery. This is normal and expected after a breakup. You may need more time and support to process the loss.',
                suggestions: [
                    'Be patient with yourself - recovery takes time',
                    'Seek professional counseling or therapy',
                    'Join a breakup recovery support group',
                    'Focus on basic self-care (sleep, nutrition, exercise)',
                    'Limit or eliminate contact with your ex-partner',
                    'Surround yourself with supportive friends and family',
                    'Practice mindfulness and emotional regulation techniques',
                    'Consider reading books or resources on breakup recovery',
                    'Avoid making major life decisions right now',
                    'Allow yourself to grieve and feel your emotions'
                ]
            },
            {
                min: 131, max: 160,
                level: 'Intense Grief Stage',
                color: 'red',
                description: 'You are experiencing intense grief and distress. This is a difficult time, and professional support is highly recommended. You are not alone, and help is available.',
                suggestions: [
                    'Seek immediate professional counseling or therapy',
                    'Consider crisis support services if you\'re in distress',
                    'Reach out to trusted friends, family, or support groups',
                    'Prioritize your safety and well-being above all else',
                    'Avoid isolation - stay connected with supportive people',
                    'Consider medication evaluation if depression or anxiety are severe',
                    'Remove triggers (social media, photos, contact) temporarily',
                    'Focus on day-to-day survival and basic needs',
                    'Practice grounding techniques when overwhelmed',
                    'Consider inpatient or intensive outpatient treatment if needed',
                    'Remember that this intense pain will lessen with time and support'
                ]
            }
        ],
        disclaimer: 'This breakup recovery assessment is for educational and self-reflection purposes only. It is not a substitute for professional mental health treatment. If you are experiencing severe distress, thoughts of self-harm, or suicidal ideation, please seek immediate professional help. Breakup recovery is a process that takes time, and everyone heals at their own pace.',
        emergencyHelplines: [
            { name: 'Crisis Text Line', number: 'Text HOME to 741741' },
            { name: 'National Suicide Prevention Lifeline', number: '988' },
            { name: 'AASRA (India)', number: '91-9820466726' },
            { name: 'Sneha (India)', number: '044-24640050' },
            { name: 'International Association for Suicide Prevention', number: 'Find local helplines at iasp.info' }
        ],
        safetyQuestionIndex: 5, // Self-blame question as potential safety indicator
        references: [
            'Fisher, H. E. (2006). Broken heart: The nature and future of romantic love. Columbia University Press.',
            'Sbarra, D. A., & Emery, R. E. (2005). The emotional sequelae of nonmarital relationship dissolution: Analysis of change and intraindividual variability over time. Personal Relationships, 12(2), 213-232.',
            'Kübler-Ross, E., & Kessler, D. (2005). On grief and grieving: Finding the meaning of grief through the five stages of loss. Simon & Schuster.',
            'Winch, G. (2013). How to fix a broken heart. TED Books.'
        ]
    }
];

