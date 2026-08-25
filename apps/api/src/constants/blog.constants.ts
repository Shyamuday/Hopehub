export const BLOG_CATEGORIES = [
  'Chronic Care',
  'Homeopathy Basics',
  'Skin & Hair',
  'Mental Wellness',
  "Women's Health",
  'Child Health',
  'Lifestyle',
  'Patient Stories',
  'Nutrition',
  'Preventive Care'
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_PUBLIC_SELECT = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  category: true,
  concernSlugs: true,
  readTime: true,
  authorName: true,
  authorRole: true,
  viewCount: true,
  isFeatured: true,
  publishedAt: true,
  createdAt: true
} as const;

export const BLOG_DETAIL_SELECT = {
  ...BLOG_PUBLIC_SELECT,
  content: true
} as const;
