import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AnnouncementBannerComponent, ServiceCardComponent, ServicesCarouselComponent, StatsSectionComponent } from '../../shared/components';
// import { MultiAssessmentComponent } from '../../shared/components/multi-assessment/multi-assessment.component';
// import { ProgressDashboardComponent } from '../../shared/components/progress-dashboard/progress-dashboard.component';
import { Service, ServiceCategory, Meetup } from '../../core/models';
import { APP_CONSTANTS } from '../../core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, AnnouncementBannerComponent, ServiceCardComponent, ServicesCarouselComponent, StatsSectionComponent],
  template: `
    <!-- Announcement Banner -->
    <app-announcement-banner 
      [message]="announcementMessage"
      (onDismiss)="onAnnouncementDismiss()">
    </app-announcement-banner>

    <!-- Hero Section -->
    <section class="bg-gradient-to-br from-blue-50 to-indigo-100 py-12 sm:py-16 md:py-20 lg:py-24">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
          Welcome to <span class="text-primary-600">Healing Hub</span>
        </h1>
        <p class="text-lg sm:text-xl md:text-2xl text-gray-700 mb-3 sm:mb-4 max-w-3xl mx-auto">
          Your Journey to Mental Wellness Starts Here
        </p>
        <p class="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
          Professional mental health services providing support, guidance, and healing 
          for individuals seeking to improve their emotional well-being and life satisfaction.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center max-w-md sm:max-w-none mx-auto">
          <button 
            class="cta-button w-full sm:w-auto bg-primary-600 text-white px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
            routerLink="/services">
            Explore Services
          </button>
          <button 
            class="cta-button w-full sm:w-auto border-2 border-primary-600 text-primary-600 px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary-50 transition-colors duration-200"
            routerLink="/contact">
            Get Started Today
          </button>
        </div>
      </div>
    </section>

    <!-- Services Carousel -->
    <app-services-carousel></app-services-carousel>

    <!-- Mental Health Tools Section -->
    <section class="py-12 sm:py-16 bg-slate-50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8 sm:mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Mental Health Tools & Resources
          </h2>
          <p class="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            Comprehensive tools to support your mental health journey - from assessments and exercises 
            to lifestyle tips and educational articles.
          </p>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <!-- Mental Health Assessments -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer group"
               routerLink="/assessments">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Mental Health Assessments</h3>
            <p class="text-gray-600 mb-4">Take clinically validated assessments to understand your mental health status and get personalized recommendations.</p>
            <div class="flex items-center text-blue-600 font-semibold">
              <span>Take Assessment</span>
              <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <!-- Wellness Exercises -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer group"
               routerLink="/exercises">
            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Wellness Exercises</h3>
            <p class="text-gray-600 mb-4">Practice evidence-based exercises for breathing, mindfulness, cognitive therapy, and physical wellness.</p>
            <div class="flex items-center text-purple-600 font-semibold">
              <span>Start Exercises</span>
              <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <!-- Lifestyle Tips -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer group"
               routerLink="/lifestyle-tips">
            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-200 transition-colors">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Lifestyle Tips</h3>
            <p class="text-gray-600 mb-4">Discover practical lifestyle changes for better sleep, nutrition, social connections, and work-life balance.</p>
            <div class="flex items-center text-green-600 font-semibold">
              <span>Explore Tips</span>
              <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>

          <!-- Educational Articles -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer group"
               routerLink="/articles">
            <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-indigo-200 transition-colors">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">Educational Articles</h3>
            <p class="text-gray-600 mb-4">Read evidence-based articles about depression, anxiety, stress management, and self-care from mental health professionals.</p>
            <div class="flex items-center text-indigo-600 font-semibold">
              <span>Read Articles</span>
              <svg class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Call to Action -->
        <div class="text-center mt-8 sm:mt-12">
          <div class="bg-white rounded-xl shadow-lg p-6 sm:p-8 max-w-2xl mx-auto">
            <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Start Your Mental Health Journey Today</h3>
            <p class="text-gray-600 mb-6">Take a quick assessment to get personalized recommendations for exercises, lifestyle tips, and educational content.</p>
            <button 
              class="bg-primary-600 text-white px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
              routerLink="/assessments">
              Take Free Assessment
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Progress Dashboard -->
    <!-- <section class="py-12 bg-slate-50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <app-progress-dashboard></app-progress-dashboard>
      </div>
    </section> -->

    <!-- Multi Assessment Section -->
    <!-- <app-multi-assessment></app-multi-assessment> -->

    <!-- Stats Section -->
    <app-stats-section></app-stats-section>

    <!-- Services Overview -->
    <section class="py-12 sm:py-16 bg-white">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8 sm:mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Our Mental Health Services
          </h2>
          <p class="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive support for your mental health journey with professional, 
            compassionate care tailored to your unique needs.
          </p>
        </div>
        
        <div class="service-grid">
          @for (service of services; track service.id) {
            <app-service-card 
              [service]="service"
              class="transform hover:scale-105 transition-transform duration-200">
            </app-service-card>
          }
        </div>
        
        <div class="text-center mt-8 sm:mt-12">
          <button 
            class="cta-button bg-primary-600 text-white px-6 sm:px-8 py-3 rounded-lg text-base sm:text-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
            routerLink="/services">
            View All Services
          </button>
        </div>
      </div>
    </section>

    <!-- Community Engagement -->
    <section class="py-12 sm:py-16 bg-gray-50">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8 sm:mb-12">
          <h2 class="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
            Join Our Healing Community
          </h2>
          <p class="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with others on their healing journey and stay informed about our community events.
          </p>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
          <!-- Telegram Community -->
          <div class="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div class="mb-4 sm:mb-6">
              <div class="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.61 7.59c-.12.54-.44.67-.89.42l-2.46-1.81-1.19 1.14c-.13.13-.24.24-.49.24l.17-2.43 4.47-4.03c.19-.17-.04-.27-.3-.1L9.28 13.47l-2.38-.75c-.52-.16-.53-.52.11-.77l9.28-3.58c.43-.16.81.1.67.73z"/>
                </svg>
              </div>
              <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Telegram Community</h3>
              <p class="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Join our supportive Telegram group to connect with others, share experiences, 
                and receive daily encouragement on your healing journey.
              </p>
            </div>
            <a 
              href="{{ APP_CONSTANTS.TELEGRAM.GROUP_URL }}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="inline-block w-full sm:w-auto bg-blue-500 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors duration-200 min-h-[48px] flex items-center justify-center">
              Join Telegram Group
            </a>
          </div>

          <!-- Monthly Meetup -->
          <div class="bg-white rounded-lg shadow-md p-6 sm:p-8 text-center">
            <div class="mb-4 sm:mb-6">
              <div class="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg class="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
              </div>
              <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Monthly Meetup</h3>
              <p class="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
                Join us for our monthly healing circle held on the first Sunday of every month.
              </p>
              <div class="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <p class="text-xs sm:text-sm text-gray-600 mb-2">Next Meetup:</p>
                <p class="font-semibold text-gray-900 text-sm sm:text-base">{{ nextMeetup.title }}</p>
                <p class="text-gray-700 text-sm">{{ formatMeetupDate(nextMeetup.date) }}</p>
                <p class="text-gray-700 text-sm">{{ nextMeetup.time }}</p>
                @if (nextMeetup.location) {
                  <p class="text-gray-700 text-sm">{{ nextMeetup.location }}</p>
                }
                @if (nextMeetup.isVirtual) {
                  <p class="text-blue-600 text-sm">Virtual Meeting</p>
                }
              </div>
            </div>
            <button 
              class="w-full sm:w-auto bg-green-500 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 min-h-[48px]"
              routerLink="/community">
              Learn More
            </button>
          </div>
        </div>

        <!-- Community Benefits -->
        <div class="mt-8 sm:mt-12 text-center">
          <h3 class="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Why Join Our Community?</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            <div class="p-4 sm:p-6">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                </svg>
              </div>
              <h4 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">Peer Support</h4>
              <p class="text-sm sm:text-base text-gray-600">Connect with others who understand your journey and share similar experiences.</p>
            </div>
            <div class="p-4 sm:p-6">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <h4 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">Educational Resources</h4>
              <p class="text-sm sm:text-base text-gray-600">Access valuable mental health resources, tips, and educational content.</p>
            </div>
            <div class="p-4 sm:p-6">
              <div class="w-10 h-10 sm:w-12 sm:h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
              </div>
              <h4 class="text-base sm:text-lg font-semibold text-gray-900 mb-2">Safe Space</h4>
              <p class="text-sm sm:text-base text-gray-600">A judgment-free environment where you can share, learn, and grow at your own pace.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* Mobile-first responsive grid adjustments */
    .service-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    
    @media (min-width: 640px) {
      .service-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (min-width: 1024px) {
      .service-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    @media (min-width: 1280px) {
      .service-grid {
        grid-template-columns: repeat(4, 1fr);
      }
    }
    
    /* Ensure proper mobile touch targets */
    @media (max-width: 639px) {
      .cta-button {
        min-height: 48px;
        padding: 0.875rem 2rem;
        font-size: 1rem;
      }
    }
  `]
})
export class HomeComponent implements OnInit {
  APP_CONSTANTS = APP_CONSTANTS;

  announcementMessage = 'Join us for our monthly healing circle - First Sunday of every month at 2:00 PM';

  services: Service[] = [
    {
      id: '1',
      name: 'Breakup Counseling',
      description: 'Navigate the emotional challenges of relationship endings with professional support and guidance.',
      detailedDescription: 'Comprehensive support for processing grief, rebuilding self-esteem, and moving forward.',
      benefits: ['Emotional healing', 'Closure guidance', 'Self-esteem rebuilding'],
      approach: 'Cognitive-behavioral therapy combined with mindfulness techniques',
      category: ServiceCategory.RELATIONSHIP,
      featured: true,
      pricing: { individual: 120, currency: 'USD' }
    },
    {
      id: '2',
      name: 'Career Counseling',
      description: 'Professional guidance for career transitions, workplace stress, and professional development.',
      detailedDescription: 'Support for career changes, workplace challenges, and professional growth.',
      benefits: ['Career clarity', 'Stress management', 'Professional development'],
      approach: 'Solution-focused therapy with career assessment tools',
      category: ServiceCategory.CAREER,
      featured: true,
      pricing: { individual: 110, currency: 'USD' }
    },
    {
      id: '3',
      name: 'Anxiety Therapy',
      description: 'Evidence-based treatment for anxiety disorders, panic attacks, and stress management.',
      detailedDescription: 'Comprehensive anxiety treatment using proven therapeutic approaches.',
      benefits: ['Anxiety reduction', 'Coping strategies', 'Stress management'],
      approach: 'Cognitive-behavioral therapy and exposure therapy',
      category: ServiceCategory.MENTAL_HEALTH,
      featured: true,
      pricing: { individual: 130, currency: 'USD' }
    },
    {
      id: '4',
      name: 'Depression Support',
      description: 'Compassionate care for depression, mood disorders, and emotional wellness.',
      detailedDescription: 'Holistic approach to depression treatment and emotional healing.',
      benefits: ['Mood improvement', 'Energy restoration', 'Life satisfaction'],
      approach: 'Interpersonal therapy and behavioral activation',
      category: ServiceCategory.MENTAL_HEALTH,
      featured: true,
      pricing: { individual: 130, currency: 'USD' }
    },
    {
      id: '5',
      name: 'Relationship Counseling',
      description: 'Strengthen relationships through improved communication and conflict resolution.',
      detailedDescription: 'Couples and relationship therapy for better communication and connection.',
      benefits: ['Better communication', 'Conflict resolution', 'Intimacy building'],
      approach: 'Emotionally focused therapy and communication training',
      category: ServiceCategory.RELATIONSHIP,
      featured: false,
      pricing: { couples: 150, currency: 'USD' }
    },
    {
      id: '6',
      name: 'Stress Management',
      description: 'Learn effective techniques to manage stress and improve work-life balance.',
      detailedDescription: 'Practical stress management strategies for daily life challenges.',
      benefits: ['Stress reduction', 'Better balance', 'Improved wellbeing'],
      approach: 'Mindfulness-based stress reduction and relaxation techniques',
      category: ServiceCategory.MENTAL_HEALTH,
      featured: false,
      pricing: { individual: 100, currency: 'USD' }
    },
    {
      id: '7',
      name: 'Grief Counseling',
      description: 'Support through the grieving process and loss recovery with compassionate care.',
      detailedDescription: 'Specialized support for processing grief and loss in a healing environment.',
      benefits: ['Grief processing', 'Emotional healing', 'Coping strategies'],
      approach: 'Grief-focused therapy and support group integration',
      category: ServiceCategory.MENTAL_HEALTH,
      featured: false,
      pricing: { individual: 120, currency: 'USD' }
    },
    {
      id: '8',
      name: 'Family Therapy',
      description: 'Improve family dynamics and communication through professional family counseling.',
      detailedDescription: 'Family systems therapy to improve relationships and communication.',
      benefits: ['Better family dynamics', 'Improved communication', 'Conflict resolution'],
      approach: 'Family systems therapy and communication skills training',
      category: ServiceCategory.FAMILY,
      featured: false,
      pricing: { group: 180, currency: 'USD' }
    },
    {
      id: '9',
      name: 'Addiction Support',
      description: 'Comprehensive support for addiction recovery and maintaining sobriety.',
      detailedDescription: 'Evidence-based addiction treatment and recovery support services.',
      benefits: ['Recovery support', 'Relapse prevention', 'Life skills development'],
      approach: 'Motivational interviewing and cognitive-behavioral therapy',
      category: ServiceCategory.ADDICTION,
      featured: false,
      pricing: { individual: 140, currency: 'USD' }
    },
    {
      id: '10',
      name: 'Self-Esteem Coaching',
      description: 'Build confidence and self-worth through personalized coaching and support.',
      detailedDescription: 'Personalized coaching to build confidence and improve self-image.',
      benefits: ['Increased confidence', 'Better self-image', 'Personal growth'],
      approach: 'Strengths-based coaching and positive psychology techniques',
      category: ServiceCategory.MENTAL_HEALTH,
      featured: false,
      pricing: { individual: 90, currency: 'USD' }
    }
  ];

  nextMeetup: Meetup = {
    id: '1',
    title: 'Monthly Healing Circle',
    description: 'A supportive group session focused on sharing experiences and healing together.',
    date: this.getNextFirstSunday(),
    time: '2:00 PM - 4:00 PM',
    location: 'Community Center - Room 101',
    isVirtual: false,
    maxAttendees: 20
  };

  ngOnInit() {
    // Component initialization
  }

  onAnnouncementDismiss() {
    // Handle announcement dismissal
    console.log('Announcement dismissed');
  }

  formatMeetupDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private getNextFirstSunday(): Date {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Start with the first day of current month
    let firstSunday = new Date(currentYear, currentMonth, 1);

    // Find the first Sunday of the month
    while (firstSunday.getDay() !== 0) {
      firstSunday.setDate(firstSunday.getDate() + 1);
    }

    // If the first Sunday has passed, get the first Sunday of next month
    if (firstSunday < now) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      firstSunday = new Date(nextYear, nextMonth, 1);

      while (firstSunday.getDay() !== 0) {
        firstSunday.setDate(firstSunday.getDate() + 1);
      }
    }

    return firstSunday;
  }
}