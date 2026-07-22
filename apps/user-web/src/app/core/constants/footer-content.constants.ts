/** Footer layout & links — edit here to update the site footer. */

export type FooterLink = {
  label: string;
  href: string;
  /** Opens auth overlay instead of navigating when href is /login */
  authOverlay?: boolean;
  external?: boolean;
};

export type FooterColumn = {
  title: string;
  links: readonly FooterLink[];
};

export const FOOTER_CONTENT = {
  address: {
    title: 'Address',
    clinicName: 'HopeHub Care and Research Centre',
    lines: [
      'Ranchi Main Clinic',
      'Near City Centre, Main Road',
      'Ranchi, Jharkhand, India',
      'Pincode — 834001',
    ],
    phoneLabel: 'Contact',
    phone: '+91-98765-43210',
    phoneHref: 'tel:+919876543210',
    email: 'support@hopehubcare.in',
    emailHref: 'mailto:support@hopehubcare.in',
  },
  columns: [
    {
      title: 'Useful Links',
      links: [
        { label: 'Home', href: '/' },
        { label: 'We Are Hiring', href: '/careers' },
        { label: 'Partial Payment Refund Policy', href: '/payment-policy' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'About HopeHub Care', href: '/about' },
        { label: 'Our Providers', href: '/our-providers' },
        { label: 'Blogs', href: '/blog' },
        { label: 'Patient Stories', href: '/testimonials' },
        { label: 'Safety & Trust', href: '/safety' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'My Account', href: '/login', authOverlay: true },
        { label: 'Book Consultation', href: '/login', authOverlay: true },
        { label: 'My Dashboard', href: '/patient/dashboard' },
        { label: "FAQ's", href: '/faq' },
        { label: 'Get the Patient App', href: '/get-app' },
        { label: 'Raise a Service Request', href: '/contact' },
      ],
    },
    {
      title: 'Policies',
      links: [
        { label: 'Privacy Policy', href: '/privacy-policy' },
        { label: 'Payment Policy', href: '/payment-policy' },
        { label: 'Shipping Policy', href: '/shipping-policy' },
        { label: 'Terms And Conditions', href: '/terms-and-conditions' },
        { label: 'Return And Exchange Policy', href: '/return-and-exchange-policy' },
        { label: 'All Legal Policies', href: '/legal' },
      ],
    },
    {
      title: 'Care Programs',
      links: [
        { label: 'All Treatments', href: '/treatments' },
        { label: 'Hair Fall Care', href: '/treatments/hair-fall' },
        { label: 'Skin Care', href: '/treatments/skin-care' },
        { label: 'Chronic & Long-term Care', href: '/chronic-care' },
        { label: 'Why HopeHub Works', href: '/why-successful' },
        { label: 'Care Approaches', href: '/why-successful' },
      ],
    },
  ] satisfies readonly FooterColumn[],
  copyright: `© Copyright ${new Date().getFullYear()} HopeHub Care and Research Centre. All Rights Reserved.`,
} as const;
