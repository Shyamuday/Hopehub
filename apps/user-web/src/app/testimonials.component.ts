import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';

interface Testimonial {
  name: string;
  location: string;
  condition: string;
  duration: string;
  quote: string;
  initials: string;
  stars: number;
}

@Component({
  selector: 'app-testimonials',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './testimonials.component.html',
})
export class TestimonialsComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;

  readonly testimonials: Testimonial[] = [
    {
      name: 'Anjali S.',
      location: 'Mumbai',
      condition: 'Hair fall',
      duration: '4 months of care',
      quote:
        'I had been dealing with excessive hair fall for almost two years. After trying multiple shampoos and supplements, nothing worked. With Vitalis, the doctor spent time understanding my full history — stress patterns, diet, sleep. Within three months my hair fall reduced dramatically and new growth started.',
      initials: 'AS',
      stars: 5,
    },
    {
      name: 'Ramesh K.',
      location: 'Bengaluru',
      condition: 'Hypertension',
      duration: '6 months of care',
      quote:
        'My blood pressure was fluctuating despite conventional medicines and my doctor was considering adding another drug. I decided to try Vitalis. The homeopathic treatment helped stabilise my readings and I have been able to reduce one of my medicines under my physician\'s guidance. The follow-up here is consistent and thorough.',
      initials: 'RK',
      stars: 5,
    },
    {
      name: 'Preethi M.',
      location: 'Chennai',
      condition: 'Chronic skin condition',
      duration: '5 months of care',
      quote:
        'I had recurring eczema flare-ups that would come back every few weeks. The doctor at Vitalis asked very detailed questions — not just about the skin but about my sleep, digestion, and emotional state. The treatment addressed the underlying pattern and my flare-ups are now rare and mild.',
      initials: 'PM',
      stars: 5,
    },
    {
      name: 'Suresh T.',
      location: 'Hyderabad',
      condition: 'Kidney stones',
      duration: '3 months of care',
      quote:
        'I had recurrent kidney stones and was told surgery might be necessary again. The Vitalis doctor explained the constitutional approach and how it could reduce recurrence. After three months I had a follow-up scan and the small remaining stone had dissolved. My urologist was surprised.',
      initials: 'ST',
      stars: 5,
    },
    {
      name: 'Divya R.',
      location: 'Pune',
      condition: 'Anxiety and chronic fatigue',
      duration: '4 months of care',
      quote:
        'I was exhausted all the time and struggling with constant anxiety. I did not want to start antidepressants immediately. Vitalis offered a careful, medication-light approach. The doctor\'s understanding of the mental-physical connection was remarkable. I feel significantly better and more stable now.',
      initials: 'DR',
      stars: 5,
    },
    {
      name: 'Meenakshi P.',
      location: 'Coimbatore',
      condition: 'Diabetes management',
      duration: '7 months of care',
      quote:
        'My blood sugar levels were consistently high and I was struggling with fatigue and foot numbness. With Vitalis alongside my diabetologist\'s supervision, my HbA1c improved over six months. The care coordination here is excellent — every follow-up is tracked carefully.',
      initials: 'MP',
      stars: 5,
    },
    {
      name: 'Aryan D.',
      location: 'Delhi',
      condition: 'Respiratory health',
      duration: '3 months of care',
      quote:
        'Frequent colds, chest congestion, and a stubborn cough that lasted months at a time — that was my life. The doctor at Vitalis identified a pattern in my respiratory susceptibility and treated it constitutionally. I have not had a major chest infection in five months now.',
      initials: 'AD',
      stars: 5,
    },
    {
      name: 'Lakshmi B.',
      location: 'Vizag',
      condition: 'Piles (Haemorrhoids)',
      duration: '3 months of care',
      quote:
        'I was embarrassed to talk about it but the online consultation format actually made it easier. The doctor was professional and thorough. After about six weeks of treatment the symptoms reduced significantly. By the end of three months I had no bleeding or pain. No surgery needed.',
      initials: 'LB',
      stars: 5,
    },
  ];

  readonly stars = [1, 2, 3, 4, 5];

  readonly stats = [
    { value: '4,800+', label: 'Patients treated' },
    { value: '92%', label: 'Report improvement within 3 months' },
    { value: '4.8 / 5', label: 'Average patient satisfaction' },
    { value: '15+', label: 'Conditions treated' },
  ];
}
