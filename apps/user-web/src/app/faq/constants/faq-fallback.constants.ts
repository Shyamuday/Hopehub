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
      'Tap Book consultation on the home page, sign in with your email OTP, and complete the short intake. Our team assigns a provider from the internal panel based on your concern and availability.',
  },
  {
    category: 'Booking',
    question: 'Can I choose my provider?',
    answer:
      'No. HopeHub Care assigns from the internal provider panel based on your concern, medical history, and availability.',
  },
  {
    category: 'Consultation',
    question: 'Is this for emergencies?',
    answer:
      'No. This platform is not for emergencies or critical symptoms. Please visit the nearest hospital or call emergency services if you need urgent care.',
  },
  {
    category: 'Consultation',
    question: 'Will I get a prescription?',
    answer:
      'Yes, after consultation if the provider finds it appropriate. Prescriptions and follow-up guidance appear in your patient dashboard.',
  },
  {
    category: 'Treatment',
    question: 'Do you use homeopathy?',
    answer:
      'Yes, homeopathy is one supported care approach where suitable. Your provider will guide the right plan based on your concern, history, safety needs, and goals.',
  },
  {
    category: 'Treatment',
    question: 'Can medicines be delivered to my home?',
    answer:
      'Yes, where delivery is available for your area. Add saved addresses in your profile and our store team can dispatch prescribed medicines with OTP verification on delivery.',
  },
  {
    category: 'Account',
    question: 'How do I log in?',
    answer: 'Use your email and OTP. You can add your mobile number later from your profile.',
  },
  {
    category: 'Account',
    question: 'Can I update my health details later?',
    answer:
      'Yes. Open My Profile on your dashboard and save information gradually — allergies, food habits, addresses, and other details used for better care.',
  },
];
