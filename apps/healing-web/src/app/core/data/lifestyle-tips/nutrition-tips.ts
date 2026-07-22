import { LifestyleTip, LifestyleTipType, LifestyleTipCategory, LifestyleTipDifficulty } from '../../models/lifestyle-tip.model';

export const NUTRITION_TIPS: LifestyleTip[] = [
    {
        id: 'mood-boosting-foods',
        title: 'Foods That Naturally Boost Mood',
        description: 'Incorporate specific nutrients and foods that support brain health and emotional well-being.',
        type: LifestyleTipType.NUTRITION,
        category: [LifestyleTipCategory.DEPRESSION, LifestyleTipCategory.ANXIETY, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.EASY,
        timeToImplement: '1-2 weeks',
        benefits: [
            'Improved mood stability',
            'Better energy levels',
            'Enhanced cognitive function',
            'Reduced inflammation',
            'Better stress resilience'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Include omega-3 rich foods daily',
                tip: 'Fatty fish (salmon, sardines), walnuts, flaxseeds, chia seeds'
            },
            {
                stepNumber: 2,
                action: 'Eat complex carbohydrates',
                tip: 'Oats, quinoa, sweet potatoes, brown rice for steady blood sugar'
            },
            {
                stepNumber: 3,
                action: 'Add fermented foods for gut health',
                tip: 'Yogurt, kefir, sauerkraut, kimchi support the gut-brain connection'
            },
            {
                stepNumber: 4,
                action: 'Include dark leafy greens',
                tip: 'Spinach, kale, Swiss chard are rich in folate and magnesium'
            },
            {
                stepNumber: 5,
                action: 'Snack on nuts and seeds',
                tip: 'Almonds, pumpkin seeds, sunflower seeds provide healthy fats and protein'
            },
            {
                stepNumber: 6,
                action: 'Choose dark chocolate (70%+ cacao)',
                tip: 'Contains compounds that can boost mood and reduce stress'
            },
            {
                stepNumber: 7,
                action: 'Stay hydrated with water',
                tip: 'Dehydration can negatively affect mood and energy'
            }
        ],
        tips: [
            'Aim for a colorful plate - variety ensures diverse nutrients',
            'Meal prep to make healthy choices easier',
            'Don\'t eliminate entire food groups without medical reason',
            'Focus on adding good foods rather than restricting'
        ],
        scientificBasis: 'Research shows strong connections between nutrition and mental health, with omega-3s, B vitamins, and gut health playing crucial roles in mood regulation.',
        commonMistakes: [
            'Expecting immediate results (nutrition changes take time)',
            'All-or-nothing approach to diet changes',
            'Ignoring individual food sensitivities',
            'Focusing only on supplements instead of whole foods'
        ],
        progressTracking: [
            'Keep a food and mood diary',
            'Track energy levels throughout the day',
            'Monitor sleep quality changes',
            'Note any digestive improvements'
        ],
        tags: ['nutrition', 'mood', 'brain-health', 'omega-3', 'easy']
    },

    {
        id: 'stress-eating-management',
        title: 'Managing Stress and Emotional Eating',
        description: 'Develop healthy relationships with food and break the cycle of stress-induced eating patterns.',
        type: LifestyleTipType.HABITS,
        category: [LifestyleTipCategory.STRESS, LifestyleTipCategory.ANXIETY, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.MODERATE,
        timeToImplement: '2-4 weeks',
        benefits: [
            'Better emotional regulation',
            'Improved relationship with food',
            'Reduced guilt around eating',
            'Better stress management',
            'More stable energy levels'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Identify your eating triggers',
                tip: 'Keep a journal noting emotions before eating'
            },
            {
                stepNumber: 2,
                action: 'Practice the HALT check',
                tip: 'Before eating, ask: Am I Hungry, Angry, Lonely, or Tired?'
            },
            {
                stepNumber: 3,
                action: 'Create a stress-response toolkit',
                tip: 'List 5-10 non-food activities for stress relief'
            },
            {
                stepNumber: 4,
                action: 'Plan regular, balanced meals',
                tip: 'Prevents extreme hunger that leads to poor choices'
            },
            {
                stepNumber: 5,
                action: 'Practice mindful eating',
                timeframe: 'Eat without distractions for at least one meal daily',
                tip: 'Focus on taste, texture, and hunger/fullness cues'
            },
            {
                stepNumber: 6,
                action: 'Stock healthy stress-snacks',
                tip: 'Nuts, fruits, vegetables with hummus instead of processed foods'
            },
            {
                stepNumber: 7,
                action: 'Address underlying stress',
                tip: 'Use stress management techniques, not just food restriction'
            }
        ],
        tips: [
            'Don\'t label foods as "good" or "bad" - this creates guilt',
            'Allow yourself treats in moderation to prevent binge cycles',
            'Find non-food ways to celebrate and comfort yourself',
            'Be patient - changing eating patterns takes time'
        ],
        scientificBasis: 'Stress eating is driven by cortisol and emotional regulation patterns. Mindful eating and stress management techniques are proven effective for breaking these cycles.',
        commonMistakes: [
            'Trying to eliminate all comfort foods completely',
            'Not addressing the underlying stress or emotions',
            'Expecting perfect eating habits immediately',
            'Using shame or guilt as motivation'
        ],
        progressTracking: [
            'Track stress levels and eating patterns',
            'Note successful use of alternative coping strategies',
            'Monitor emotional awareness around food',
            'Record progress in mindful eating practice'
        ],
        relatedTips: ['mood-boosting-foods'],
        tags: ['stress-eating', 'emotional-eating', 'mindful-eating', 'habits', 'moderate']
    },

    {
        id: 'meal-timing-energy',
        title: 'Optimize Meal Timing for Stable Energy',
        description: 'Learn how to time your meals and snacks to maintain steady energy and mood throughout the day.',
        type: LifestyleTipType.NUTRITION,
        category: [LifestyleTipCategory.DEPRESSION, LifestyleTipCategory.STRESS, LifestyleTipCategory.GENERAL_WELLBEING],
        difficulty: LifestyleTipDifficulty.EASY,
        timeToImplement: '1 week',
        benefits: [
            'Stable blood sugar levels',
            'Consistent energy throughout day',
            'Better mood regulation',
            'Improved focus and concentration',
            'Reduced afternoon energy crashes'
        ],
        steps: [
            {
                stepNumber: 1,
                action: 'Eat breakfast within 1-2 hours of waking',
                tip: 'Include protein and complex carbs to start the day right'
            },
            {
                stepNumber: 2,
                action: 'Space meals 3-4 hours apart',
                tip: 'This prevents blood sugar spikes and crashes'
            },
            {
                stepNumber: 3,
                action: 'Include protein with each meal',
                tip: 'Helps maintain steady blood sugar and satiety'
            },
            {
                stepNumber: 4,
                action: 'Plan healthy snacks if needed',
                timeframe: 'Between meals if more than 4 hours apart',
                tip: 'Combine protein with complex carbs (apple with almond butter)'
            },
            {
                stepNumber: 5,
                action: 'Eat your largest meal when most active',
                tip: 'Usually lunch or early dinner for most people'
            },
            {
                stepNumber: 6,
                action: 'Finish eating 2-3 hours before bed',
                tip: 'Allows proper digestion and better sleep'
            }
        ],
        tips: [
            'Listen to your body - some people do better with smaller, frequent meals',
            'Prep meals and snacks in advance for busy days',
            'Don\'t skip meals - this leads to overeating later',
            'Adjust timing based on your work schedule and lifestyle'
        ],
        scientificBasis: 'Meal timing affects circadian rhythms, blood sugar stability, and metabolic health, all of which impact mood and energy levels.',
        commonMistakes: [
            'Skipping breakfast thinking it saves calories',
            'Going too long between meals',
            'Eating largest meal late at night',
            'Not planning for busy days'
        ],
        progressTracking: [
            'Track energy levels at different times of day',
            'Monitor hunger and fullness cues',
            'Note mood changes related to meal timing',
            'Record sleep quality changes'
        ],
        relatedTips: ['mood-boosting-foods', 'stress-eating-management'],
        tags: ['meal-timing', 'energy', 'blood-sugar', 'routine', 'easy']
    }
];