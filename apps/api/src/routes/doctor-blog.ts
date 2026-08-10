import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../auth.js';
import { BLOG_CATEGORIES } from '../constants/blog.constants.js';
import { requireDoctorCapability } from '../doctor-capabilities.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../utils/helpers.js';

const slugRegex = /^[a-z0-9-]+$/;

const blogPostSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(slugRegex, 'Slug must be lowercase letters, numbers, and hyphens only'),
  title: z.string().min(5).max(200),
  excerpt: z.string().min(10).max(500),
  content: z.string().max(50000).optional().nullable(),
  category: z.string().min(1).max(80),
  readTime: z.string().max(40).optional().nullable(),
  isPublished: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  authorName: z.string().max(120).optional().nullable(),
  authorRole: z.string().max(80).optional().nullable()
});

function publishedAtForUpdate(
  existing: { isPublished: boolean; publishedAt: Date | null },
  isPublished?: boolean
) {
  if (isPublished === true && !existing.publishedAt) return new Date();
  if (isPublished === false) return null;
  return undefined;
}

export function registerDoctorBlogRoutes(router: Router) {
  router.use(
    '/doctor/blog',
    authRequired,
    allowRoles(Role.DOCTOR),
    requireDoctorCapability('content', 'Content tools are available only for homeopathy providers.')
  );

  router.get(
    '/doctor/blog',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const posts = await prisma.blogPost.findMany({
        where: { authorId: req.user!.id },
        orderBy: [{ updatedAt: 'desc' }]
      });
      res.json({ posts, categories: BLOG_CATEGORIES });
    })
  );

  router.post(
    '/doctor/blog',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const body = blogPostSchema
        .omit({
          isPublished: true,
          isHidden: true,
          isFeatured: true,
          sortOrder: true,
          authorName: true,
          authorRole: true
        })
        .extend({ isPublished: z.literal(false).optional() })
        .parse({ ...req.body, isPublished: false });

      const post = await prisma.blogPost.create({
        data: {
          ...body,
          authorId: req.user!.id,
          authorName: req.user!.name,
          authorRole: 'Provider',
          isPublished: false,
          publishedAt: null
        }
      });
      res
        .status(201)
        .json({ post, message: 'Article saved as draft. An admin will review before publishing.' });
    })
  );

  router.patch(
    '/doctor/blog/:id',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const existing = await prisma.blogPost.findFirst({ where: { id, authorId: req.user!.id } });
      if (!existing) return res.status(404).json({ message: 'Post not found.' });

      const body = blogPostSchema
        .partial()
        .omit({
          isPublished: true,
          isHidden: true,
          isFeatured: true,
          sortOrder: true,
          authorName: true,
          authorRole: true
        })
        .parse(req.body);

      const post = await prisma.blogPost.update({
        where: { id },
        data: { ...body, authorName: req.user!.name, authorRole: 'Provider' }
      });
      res.json({ post, message: 'Article updated.' });
    })
  );

  router.delete(
    '/doctor/blog/:id',
    authRequired,
    allowRoles(Role.DOCTOR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const existing = await prisma.blogPost.findFirst({
        where: { id, authorId: req.user!.id, isPublished: false }
      });
      if (!existing)
        return res.status(404).json({ message: 'Only unpublished drafts can be deleted.' });

      await prisma.blogPost.delete({ where: { id } });
      res.json({ message: 'Draft deleted.' });
    })
  );
}
