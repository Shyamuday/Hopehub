export type FaqAccordionItem = {
  id?: string;
  question: string;
  answer: string;
  category?: string;
};

export const FAQ_FALLBACK_ENTRIES: FaqAccordionItem[] = [
  {
    category: 'Booking',
    question: 'How do I book a consultation?',
    answer:
      'Tap Book consultation on the home page, sign in with your mobile OTP, and complete the short intake. Our team assigns a doctor from the internal panel based on your concern and availability.'
  },
  {
    category: 'Booking',
    question: 'Can I choose my doctor?',
    answer:
      'No. Vitalis Care assigns from the internal doctor panel based on your concern, medical history, and availability.'
  },
  {
    category: 'Consultation',
    question: 'Is this for emergencies?',
    answer:
      'No. This platform is not for emergencies or critical symptoms. Please visit the nearest hospital or call emergency services if you need urgent care.'
  },
  {
    category: 'Consultation',
    question: 'Will I get a prescription?',
    answer:
      'Yes, after consultation if the doctor finds it appropriate. Prescriptions and follow-up guidance appear in your patient dashboard.'
  },
  {
    category: 'Treatment',
    question: 'Do you use homeopathy?',
    answer:
      'Our approach is homeopathy-led and low-medicine where suitable, guided by doctor assessment and your health profile.'
  },
  {
    category: 'Treatment',
    question: 'Can medicines be delivered to my home?',
    answer:
      'Yes, where delivery is available for your area. Add saved addresses in your profile and our store team can dispatch prescribed medicines with OTP verification on delivery.'
  },
  {
    category: 'Account',
    question: 'How do I log in?',
    answer:
      'Use your mobile number and OTP. You can optionally set a password or sign in with Gmail from the login screen. Complete your profile anytime after login.'
  },
  {
    category: 'Account',
    question: 'Can I update my health details later?',
    answer:
      'Yes. Open My Profile on your dashboard and save information gradually — allergies, food habits, addresses, and other details used for better care.'
  }
];
