import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';

interface BlogPost {
  slug: string;
  category: string;
  title: string;
  excerpt: string;
  readTime: string;
  date: string;
}

@Component({
  selector: 'app-blog',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './blog.component.html',
})
export class BlogComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;

  readonly categories = [
    'All',
    'Chronic Care',
    'Hair & Skin',
    'Mental Health',
    'Nutrition & Lifestyle',
    'Homeopathy Explained',
  ];

  selectedCategory = 'All';

  readonly posts: BlogPost[] = [
    {
      slug: 'why-chronic-conditions-need-long-term-care',
      category: 'Chronic Care',
      title: 'Why chronic conditions need long-term care, not quick fixes',
      excerpt:
        'Chronic health conditions build over years. A one-time prescription rarely addresses the underlying pattern. We explain why continuity, follow-up, and constitutional treatment make the difference.',
      readTime: '5 min read',
      date: 'Jun 2026',
    },
    {
      slug: 'hair-fall-root-causes',
      category: 'Hair & Skin',
      title: 'Hair fall: the root causes most people overlook',
      excerpt:
        'Most people treat hair fall with topical solutions. But the trigger is often systemic — hormonal imbalance, nutritional deficiency, thyroid issues, or prolonged stress. We break down the patterns our doctors see most.',
      readTime: '6 min read',
      date: 'Jun 2026',
    },
    {
      slug: 'homeopathy-how-it-works',
      category: 'Homeopathy Explained',
      title: 'How homeopathy works — a plain-language explanation',
      excerpt:
        'Homeopathy is widely misunderstood. It is not herbalism, not placebo, and not "spiritual" medicine. We explain the principles behind individualised prescribing, potency selection, and constitutional treatment.',
      readTime: '7 min read',
      date: 'May 2026',
    },
    {
      slug: 'anxiety-without-antidepressants',
      category: 'Mental Health',
      title: 'Managing anxiety without immediately starting antidepressants',
      excerpt:
        'For mild to moderate anxiety without safety concerns, there are structured approaches that work. We cover lifestyle changes, homeopathic support, and when conventional medication becomes necessary.',
      readTime: '6 min read',
      date: 'May 2026',
    },
    {
      slug: 'eczema-triggers-and-management',
      category: 'Hair & Skin',
      title: 'Eczema triggers, patterns, and why your flare-ups keep coming back',
      excerpt:
        'Eczema is not just a skin condition — it is a systemic hypersensitivity response. Understanding your individual trigger pattern is the first step toward breaking the flare-up cycle.',
      readTime: '5 min read',
      date: 'May 2026',
    },
    {
      slug: 'nutrition-for-chronic-kidney-patients',
      category: 'Nutrition & Lifestyle',
      title: 'Nutrition guidelines for chronic kidney disease patients',
      excerpt:
        'Diet has a significant impact on kidney function and disease progression. We outline the evidence-backed nutritional principles our doctors recommend to CKD patients alongside medical treatment.',
      readTime: '8 min read',
      date: 'Apr 2026',
    },
    {
      slug: 'hypertension-non-drug-approaches',
      category: 'Chronic Care',
      title: 'Blood pressure management: what you can do before medication',
      excerpt:
        'Lifestyle modifications can meaningfully reduce blood pressure in many patients. We cover the dietary, exercise, sleep, and stress interventions that our clinical team recommends as a first step.',
      readTime: '6 min read',
      date: 'Apr 2026',
    },
    {
      slug: 'miasms-in-homeopathy',
      category: 'Homeopathy Explained',
      title: 'What are miasms? Understanding constitutional susceptibility',
      excerpt:
        'Miasm theory is one of the most important — and most misunderstood — concepts in classical homeopathy. We explain what miasms are, how our doctors use them in case analysis, and why they matter for chronic disease.',
      readTime: '9 min read',
      date: 'Mar 2026',
    },
    {
      slug: 'sleep-and-chronic-disease',
      category: 'Nutrition & Lifestyle',
      title: 'Why poor sleep worsens almost every chronic condition',
      excerpt:
        'Sleep is not just rest — it is the body\'s primary repair window. Chronic sleep disruption elevates cortisol, impairs immune function, worsens inflammation, and accelerates disease progression. Here is what to do.',
      readTime: '5 min read',
      date: 'Mar 2026',
    },
  ];

  get filteredPosts(): BlogPost[] {
    if (this.selectedCategory === 'All') {
      return this.posts;
    }
    return this.posts.filter((p) => p.category === this.selectedCategory);
  }

  selectCategory(cat: string): void {
    this.selectedCategory = cat;
  }
}
