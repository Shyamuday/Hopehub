import { EmergencyContact, CrisisType } from '../../models/crisis-support.model';

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
    // International Crisis Lines
    {
        id: 'suicide-prevention-lifeline',
        name: 'National Suicide Prevention Lifeline',
        description: '24/7 free and confidential support for people in distress and prevention resources',
        phone: '988',
        alternatePhone: '1-800-273-8255',
        website: 'https://suicidepreventionlifeline.org',
        chatUrl: 'https://suicidepreventionlifeline.org/chat',
        textNumber: '741741',
        availability: '24/7',
        languages: ['English', 'Spanish'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.GENERAL],
        country: 'United States',
        isPrimary: true,
        isInternational: false
    },
    {
        id: 'crisis-text-line',
        name: 'Crisis Text Line',
        description: 'Free 24/7 support via text message for people in crisis',
        phone: '',
        textNumber: '741741',
        website: 'https://www.crisistextline.org',
        availability: '24/7',
        languages: ['English', 'Spanish'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.SELF_HARM, CrisisType.SEVERE_ANXIETY, CrisisType.DEPRESSION_CRISIS],
        country: 'United States',
        isPrimary: true,
        isInternational: false
    },
    {
        id: 'samhsa-helpline',
        name: 'SAMHSA National Helpline',
        description: 'Treatment referral and information service for mental health and substance use disorders',
        phone: '1-800-662-4357',
        website: 'https://www.samhsa.gov/find-help/national-helpline',
        availability: '24/7',
        languages: ['English', 'Spanish'],
        crisisTypes: [CrisisType.SUBSTANCE_ABUSE, CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY],
        country: 'United States',
        isPrimary: false,
        isInternational: false
    },

    // India Crisis Lines
    {
        id: 'aasra-india',
        name: 'AASRA (India)',
        description: 'Suicide prevention helpline providing emotional support',
        phone: '+91-9820466726',
        alternatePhone: '022-27546669',
        website: 'http://www.aasra.info',
        availability: '24/7',
        languages: ['English', 'Hindi', 'Marathi'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.GENERAL],
        country: 'India',
        isPrimary: true,
        isInternational: false
    },
    {
        id: 'sneha-india',
        name: 'Sneha Foundation',
        description: 'Suicide prevention center providing emotional support and counseling',
        phone: '044-24640050',
        website: 'http://www.snehaindia.org',
        availability: '24/7',
        languages: ['English', 'Tamil', 'Hindi'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.TRAUMA],
        country: 'India',
        region: 'Chennai',
        isPrimary: true,
        isInternational: false
    },
    {
        id: 'vandrevala-foundation',
        name: 'Vandrevala Foundation',
        description: 'Mental health helpline providing free counseling and support',
        phone: '1860-2662-345',
        alternatePhone: '1800-2333-330',
        website: 'https://www.vandrevalafoundation.com',
        availability: '24/7',
        languages: ['English', 'Hindi', 'Bengali', 'Gujarati', 'Marathi', 'Tamil', 'Telugu'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.SEVERE_ANXIETY, CrisisType.TRAUMA],
        country: 'India',
        isPrimary: true,
        isInternational: false
    },

    // UK Crisis Lines
    {
        id: 'samaritans-uk',
        name: 'Samaritans',
        description: 'Free support for anyone in emotional distress, struggling to cope, or at risk of suicide',
        phone: '116 123',
        website: 'https://www.samaritans.org',
        availability: '24/7',
        languages: ['English'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.GENERAL],
        country: 'United Kingdom',
        isPrimary: true,
        isInternational: false
    },

    // Canada Crisis Lines
    {
        id: 'talk-suicide-canada',
        name: 'Talk Suicide Canada',
        description: 'National suicide prevention service available 24/7',
        phone: '1-833-456-4566',
        website: 'https://talksuicide.ca',
        availability: '24/7',
        languages: ['English', 'French'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS],
        country: 'Canada',
        isPrimary: true,
        isInternational: false
    },

    // Australia Crisis Lines
    {
        id: 'lifeline-australia',
        name: 'Lifeline Australia',
        description: '24-hour crisis support and suicide prevention services',
        phone: '13 11 14',
        website: 'https://www.lifeline.org.au',
        chatUrl: 'https://www.lifeline.org.au/crisis-chat',
        availability: '24/7',
        languages: ['English'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.GENERAL],
        country: 'Australia',
        isPrimary: true,
        isInternational: false
    },

    // Specialized Crisis Lines
    {
        id: 'domestic-violence-hotline',
        name: 'National Domestic Violence Hotline',
        description: '24/7 confidential support for domestic violence survivors',
        phone: '1-800-799-7233',
        website: 'https://www.thehotline.org',
        chatUrl: 'https://www.thehotline.org/get-help/domestic-violence-chat',
        availability: '24/7',
        languages: ['English', 'Spanish', '200+ languages via interpretation'],
        crisisTypes: [CrisisType.DOMESTIC_VIOLENCE, CrisisType.TRAUMA],
        country: 'United States',
        isPrimary: false,
        isInternational: false
    },
    {
        id: 'rainn-hotline',
        name: 'RAINN National Sexual Assault Hotline',
        description: 'Free, confidential support for survivors of sexual assault',
        phone: '1-800-656-4673',
        website: 'https://www.rainn.org',
        chatUrl: 'https://hotline.rainn.org/online',
        availability: '24/7',
        languages: ['English', 'Spanish'],
        crisisTypes: [CrisisType.TRAUMA, CrisisType.DOMESTIC_VIOLENCE],
        country: 'United States',
        isPrimary: false,
        isInternational: false
    },
    {
        id: 'trans-lifeline',
        name: 'Trans Lifeline',
        description: 'Crisis hotline staffed by transgender people for transgender people',
        phone: '877-565-8860',
        website: 'https://translifeline.org',
        availability: '24/7',
        languages: ['English', 'Spanish'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS, CrisisType.GENERAL],
        country: 'United States',
        isPrimary: false,
        isInternational: false
    },

    // International Crisis Lines
    {
        id: 'international-association',
        name: 'International Association for Suicide Prevention',
        description: 'Global directory of crisis centers and helplines',
        phone: '',
        website: 'https://www.iasp.info/resources/Crisis_Centres',
        availability: 'Varies by location',
        languages: ['Multiple languages'],
        crisisTypes: [CrisisType.SUICIDE, CrisisType.DEPRESSION_CRISIS],
        country: 'International',
        isPrimary: false,
        isInternational: true
    }
];

// Helper functions
export function getEmergencyContactsByCountry(country: string): EmergencyContact[] {
    return EMERGENCY_CONTACTS.filter(contact =>
        contact.country.toLowerCase() === country.toLowerCase() || contact.isInternational
    );
}

export function getEmergencyContactsByCrisisType(crisisType: CrisisType): EmergencyContact[] {
    return EMERGENCY_CONTACTS.filter(contact =>
        contact.crisisTypes.includes(crisisType)
    );
}

export function getPrimaryEmergencyContacts(): EmergencyContact[] {
    return EMERGENCY_CONTACTS.filter(contact => contact.isPrimary);
}

export function getInternationalEmergencyContacts(): EmergencyContact[] {
    return EMERGENCY_CONTACTS.filter(contact => contact.isInternational);
}