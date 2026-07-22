import { LocalResource, ResourceType, CrisisType } from '../../models/crisis-support.model';

export const LOCAL_RESOURCES: LocalResource[] = [
    // Mental Health Centers - Major US Cities
    {
        id: 'nami-nyc',
        name: 'NAMI New York City Metro',
        type: ResourceType.IN_PERSON,
        description: 'National Alliance on Mental Illness chapter providing support groups, education, and advocacy',
        address: '1250 Broadway, Suite 4021, New York, NY 10001',
        phone: '212-684-3264',
        website: 'https://www.naminycmetro.org',
        email: 'info@naminycmetro.org',
        hours: 'Monday-Friday 9:00 AM - 5:00 PM',
        services: ['Support Groups', 'Education Programs', 'Peer Support', 'Family Support'],
        crisisTypes: [CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.GENERAL],
        cost: 'Free',
        insurance: false,
        walkInAvailable: false,
        appointmentRequired: true,
        city: 'New York',
        state: 'NY',
        country: 'United States',
        rating: 4.5
    },
    {
        id: 'crisis-center-la',
        name: 'Didi Hirsch Mental Health Services',
        type: ResourceType.IN_PERSON,
        description: 'Comprehensive mental health services including crisis intervention and suicide prevention',
        address: '4760 S Sepulveda Blvd, Culver City, CA 90230',
        phone: '310-751-5347',
        website: 'https://didihirsch.org',
        hours: '24/7 Crisis Line, Office Hours: Monday-Friday 8:00 AM - 5:00 PM',
        services: ['Crisis Intervention', 'Counseling', 'Suicide Prevention', 'Community Education'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.TRAUMA],
        cost: 'Sliding scale fees available',
        insurance: true,
        walkInAvailable: true,
        appointmentRequired: false,
        city: 'Los Angeles',
        state: 'CA',
        country: 'United States',
        rating: 4.7
    },

    // India Mental Health Resources
    {
        id: 'nimhans-bangalore',
        name: 'NIMHANS (National Institute of Mental Health and Neurosciences)',
        type: ResourceType.IN_PERSON,
        description: 'Premier mental health institute providing comprehensive psychiatric and neurological services',
        address: 'Hosur Road, Bangalore, Karnataka 560029',
        phone: '080-26995000',
        website: 'https://nimhans.ac.in',
        hours: 'Monday-Saturday 8:00 AM - 4:00 PM',
        services: ['Psychiatric Consultation', 'Emergency Services', 'Inpatient Care', 'Rehabilitation'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.TRAUMA],
        cost: 'Government rates, very affordable',
        insurance: true,
        walkInAvailable: true,
        appointmentRequired: true,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        rating: 4.8
    },
    {
        id: 'tiss-mumbai',
        name: 'TISS iCall Psychosocial Helpline',
        type: ResourceType.CHAT,
        description: 'Professional counseling and emotional support through phone and email',
        phone: '022-25521111',
        website: 'http://icallhelpline.org',
        email: 'icall@tiss.edu',
        hours: 'Monday-Saturday 8:00 AM - 10:00 PM',
        services: ['Telephone Counseling', 'Email Counseling', 'Crisis Intervention'],
        crisisTypes: [CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.GENERAL],
        cost: 'Free',
        insurance: false,
        walkInAvailable: false,
        appointmentRequired: false,
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        rating: 4.6
    },

    // Online Resources
    {
        id: 'betterhelp-online',
        name: 'BetterHelp',
        type: ResourceType.ONLINE,
        description: 'Online therapy platform connecting users with licensed therapists',
        website: 'https://www.betterhelp.com',
        hours: '24/7 messaging, scheduled video sessions',
        services: ['Individual Therapy', 'Couples Therapy', 'Teen Therapy', 'Crisis Support'],
        crisisTypes: [CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.TRAUMA, CrisisType.GENERAL],
        cost: '$60-90 per week',
        insurance: true,
        walkInAvailable: false,
        appointmentRequired: true,
        city: 'Online',
        state: 'N/A',
        country: 'International',
        rating: 4.2
    },
    {
        id: 'talkspace-online',
        name: 'Talkspace',
        type: ResourceType.ONLINE,
        description: 'Online therapy with licensed therapists via text, audio, and video',
        website: 'https://www.talkspace.com',
        hours: '24/7 messaging, scheduled sessions',
        services: ['Text Therapy', 'Video Therapy', 'Psychiatry', 'Teen Therapy'],
        crisisTypes: [CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.TRAUMA],
        cost: '$69-109 per week',
        insurance: true,
        walkInAvailable: false,
        appointmentRequired: true,
        city: 'Online',
        state: 'N/A',
        country: 'International',
        rating: 4.1
    },

    // Mobile Apps
    {
        id: 'calm-app',
        name: 'Calm',
        type: ResourceType.APP,
        description: 'Meditation and sleep app with anxiety and stress management tools',
        website: 'https://www.calm.com',
        hours: '24/7 access',
        services: ['Guided Meditation', 'Sleep Stories', 'Anxiety Programs', 'Breathing Exercises'],
        crisisTypes: [CrisisType.SEVERE_ANXIETY, CrisisType.PANIC_ATTACK, CrisisType.GENERAL],
        cost: 'Free with premium options ($69.99/year)',
        insurance: false,
        walkInAvailable: false,
        appointmentRequired: false,
        city: 'Mobile App',
        state: 'N/A',
        country: 'International',
        rating: 4.4
    },
    {
        id: 'headspace-app',
        name: 'Headspace',
        type: ResourceType.APP,
        description: 'Mindfulness and meditation app with mental health programs',
        website: 'https://www.headspace.com',
        hours: '24/7 access',
        services: ['Meditation', 'Mindfulness', 'Sleep Programs', 'Stress Management'],
        crisisTypes: [CrisisType.SEVERE_ANXIETY, CrisisType.DEPRESSION_CRISIS, CrisisType.GENERAL],
        cost: 'Free with premium options ($69.99/year)',
        insurance: false,
        walkInAvailable: false,
        appointmentRequired: false,
        city: 'Mobile App',
        state: 'N/A',
        country: 'International',
        rating: 4.3
    },

    // Community Centers
    {
        id: 'community-center-chicago',
        name: 'Chicago Department of Public Health - Mental Health Centers',
        type: ResourceType.IN_PERSON,
        description: 'City-funded mental health centers providing accessible care',
        phone: '312-747-1020',
        website: 'https://www.chicago.gov/city/en/depts/cdph/provdrs/mental_health.html',
        hours: 'Varies by location, typically Monday-Friday 8:00 AM - 5:00 PM',
        services: ['Individual Counseling', 'Group Therapy', 'Crisis Intervention', 'Case Management'],
        crisisTypes: [CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.GENERAL],
        cost: 'Free or low-cost based on income',
        insurance: true,
        walkInAvailable: true,
        appointmentRequired: true,
        city: 'Chicago',
        state: 'IL',
        country: 'United States',
        rating: 4.0
    },

    // University Counseling Centers
    {
        id: 'university-counseling',
        name: 'University Counseling Centers',
        type: ResourceType.IN_PERSON,
        description: 'Most universities offer free counseling services to students',
        hours: 'Varies by institution, often includes after-hours crisis support',
        services: ['Individual Counseling', 'Group Therapy', 'Crisis Intervention', 'Workshops'],
        crisisTypes: [CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.GENERAL],
        cost: 'Free for enrolled students',
        insurance: false,
        walkInAvailable: true,
        appointmentRequired: true,
        city: 'Various',
        state: 'Various',
        country: 'International',
        rating: 4.2
    }
];

// Helper functions
export function getLocalResourcesByCity(city: string): LocalResource[] {
    return LOCAL_RESOURCES.filter(resource =>
        resource.city.toLowerCase().includes(city.toLowerCase()) ||
        resource.city === 'Online' ||
        resource.city === 'Mobile App' ||
        resource.city === 'Various'
    );
}

export function getLocalResourcesByType(type: ResourceType): LocalResource[] {
    return LOCAL_RESOURCES.filter(resource => resource.type === type);
}

export function getLocalResourcesByCrisisType(crisisType: CrisisType): LocalResource[] {
    return LOCAL_RESOURCES.filter(resource =>
        resource.crisisTypes.includes(crisisType)
    );
}

export function getFreeLocalResources(): LocalResource[] {
    return LOCAL_RESOURCES.filter(resource =>
        resource.cost.toLowerCase().includes('free') ||
        resource.cost.toLowerCase().includes('no cost')
    );
}

export function getWalkInResources(): LocalResource[] {
    return LOCAL_RESOURCES.filter(resource => resource.walkInAvailable);
}

export function getOnlineResources(): LocalResource[] {
    return LOCAL_RESOURCES.filter(resource =>
        resource.type === ResourceType.ONLINE ||
        resource.type === ResourceType.APP ||
        resource.city === 'Online' ||
        resource.city === 'Mobile App'
    );
}