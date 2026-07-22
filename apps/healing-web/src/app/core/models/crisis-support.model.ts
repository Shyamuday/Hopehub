export enum CrisisType {
    SUICIDE = 'Suicidal Thoughts',
    SELF_HARM = 'Self-Harm',
    PANIC_ATTACK = 'Panic Attack',
    SEVERE_ANXIETY = 'Severe Anxiety',
    DEPRESSION_CRISIS = 'Depression Crisis',
    TRAUMA = 'Trauma/PTSD',
    SUBSTANCE_ABUSE = 'Substance Abuse',
    DOMESTIC_VIOLENCE = 'Domestic Violence',
    GENERAL = 'General Crisis'
}

export enum ResourceType {
    HOTLINE = 'Hotline',
    CHAT = 'Chat',
    TEXT = 'Text',
    IN_PERSON = 'In-Person',
    ONLINE = 'Online',
    APP = 'App'
}

export interface EmergencyContact {
    id: string;
    name: string;
    description: string;
    phone: string;
    alternatePhone?: string;
    website?: string;
    chatUrl?: string;
    textNumber?: string;
    availability: string;
    languages: string[];
    crisisTypes: CrisisType[];
    country: string;
    region?: string;
    isPrimary: boolean;
    isInternational: boolean;
}

export interface LocalResource {
    id: string;
    name: string;
    type: ResourceType;
    description: string;
    address?: string;
    phone?: string;
    website?: string;
    email?: string;
    hours: string;
    services: string[];
    crisisTypes: CrisisType[];
    cost: string;
    insurance: boolean;
    walkInAvailable: boolean;
    appointmentRequired: boolean;
    city: string;
    state: string;
    country: string;
    rating?: number;
}

export interface SafetyPlanStep {
    stepNumber: number;
    title: string;
    description: string;
    prompts: string[];
    examples?: string[];
}

export interface SafetyPlan {
    id?: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
    warningSignsPersonal: string[];
    copingStrategies: string[];
    socialDistractions: {
        people: string[];
        places: string[];
        activities: string[];
    };
    supportContacts: {
        name: string;
        relationship: string;
        phone: string;
        canCallAnytime: boolean;
    }[];
    professionalContacts: {
        name: string;
        role: string;
        phone: string;
        address?: string;
    }[];
    environmentSafety: {
        itemsToRemove: string[];
        safeLocations: string[];
        completed: boolean;
    };
    reasonsForLiving: string[];
    emergencyContacts: string[]; // IDs of emergency contacts
}

export interface CrisisResource {
    id: string;
    title: string;
    description: string;
    type: 'article' | 'video' | 'audio' | 'exercise';
    content?: string;
    url?: string;
    duration?: string;
    crisisTypes: CrisisType[];
    immediateHelp: boolean;
}

export interface CrisisCheckIn {
    id: string;
    timestamp: Date;
    crisisLevel: number; // 1-10
    crisisType: CrisisType;
    symptoms: string[];
    actionsTaken: string[];
    helpfulResources: string[];
    needsFollowUp: boolean;
}