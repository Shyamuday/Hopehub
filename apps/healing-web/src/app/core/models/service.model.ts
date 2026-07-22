export interface Service {
    id: string;
    name: string;
    description: string;
    detailedDescription: string;
    benefits: string[];
    approach: string;
    pricing?: PricingInfo;
    category: ServiceCategory;
    featured: boolean;
    imageUrl?: string;
}

export interface PricingInfo {
    individual?: number;
    couples?: number;
    group?: number;
    currency: string;
}

export enum ServiceCategory {
    RELATIONSHIP = 'relationship',
    CAREER = 'career',
    MENTAL_HEALTH = 'mental-health',
    ADDICTION = 'addiction',
    FAMILY = 'family'
}