import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired, allowRoles } from '../../auth.js';
import { BLOG_CATEGORIES } from '../../constants/blog.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';

const schema = z.object({
  slug: z
    .string()
    .min(3)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  title: z.string().min(5).max(200),
  excerpt: z.string().min(10).max(500),
  content: z.string().max(50000).optional().nullable(),
  category: z.string().min(1).max(80),
  concernSlugs: z.array(z.string().min(1).max(80)).max(30).default([]),
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

export function registerAdminBlogRoutes(router: Router) {
  router.get(
    '/admin/blog/stats',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const [total, published, hidden, featured, pendingComments, totalViews] = await Promise.all([
        prisma.blogPost.count(),
        prisma.blogPost.count({ where: { isPublished: true, isHidden: false } }),
        prisma.blogPost.count({ where: { isHidden: true } }),
        prisma.blogPost.count({ where: { isFeatured: true } }),
        prisma.blogComment.count({ where: { isApproved: false } }),
        prisma.blogPost.aggregate({ _sum: { viewCount: true } })
      ]);
      res.json({
        stats: {
          total,
          published,
          drafts: total - published,
          hidden,
          featured,
          pendingComments,
          totalViews: totalViews._sum.viewCount ?? 0
        }
      });
    })
  );

  router.get(
    '/admin/blog',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (_req, res) => {
      const posts = await prisma.blogPost.findMany({
        include: { _count: { select: { comments: true } } },
        orderBy: [
          { sortOrder: 'asc' },
          { publishedAt: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' }
        ]
      });
      res.json({ posts, categories: BLOG_CATEGORIES });
    })
  );

  router.post(
    '/admin/blog',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const body = schema.parse(req.body);
      const post = await prisma.blogPost.create({
        data: {
          ...body,
          authorId: body.authorName ? undefined : req.user!.id,
          authorName: body.authorName ?? req.user!.name,
          authorRole: body.authorRole ?? req.user!.role,
          publishedAt: body.isPublished ? new Date() : null
        }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'blog.create',
        targetType: 'blog_post',
        targetId: post.id,
        summary: `Blog post "${body.title}" created.`
      });
      res.status(201).json({ post });
    })
  );

  router.patch(
    '/admin/blog/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = schema.partial().parse(req.body);
      const existing = await prisma.blogPost.findUnique({
        where: { id },
        select: { isPublished: true, publishedAt: true, title: true }
      });
      if (!existing) return res.status(404).json({ message: 'Post not found' });

      const publishedAt = publishedAtForUpdate(existing, body.isPublished);
      const post = await prisma.blogPost.update({
        where: { id },
        data: { ...body, ...(publishedAt !== undefined ? { publishedAt } : {}) }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'blog.update',
        targetType: 'blog_post',
        targetId: id,
        summary: `Blog post "${post.title}" updated.`
      });
      res.json({ post });
    })
  );

  router.delete(
    '/admin/blog/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const post = await prisma.blogPost.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'blog.delete',
        targetType: 'blog_post',
        targetId: id,
        summary: `Blog post "${post.title}" deleted.`
      });
      res.json({ message: 'Post deleted.' });
    })
  );

  router.get(
    '/admin/blog/comments',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const status =
        req.query['status'] === 'approved'
          ? 'approved'
          : req.query['status'] === 'pending'
            ? 'pending'
            : 'all';
      const comments = await prisma.blogComment.findMany({
        where:
          status === 'approved'
            ? { isApproved: true }
            : status === 'pending'
              ? { isApproved: false }
              : undefined,
        include: {
          post: { select: { id: true, slug: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 200
      });
      res.json({ comments });
    })
  );

  router.patch(
    '/admin/blog/comments/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR, Role.MARKETING),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      const body = z.object({ isApproved: z.boolean() }).parse(req.body);
      const comment = await prisma.blogComment.update({
        where: { id },
        data: { isApproved: body.isApproved }
      });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: body.isApproved ? 'blog.comment.approve' : 'blog.comment.hide',
        targetType: 'blog_comment',
        targetId: id,
        summary: `Blog comment ${body.isApproved ? 'approved' : 'hidden'}.`
      });
      res.json({ comment });
    })
  );

  router.delete(
    '/admin/blog/comments/:id',
    authRequired,
    allowRoles(Role.ADMIN, Role.HR),
    asyncRoute(async (req, res) => {
      const id = routeParam(req, 'id');
      await prisma.blogComment.delete({ where: { id } });
      await writeAuditLog({
        actorId: req.user!.id,
        actorRole: req.user!.role,
        action: 'blog.comment.delete',
        targetType: 'blog_comment',
        targetId: id,
        summary: 'Blog comment deleted.'
      });
      res.json({ message: 'Comment deleted.' });
    })
  );
}
