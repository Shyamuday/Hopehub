import { Component } from '@angular/core';
import { AppFooterComponent } from './app-footer.component';
import { AppHeaderComponent } from './app-header.component';
import { WHATSAPP_CONTACT_URL } from './core/constants/branding.constants';

interface DoctorProfile {
  name: string;
  qualification: string;
  specialisation: string;
  experience: string;
  focus: string[];
  bio: string;
  initials: string;
}

@Component({
  selector: 'app-our-doctors',
  imports: [AppHeaderComponent, AppFooterComponent],
  templateUrl: './our-doctors.component.html',
})
export class OurDoctorsComponent {
  readonly whatsappLink = WHATSAPP_CONTACT_URL;

  readonly doctors: DoctorProfile[] = [
    {
      name: 'Dr. Priya Nair',
      qualification: 'MD (Homeopathy)',
      specialisation: 'Chief Consultant',
      experience: '14 years',
      focus: ['Chronic kidney disease', 'Hypertension', 'Diabetes management'],
      bio: 'Dr. Nair leads clinical operations and case review at Vitalis. Her practice focuses on long-running metabolic and lifestyle-linked conditions, with a strong emphasis on constitutional prescribing and minimal intervention.',
      initials: 'PN',
    },
    {
      name: 'Dr. Arjun Mehta',
      qualification: 'BHMS, PG Dip. Clinical Homeopathy',
      specialisation: 'Senior Consultant',
      experience: '9 years',
      focus: ['Musculoskeletal disorders', 'Respiratory conditions', 'Mental health'],
      bio: 'Dr. Mehta specialises in cases involving recurring physical and psychological symptoms. He combines detailed case-taking with repertory analysis to develop individualised long-term care plans.',
      initials: 'AM',
    },
    {
      name: 'Dr. Kavitha Rao',
      qualification: 'BHMS, Cert. Trichology',
      specialisation: 'Specialist Consultant — Dermatology & Trichology',
      experience: '7 years',
      focus: ['Hair fall and alopecia', 'Chronic skin conditions', 'Hormonal concerns'],
      bio: 'Dr. Rao brings specialised expertise in hair and skin-related concerns. Her holistic approach combines systemic homeopathic treatment with nutritional guidance, delivering consistent results for patients with resistant dermatological conditions.',
      initials: 'KR',
    },
    {
      name: 'Dr. Samuel Thomas',
      qualification: 'MD (Homeopathy)',
      specialisation: 'Consultant — Chronic Care',
      experience: '11 years',
      focus: ['Liver disorders', 'Gallstone disease', 'Gastrointestinal health'],
      bio: 'Dr. Thomas has extensive experience with complex chronic and rare hepatic and gastrointestinal presentations. He is known for thorough miasmatic analysis and long-term patient continuity.',
      initials: 'ST',
    },
    {
      name: 'Dr. Meera Krishnan',
      qualification: 'BHMS',
      specialisation: 'Telemedicine Consultant',
      experience: '5 years',
      focus: ['General health', 'Paediatric concerns', 'Chronic fatigue'],
      bio: 'Dr. Krishnan specialises in online consultations for patients seeking a gentle, medication-light approach for general health, childhood complaints, and fatigue-related conditions.',
      initials: 'MK',
    },
    {
      name: 'Dr. Rajan Pillai',
      qualification: 'BHMS, Cert. Cardiology',
      specialisation: 'Specialist Consultant — Cardiovascular',
      experience: '12 years',
      focus: ['Cardiovascular health', 'Hypertension', 'Cholesterol management'],
      bio: 'Dr. Pillai focuses on patients with cardiovascular risk factors who prefer a supportive, homeopathy-led approach alongside conventional management. His practice is careful, evidence-aware, and patient-centred.',
      initials: 'RP',
    },
  ];

  readonly process = [
    {
      step: '01',
      title: 'You describe your concern',
      detail: 'Share your symptoms and health history through our short intake form.',
    },
    {
      step: '02',
      title: 'We assign the right doctor',
      detail: 'Our team matches you to the doctor best suited for your condition.',
    },
    {
      step: '03',
      title: 'Consultation begins',
      detail: 'Your assigned doctor reviews your case and begins a private chat consultation.',
    },
    {
      step: '04',
      title: 'Ongoing care',
      detail: 'Prescriptions, follow-ups, and care continuity — all managed under one roof.',
    },
  ];
}
