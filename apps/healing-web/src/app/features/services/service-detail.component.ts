import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Service, ServiceCategory } from '../../core/models';
import { ServiceInquiryComponent } from '../../shared/components';
import { SEOService } from '../../core/services';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [ServiceInquiryComponent],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.scss'
})
export class ServiceDetailComponent implements OnInit {
  service = signal<Service | null>(null);
  loading = signal(true);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seoService = inject(SEOService);

  constructor() {
    this.route.params
      .pipe(takeUntilDestroyed())
      .subscribe((params: any) => {
        const serviceId = params['id'];
        this.loadService(serviceId);
      });
  }

  ngOnInit() {
    // Component initialization if needed
  }

  goBack() {
    this.router.navigate(['/services']);
  }

  bookService() {
    // Navigate to contact form with service pre-selected
    this.router.navigate(['/contact'], {
      queryParams: { service: this.service()?.name }
    });
  }

  contactForInfo() {
    // Navigate to contact form with inquiry type
    this.router.navigate(['/contact'], {
      queryParams: {
        service: this.service()?.name,
        type: 'inquiry'
      }
    });
  }

  private loadService(serviceId: string) {
    this.loading.set(true);

    // Mock service data - in a real app, this would come from a service
    const services: Service[] = [
      {
        id: 'breakup-counseling',
        name: 'Breakup Counseling',
        description: 'Professional support to help you navigate the emotional challenges of relationship endings.',
        detailedDescription: 'Our breakup counseling service provides compassionate, professional support during one of life\'s most challenging transitions. We help you process emotions, develop coping strategies, and build resilience for moving forward. Our experienced therapists understand the unique pain of relationship loss and provide a safe space for healing.',
        benefits: [
          'Process grief and loss in a healthy way',
          'Develop emotional regulation skills',
          'Build self-esteem and confidence',
          'Learn healthy relationship patterns for the future',
          'Create closure and find meaning in the experience'
        ],
        approach: 'We use evidence-based therapeutic approaches including Cognitive Behavioral Therapy (CBT) and Acceptance and Commitment Therapy (ACT) to help you heal and grow from your experience. Our approach is tailored to your specific needs and healing timeline.',
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
        detailedDescription: 'Navigate career challenges with professional guidance. Whether you\'re facing job stress, considering a career change, or seeking professional growth, our career counseling helps you find clarity and direction. We work with professionals at all stages of their careers.',
        benefits: [
          'Identify career goals and values',
          'Develop job search strategies',
          'Manage workplace stress and burnout',
          'Build professional confidence',
          'Navigate career transitions successfully'
        ],
        approach: 'Our career counseling combines assessment tools, goal-setting techniques, and practical strategies to help you achieve professional fulfillment. We use a holistic approach that considers your personal values, strengths, and life circumstances.',
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
        detailedDescription: 'Comprehensive anxiety treatment using proven therapeutic methods to help you manage symptoms and regain control of your life. Our therapists specialize in various anxiety disorders including generalized anxiety, social anxiety, and panic disorder.',
        benefits: [
          'Learn anxiety management techniques',
          'Reduce physical symptoms of anxiety',
          'Develop coping strategies',
          'Improve quality of life',
          'Build confidence in challenging situations'
        ],
        approach: 'We utilize Cognitive Behavioral Therapy (CBT), mindfulness techniques, and exposure therapy to effectively treat anxiety disorders. Our treatment plans are personalized based on your specific anxiety symptoms and triggers.',
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
        detailedDescription: 'Professional support for individuals experiencing depression, offering hope and practical tools for recovery. We understand that depression affects everyone differently and provide personalized treatment approaches.',
        benefits: [
          'Understand depression patterns',
          'Develop mood regulation skills',
          'Build support networks',
          'Create sustainable wellness plans',
          'Rediscover joy and purpose'
        ],
        approach: 'Our depression treatment combines cognitive-behavioral techniques with mindfulness and behavioral activation strategies. We focus on both symptom management and addressing underlying factors contributing to depression.',
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
        detailedDescription: 'Strengthen your relationship with professional couples therapy focused on communication, trust, and emotional intimacy. Whether you\'re facing specific challenges or want to enhance your connection, we\'re here to help.',
        benefits: [
          'Improve communication skills',
          'Resolve conflicts constructively',
          'Rebuild trust and intimacy',
          'Strengthen emotional connection',
          'Develop healthy relationship patterns'
        ],
        approach: 'We use Emotionally Focused Therapy (EFT) and Gottman Method to help couples build lasting, fulfilling relationships. Our approach focuses on understanding attachment patterns and improving emotional responsiveness.',
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
        detailedDescription: 'Comprehensive stress management program teaching practical skills for handling life\'s pressures and maintaining mental wellness. Learn to identify stress triggers and develop healthy coping mechanisms.',
        benefits: [
          'Identify stress triggers',
          'Learn relaxation techniques',
          'Develop healthy coping mechanisms',
          'Improve work-life balance',
          'Build resilience to future stressors'
        ],
        approach: 'Our stress management approach combines mindfulness, cognitive restructuring, and lifestyle modification techniques. We teach practical skills you can use immediately in your daily life.',
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
        detailedDescription: 'Professional grief counseling to help you navigate the complex emotions of loss and find a path toward healing. We provide support for all types of loss, including death of loved ones, job loss, and life transitions.',
        benefits: [
          'Process grief in a healthy way',
          'Understand the grieving process',
          'Develop coping strategies',
          'Honor your loved one\'s memory',
          'Find meaning and hope after loss'
        ],
        approach: 'We provide compassionate support using grief-specific therapeutic approaches to help you heal at your own pace. Our approach honors your unique grieving process while providing practical tools for coping.',
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
        detailedDescription: 'Family therapy sessions designed to improve communication, resolve conflicts, and strengthen family relationships. We work with families of all sizes and configurations to build healthier dynamics.',
        benefits: [
          'Improve family communication',
          'Resolve family conflicts',
          'Strengthen family bonds',
          'Develop healthy boundaries',
          'Create supportive family environment'
        ],
        approach: 'We use systemic family therapy approaches to address family dynamics and promote healthy relationships. Our approach considers the family as a system and works to improve interactions between all members.',
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
        detailedDescription: 'Comprehensive addiction support services to help you or your loved ones on the path to recovery. We provide evidence-based treatment for various types of addiction and substance abuse issues.',
        benefits: [
          'Develop recovery strategies',
          'Build support networks',
          'Address underlying issues',
          'Prevent relapse',
          'Rebuild relationships and trust'
        ],
        approach: 'Our addiction support combines evidence-based treatments with compassionate care to support long-term recovery. We address both the addiction and underlying mental health issues that may contribute to substance use.',
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
        detailedDescription: 'Personalized coaching to help you build self-confidence, overcome self-doubt, and develop a healthy relationship with yourself. Learn to recognize your worth and build lasting self-esteem.',
        benefits: [
          'Build self-confidence',
          'Overcome negative self-talk',
          'Develop self-compassion',
          'Set and achieve personal goals',
          'Create positive self-image'
        ],
        approach: 'Our self-esteem coaching uses positive psychology principles and cognitive techniques to help you build lasting confidence. We focus on identifying strengths, challenging negative beliefs, and developing self-compassion.',
        pricing: {
          individual: 110,
          currency: 'USD'
        },
        category: ServiceCategory.MENTAL_HEALTH,
        featured: false,
        imageUrl: '/assets/images/self-esteem-coaching.jpg'
      }
    ];

    // Simulate API call delay
    setTimeout(() => {
      const foundService = services.find(s => s.id === serviceId) || null;
      this.service.set(foundService);
      this.loading.set(false);

      // Update SEO for service page
      if (foundService) {
        this.seoService.updateSEO({
          title: `${foundService.name} - Healing Hub`,
          description: foundService.detailedDescription || foundService.description,
          keywords: [foundService.name, foundService.category, 'mental health', 'counseling', 'therapy'],
          type: 'website',
          image: foundService.imageUrl
        });

        // Add service structured data
        this.seoService.addServiceStructuredData({
          name: foundService.name,
          description: foundService.detailedDescription || foundService.description,
          provider: 'Healing Hub',
          areaServed: 'Worldwide',
          serviceType: 'Mental Health Counseling'
        });
      }
    }, 500);
  }
}