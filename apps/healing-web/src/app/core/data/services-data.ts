import { CarouselService } from '../../shared/components/services-carousel/services-carousel.component';

/**
 * Featured Services Configuration
 * 
 * This file contains the configuration for the top 5 featured services
 * displayed in the homepage carousel. Update this data to modify:
 * - Service prices
 * - Consultant information
 * - Contact details
 * - Service descriptions
 */

export const FEATURED_SERVICES: CarouselService[] = [
    {
        id: '1',
        name: 'Breakup Counseling',
        description: 'Navigate the emotional challenges of relationship endings with professional support and personalized guidance for healing.',
        price: 2999,
        originalPrice: 4999,
        currency: 'INR',
        discount: 40,
        consultantName: 'Dr. Sarah Johnson',
        consultantPhone: '+91 98765 43210',
        duration: '60 minutes',
        image: '/assets/images/breakup-counseling.jpg',
        featured: true,
        bookingUrl: 'https://calendly.com/dr-sarah-johnson/breakup-counseling',
        badge: 'Most Popular'
    },
    {
        id: '2',
        name: 'Anxiety Therapy',
        description: 'Evidence-based treatment for anxiety disorders, panic attacks, and stress management using proven therapeutic approaches.',
        price: 3499,
        originalPrice: 5999,
        currency: 'INR',
        discount: 42,
        consultantName: 'Dr. Michael Chen',
        consultantPhone: '+91 87654 32109',
        duration: '50 minutes',
        image: '/assets/images/anxiety-therapy.jpg',
        featured: true,
        bookingUrl: 'https://calendly.com/dr-michael-chen/anxiety-therapy',
        badge: 'Expert Choice'
    },
    {
        id: '3',
        name: 'Career Counseling',
        description: 'Professional guidance for career transitions, workplace stress, and professional development with personalized strategies.',
        price: 2499,
        originalPrice: 3999,
        currency: 'INR',
        discount: 38,
        consultantName: 'Dr. Emily Rodriguez',
        consultantPhone: '+91 76543 21098',
        duration: '45 minutes',
        image: '/assets/images/career-counseling.jpg',
        featured: true,
        bookingUrl: 'https://calendly.com/dr-emily-rodriguez/career-counseling',
        badge: 'Best Value'
    },
    {
        id: '4',
        name: 'Depression Support',
        description: 'Compassionate care for depression, mood disorders, and emotional wellness with holistic treatment approaches.',
        price: 3499,
        originalPrice: 5999,
        currency: 'INR',
        discount: 42,
        consultantName: 'Dr. James Wilson',
        consultantPhone: '+91 65432 10987',
        duration: '60 minutes',
        image: '/assets/images/depression-support.jpg',
        featured: true,
        bookingUrl: 'https://calendly.com/dr-james-wilson/depression-support',
        badge: 'Highly Rated'
    },
    {
        id: '5',
        name: 'Relationship Counseling',
        description: 'Strengthen relationships through improved communication, conflict resolution, and deeper emotional connection.',
        price: 3999,
        originalPrice: 6999,
        currency: 'INR',
        discount: 43,
        consultantName: 'Dr. Lisa Thompson',
        consultantPhone: '+91 54321 09876',
        duration: '75 minutes',
        image: '/assets/images/relationship-counseling.jpg',
        featured: true,
        bookingUrl: 'https://calendly.com/dr-lisa-thompson/relationship-counseling',
        badge: 'Premium'
    }
];

/**
 * Consultant Information
 * 
 * Detailed information about each consultant for easy management
 */
export const CONSULTANTS = {
    'dr-sarah-johnson': {
        name: 'Dr. Sarah Johnson',
        title: 'Licensed Clinical Psychologist',
        specialties: ['Relationship Counseling', 'Breakup Recovery', 'Emotional Healing'],
        experience: '8 years',
        phone: '+1 (555) 123-4567',
        email: 'sarah.johnson@healinghub.com',
        bio: 'Dr. Sarah Johnson specializes in helping individuals navigate relationship challenges and emotional healing.',
        availability: 'Monday-Friday, 9 AM - 6 PM EST'
    },
    'dr-michael-chen': {
        name: 'Dr. Michael Chen',
        title: 'Licensed Therapist',
        specialties: ['Anxiety Disorders', 'Panic Attacks', 'Stress Management'],
        experience: '10 years',
        phone: '+1 (555) 234-5678',
        email: 'michael.chen@healinghub.com',
        bio: 'Dr. Michael Chen is an expert in anxiety treatment using evidence-based therapeutic approaches.',
        availability: 'Tuesday-Saturday, 10 AM - 7 PM EST'
    },
    'dr-emily-rodriguez': {
        name: 'Dr. Emily Rodriguez',
        title: 'Career Counselor & Life Coach',
        specialties: ['Career Transitions', 'Workplace Stress', 'Professional Development'],
        experience: '6 years',
        phone: '+1 (555) 345-6789',
        email: 'emily.rodriguez@healinghub.com',
        bio: 'Dr. Emily Rodriguez helps professionals navigate career challenges and achieve work-life balance.',
        availability: 'Monday-Thursday, 8 AM - 5 PM EST'
    },
    'dr-james-wilson': {
        name: 'Dr. James Wilson',
        title: 'Clinical Psychologist',
        specialties: ['Depression Treatment', 'Mood Disorders', 'Cognitive Behavioral Therapy'],
        experience: '12 years',
        phone: '+1 (555) 456-7890',
        email: 'james.wilson@healinghub.com',
        bio: 'Dr. James Wilson provides compassionate care for individuals dealing with depression and mood disorders.',
        availability: 'Monday-Friday, 11 AM - 8 PM EST'
    },
    'dr-lisa-thompson': {
        name: 'Dr. Lisa Thompson',
        title: 'Marriage & Family Therapist',
        specialties: ['Couples Therapy', 'Family Counseling', 'Communication Skills'],
        experience: '9 years',
        phone: '+1 (555) 567-8901',
        email: 'lisa.thompson@healinghub.com',
        bio: 'Dr. Lisa Thompson specializes in helping couples and families build stronger, healthier relationships.',
        availability: 'Wednesday-Sunday, 12 PM - 9 PM EST'
    }
};

/**
 * Pricing Configuration
 * 
 * Centralized pricing information for easy updates
 */
export const SERVICE_PRICING = {
    'breakup-counseling': {
        individual: 120,
        package3: 320, // 3 sessions
        package6: 600, // 6 sessions
        currency: 'USD'
    },
    'anxiety-therapy': {
        individual: 130,
        package3: 350,
        package6: 650,
        currency: 'USD'
    },
    'career-counseling': {
        individual: 110,
        package3: 300,
        package6: 550,
        currency: 'USD'
    },
    'depression-support': {
        individual: 130,
        package3: 350,
        package6: 650,
        currency: 'USD'
    },
    'relationship-counseling': {
        couples: 150,
        package3: 400,
        package6: 750,
        currency: 'USD'
    }
};

/**
 * Helper function to get featured services
 */
export function getFeaturedServices(): CarouselService[] {
    return FEATURED_SERVICES;
}

/**
 * Helper function to get consultant information
 */
export function getConsultant(consultantId: string) {
    return CONSULTANTS[consultantId as keyof typeof CONSULTANTS];
}

/**
 * Helper function to get service pricing
 */
export function getServicePricing(serviceId: string) {
    return SERVICE_PRICING[serviceId as keyof typeof SERVICE_PRICING];
}