import { LifestyleTip, LifestyleTipType, LifestyleTipCategory, LifestyleTipDifficulty } from '../../models/lifestyle-tip.model';

export const SLEEP_TIPS: LifestyleTip[] = [
    {
        id: 'sleep-hygiene-basics',
        title: 'Essential Sleep Hygiene Practices',
        description: 'Fundamental habits to improve sleep quality and establish a healthy sleep routine.',
        type: LifestyleTipType.SLEEP,
        category: [LifestyleTipCategory.SLEEP, LifestyleTipCategory.ANXIETY, LifestyleTipCategory.STRESS],
        difficulty: LifestyleTipDifficulty.EASY,
        timeToImplement: '1-2 weeks',
        benefits: [
            'Improved sleep quality and duration',
            'Reduced time to fall asleep',
            'Better mood and energy levels',
            'Enhanced cognitive function',
            'Stronger immune system'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Set a consistent sleep schedule',
                timeframe: 'Go to bed and wake up at the same time daily',
                tip: 'Even on weekends - consistency is key'
            },
            {
                stepNumber: 2,
                action: 'Create a relaxing bedtime routine',
                timeframe: '30-60 minutes before bed',
                tip: 'Reading, gentle stretching, or meditation work well'
            },
            {
                stepNumber: 3,
                action: 'Optimize your sleep environment',
                tip: 'Cool (65-68°F), dark, and quiet room'
            },
            {
                stepNumber: 4,
                action: 'Avoid screens 1 hour before bedtime',
                tip: 'Blue light can interfere with melatonin production'
            },
            {
                stepNumber: 5,
                action: 'Limit caffeine after 2 PM',
                tip: 'Caffeine can stay in your system for 6-8 hours'
            },
            {
                stepNumber: 6,
                action: 'Get morning sunlight exposure',
                timeframe: '10-15 minutes within first hour of waking',
                tip: 'Helps regulate your circadian rhythm'
            }
        ],
        tips: [
            'If you can\'t fall asleep within 20 minutes, get up and do a quiet activity',
            'Keep your bedroom for sleep and intimacy only',
            'Consider blackout curtains or a sleep mask',
            'Use a white noise machine if needed'
        ],
        scientificBasis: 'Sleep hygiene practices are supported by extensive research showing their effectiveness in improving sleep quality and reducing insomnia symptoms.',
        commonMistakes: [
            'Trying to catch up on sleep by sleeping in on weekends',
            'Using bedroom for work or entertainment',
            'Drinking alcohol thinking it helps sleep (it actually disrupts sleep quality)',
            'Exercising too close to bedtime'
        ],
        progressTracking: [
            'Track sleep and wake times daily',
            'Rate sleep quality (1-10) each morning',
            'Note energy levels throughout the day',
            'Monitor time to fall asleep'
        ],
        tags: ['sleep', 'routine', 'hygiene', 'circadian-rhythm', 'easy']
    },

    {
        id: 'bedroom-optimization',
        title: 'Create the Perfect Sleep Environment',
        description: 'Transform your bedroom into a sleep sanctuary that promotes deep, restorative rest.',
        type: LifestyleTipType.ENVIRONMENT,
        category: [LifestyleTipCategory.SLEEP, LifestyleTipCategory.STRESS],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '1 week',
        benefits: [
            'Faster sleep onset',
            'Deeper, more restorative sleep',
            'Reduced sleep disruptions',
            'Better temperature regulation',
            'Enhanced relaxation response'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Control room temperature',
                tip: 'Keep bedroom between 65-68°F (18-20°C)'
            },
            {
                stepNumber: 2,
                action: 'Minimize light exposure',
                tip: 'Use blackout curtains, eye mask, or cover LED lights'
            },
            {
                stepNumber: 3,
                action: 'Reduce noise pollution',
                tip: 'Use earplugs, white noise machine, or soft background sounds'
            },
            {
                stepNumber: 4,
                action: 'Invest in comfortable bedding',
                tip: 'Quality mattress, pillows, and breathable sheets'
            },
            {
                stepNumber: 5,
                action: 'Remove electronic devices',
                tip: 'No TVs, phones, or tablets in the bedroom'
            },
            {
                stepNumber: 6,
                action: 'Add calming scents',
                tip: 'Lavender essential oil or pillow spray can promote relaxation'
            },
            {
                stepNumber: 7,
                action: 'Declutter the space',
                tip: 'A tidy room promotes a calm mind'
            }
        ],
        tips: [
            'Test different pillow heights to find what\'s most comfortable',
            'Consider a humidifier if air is dry',
            'Plants like snake plants can improve air quality',
            'Use a sunrise alarm clock for gentler wake-ups'
        ],
        scientificBasis: 'Environmental factors significantly impact sleep quality, with temperature, light, and noise being the most critical factors according to sleep research.',
        commonMistakes: [
            'Room too warm or too cold',
            'Ignoring partner\'s sleep needs',
            'Using bedroom as office or entertainment space',
            'Cheap, uncomfortable bedding'
        ],
        progressTracking: [
            'Monitor room temperature nightly',
            'Track sleep disruptions',
            'Rate comfort level of sleep environment',
            'Note any environmental changes and their effects'
        ],
        relatedTips: ['sleep-hygiene-basics'],
        tags: ['sleep', 'environment', 'bedroom', 'comfort', 'moderate']
    },

    {
        id: 'natural-sleep-aids',
        title: 'Natural Sleep Aids and Supplements',
        description: 'Safe, natural approaches to improve sleep quality without prescription medications.',
        type: LifestyleTipType.NUTRITION,
        category: [LifestyleTipCategory.SLEEP, LifestyleTipCategory.ANXIETY],
        difficulty: LifestyleTipDifficulty.EASY,
        timeToImplement: '3-7 days',
        benefits: [
            'Improved sleep onset',
            'Better sleep quality',
            'Reduced anxiety before bed',
            'Natural melatonin support',
            'Fewer side effects than medications'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Try herbal teas before bed',
                timeframe: '30-60 minutes before sleep',
                tip: 'Chamomile, passionflower, or valerian root tea'
            },
            {
                stepNumber: 2,
                action: 'Consider magnesium supplementation',
                tip: 'Start with 200-400mg, 1-2 hours before bed'
            },
            {
                stepNumber: 3,
                action: 'Use melatonin strategically',
                timeframe: '30 minutes before desired sleep time',
                tip: 'Start with lowest dose (0.5-1mg), increase if needed'
            },
            {
                stepNumber: 4,
                action: 'Try tart cherry juice',
                timeframe: '1 hour before bed',
                tip: 'Natural source of melatonin'
            },
            {
                stepNumber: 5,
                action: 'Practice aromatherapy',
                tip: 'Lavender essential oil on pillow or diffuser'
            },
            {
                stepNumber: 6,
                action: 'Avoid large meals before bed',
                timeframe: '3 hours before sleep',
                tip: 'Light snack with tryptophan is okay (turkey, milk, banana)'
            }
        ],
        tips: [
            'Consult healthcare provider before starting supplements',
            'Start with one aid at a time to assess effectiveness',
            'Quality matters - choose reputable brands',
            'Natural doesn\'t always mean safe for everyone'
        ],
        scientificBasis: 'Research supports the effectiveness of certain natural sleep aids, particularly melatonin, magnesium, and chamomile for improving sleep quality.',
        commonMistakes: [
            'Taking too much melatonin (more isn\'t better)',
            'Using supplements inconsistently',
            'Not giving natural aids enough time to work',
            'Combining too many aids at once'
        ],
        progressTracking: [
            'Track which aids you use each night',
            'Rate sleep quality and time to fall asleep',
            'Note any side effects or morning grogginess',
            'Monitor effectiveness over time'
        ],
        relatedTips: ['sleep-hygiene-basics', 'bedroom-optimization'],
        tags: ['sleep', 'natural', 'supplements', 'herbal', 'easy']
    }
];