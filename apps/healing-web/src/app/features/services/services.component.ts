import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Service, ServiceCategory } from '../../core/models';
import { ServiceCardComponent } from '../../shared/components';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [ServiceCardComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit {
  services = signal<Service[]>([]);

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadServices();
  }

  navigateToService(serviceId: string) {
    this.router.navigate(['/services', serviceId]);
  }

  private loadServices() {
    // Mock data for the 10 services mentioned in requirements
    this.services.set([
      {
        id: 'breakup-counseling',
        name: 'Breakup Counseling',
        description: 'Professional support to help you navigate the emotional challenges of relationship endings.',
        detailedDescription: 'Our breakup counseling service provides compassionate, professional support during one of life\'s most challenging transitions. We help you process emotions, develop coping strategies, and build resilience for moving forward.',
        benefits: [
          'Process grief and loss in a healthy way',
          'Develop emotional regulation skills',
          'Build self-esteem and confidence',
          'Learn healthy relationship patterns for the future'
        ],
        approach: 'We use evidence-based therapeutic approaches including Cognitive Behavioral Therapy (CBT) and Acceptance and Commitment Therapy (ACT) to help you heal and grow from your experience.',
        pricing: {
          individual: 120,
          currency: 'USD'
        },
        category: ServiceCategory.RELATIONSHIP,
        featured: true,
        imageUrl: '/assets/images/breakup-counseling.jpg'
      },
      {
        id: 'career-counseling',
        name: 'Career Counseling',
        description: 'Guidance and support for career transitions, job stress, and professional development.',
        detailedDescription: 'Navigate career challenges with professional guidance. Whether you\'re facing job stress, considering a career change, or seeking professional growth, our career counseling helps you find clarity and direction.',
        benefits: [
          'Identify career goals and values',
          'Develop job search strategies',
          'Manage workplace stress and burnout',
          'Build professional confidence'
        ],
        approach: 'Our career counseling combines assessment tools, goal-setting techniques, and practical strategies to help you achieve professional fulfillment.',
        pricing: {
          individual: 110,
          currency: 'USD'
        },
        category: ServiceCategory.CAREER,
        featured: true,
        imageUrl: '/assets/images/career-counseling.jpg'
      },
      {
        id: 'anxiety-therapy',
        name: 'Anxiety Therapy',
        description: 'Evidence-based treatment for anxiety disorders and stress management.',
        detailedDescription: 'Comprehensive anxiety treatment using proven therapeutic methods to help you manage symptoms and regain control of your life.',
        benefits: [
          'Learn anxiety management techniques',
          'Reduce physical symptoms of anxiety',
          'Develop coping strategies',
          'Improve quality of life'
        ],
        approach: 'We utilize Cognitive Behavioral Therapy (CBT), mindfulness techniques, and exposure therapy to effectively treat anxiety disorders.',
        pricing: {
          individual: 130,
          currency: 'USD'
        },
        category: ServiceCategory.MENTAL_HEALTH,
        featured: false,
        imageUrl: '/assets/images/anxiety-therapy.jpg'
      },
      {
        id: 'depression-support',
        name: 'Depression Support',
        description: 'Compassionate therapy for depression and mood disorders.',
        detailedDescription: 'Professional support for individuals experiencing depression, offering hope and practical tools for recovery.',
        benefits: [
          'Understand depression patterns',
          'Develop mood regulation skills',
          'Build support networks',
          'Create sustainable wellness plans'
        ],
        approach: 'Our depression treatment combines cognitive-behavioral techniques with mindfulness and behavioral activation strategies.',
        pricing: {
          individual: 130,
          currency: 'USD'
        },
        category: ServiceCategory.MENTAL_HEALTH,
        featured: false,
        imageUrl: '/assets/images/depression-support.jpg'
      },
      {
        id: 'relationship-counseling',
        name: 'Relationship Counseling',
        description: 'Couples therapy and relationship guidance for stronger connections.',
        detailedDescription: 'Strengthen your relationship with professional couples therapy focused on communication, trust, and emotional intimacy.',
        benefits: [
          'Improve communication skills',
          'Resolve conflicts constructively',
          'Rebuild trust and intimacy',
          'Strengthen emotional connection'
        ],
        approach: 'We use Emotionally Focused Therapy (EFT) and Gottman Method to help couples build lasting, fulfilling relationships.',
        pricing: {
          couples: 150,
          currency: 'USD'
        },
        category: ServiceCategory.RELATIONSHIP,
        featured: true,
        imageUrl: '/assets/images/relationship-counseling.jpg'
      },
      {
        id: 'stress-management',
        name: 'Stress Management',
        description: 'Learn effective techniques to manage and reduce stress in your daily life.',
        detailedDescription: 'Comprehensive stress management program teaching practical skills for handling life\'s pressures and maintaining mental wellness.',
        benefits: [
          'Identify stress triggers',
          'Learn relaxation techniques',
          'Develop healthy coping mechanisms',
          'Improve work-life balance'
        ],
        approach: 'Our stress management approach combines mindfulness, cognitive restructuring, and lifestyle modification techniques.',
        pricing: {
          individual: 100,
          group: 60,
          currency: 'USD'
        },
        category: ServiceCategory.MENTAL_HEALTH,
        featured: false,
        imageUrl: '/assets/images/stress-management.jpg'
      },
      {
        id: 'grief-counseling',
        name: 'Grief Counseling',
        description: 'Compassionate support through loss and bereavement.',
        detailedDescription: 'Professional grief counseling to help you navigate the complex emotions of loss and find a path toward healing.',
        benefits: [
          'Process grief in a healthy way',
          'Understand the grieving process',
          'Develop coping strategies',
          'Honor your loved one\'s memory'
        ],
        approach: 'We provide compassionate support using grief-specific therapeutic approaches to help you heal at your own pace.',
        pricing: {
          individual: 120,
          currency: 'USD'
        },
        category: ServiceCategory.MENTAL_HEALTH,
        featured: false,
        imageUrl: '/assets/images/grief-counseling.jpg'
      },
      {
        id: 'family-therapy',
        name: 'Family Therapy',
        description: 'Strengthen family bonds and improve communication dynamics.',
        detailedDescription: 'Family therapy sessions designed to improve communication, resolve conflicts, and strengthen family relationships.',
        benefits: [
          'Improve family communication',
          'Resolve family conflicts',
          'Strengthen family bonds',
          'Develop healthy boundaries'
        ],
        approach: 'We use systemic family therapy approaches to address family dynamics and promote healthy relationships.',
        pricing: {
          individual: 140,
          currency: 'USD'
        },
        category: ServiceCategory.FAMILY,
        featured: false,
        imageUrl: '/assets/images/family-therapy.jpg'
      },
      {
        id: 'addiction-support',
        name: 'Addiction Support',
        description: 'Professional support for addiction recovery and substance abuse.',
        detailedDescription: 'Comprehensive addiction support services to help you or your loved ones on the path to recovery.',
        benefits: [
          'Develop recovery strategies',
          'Build support networks',
          'Address underlying issues',
          'Prevent relapse'
        ],
        approach: 'Our addiction support combines evidence-based treatments with compassionate care to support long-term recovery.',
        pricing: {
          individual: 140,
          group: 80,
          currency: 'USD'
        },
        category: ServiceCategory.ADDICTION,
        featured: false,
        imageUrl: '/assets/images/addiction-support.jpg'
      },
      {
        id: 'self-esteem-coaching',
        name: 'Self-Esteem Coaching',
        description: 'Build confidence and develop a positive self-image.',
        detailedDescription: 'Personalized coaching to help you build self-confidence, overcome self-doubt, and develop a healthy relationship with yourself.',
        benefits: [
          'Build self-confidence',
          'Overcome negative self-talk',
          'Develop self-compassion',
          'Set and achieve personal goals'
        ],
        approach: 'Our self-esteem coaching uses positive psychology principles and cognitive techniques to help you build lasting confidence.',
        pricing: {
          individual: 110,
          currency: 'USD'
        },
        category: ServiceCategory.MENTAL_HEALTH,
        featured: false,
        imageUrl: '/assets/images/self-esteem-coaching.jpg'
      }
    ]);
  }
}