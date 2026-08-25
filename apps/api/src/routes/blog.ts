import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired } from '../auth.js';
import { BLOG_DETAIL_SELECT, BLOG_PUBLIC_SELECT } from '../constants/blog.constants.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';
import { publicContentDomainForPath } from '../services/public-content-domain.js';

export const blogRouter = Router();

function publicWhere(path: string) {
  const domain = publicContentDomainForPath(path);
  return {
    isPublished: true,
    isHidden: false,
    publicDomains: { has: domain }
  };
}

function resolveOrderBy(sort: string | undefined) {
  if (sort === 'popular')
    return [
      { viewCount: 'desc' as const },
      { publishedAt: { sort: 'desc' as const, nulls: 'last' as const } }
    ];
  if (sort === 'featured') {
    return [
      { isFeatured: 'desc' as const },
      { sortOrder: 'asc' as const },
      { publishedAt: { sort: 'desc' as const, nulls: 'last' as const } }
    ];
  }
  return [
    { sortOrder: 'asc' as const },
    { publishedAt: { sort: 'desc' as const, nulls: 'last' as const } },
    { createdAt: 'desc' as const }
  ];
}

blogRouter.get(
  ['/blog/categories', '/hope-hub/blog/categories'],
  asyncRoute(async (req, res) => {
    const where = publicWhere(req.path);
    const fromDb = await prisma.blogPost.findMany({
      where,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    res.json({ categories: [...new Set(fromDb.map((c) => c.category))].sort() });
  })
);

blogRouter.get(
  ['/blog/most-viewed', '/hope-hub/blog/most-viewed'],
  asyncRoute(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query['limit']) || 5, 1), 20);
    const where = publicWhere(req.path);
    const posts = await prisma.blogPost.findMany({
      where,
      select: BLOG_PUBLIC_SELECT,
      orderBy: [{ viewCount: 'desc' }, { publishedAt: { sort: 'desc', nulls: 'last' } }],
      take: limit
    });
    res.json({ posts });
  })
);

blogRouter.get(
  ['/blog', '/hope-hub/blog'],
  asyncRoute(async (req, res) => {
    const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
    const concern =
      typeof req.query['concern'] === 'string' ? req.query['concern'].trim() : undefined;
    const sort = typeof req.query['sort'] === 'string' ? req.query['sort'] : 'recent';
    const featuredOnly = req.query['featured'] === 'true';
    const where = publicWhere(req.path);

    const posts = await prisma.blogPost.findMany({
      where: {
        ...where,
        ...(category ? { category } : {}),
        ...(concern ? { concernSlugs: { has: concern } } : {}),
        ...(featuredOnly ? { isFeatured: true } : {})
      },
      select: BLOG_PUBLIC_SELECT,
      orderBy: resolveOrderBy(sort)
    });

    const fromDb = await prisma.blogPost.findMany({
      where,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    const categories = [...new Set(fromDb.map((c) => c.category))].sort();

    res.json({ posts, categories });
  })
);

blogRouter.get(
  ['/blog/:slug/comments', '/hope-hub/blog/:slug/comments'],
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim().toLowerCase();
    const where = publicWhere(req.path);
    const post = await prisma.blogPost.findFirst({
      where: { slug, ...where },
      select: { id: true }
    });
    if (!post) {
      res.status(404).json({ message: 'Article not found.' });
      return;
    }

    const comments = await prisma.blogComment.findMany({
      where: { postId: post.id, isApproved: true },
      select: { id: true, authorName: true, body: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ comments });
  })
);

blogRouter.post(
  ['/blog/:slug/comments', '/hope-hub/blog/:slug/comments'],
  authRequired,
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim().toLowerCase();
    const body = z.object({ body: z.string().min(2).max(2000) }).parse(req.body);
    const where = publicWhere(req.path);

    const post = await prisma.blogPost.findFirst({
      where: { slug, ...where },
      select: { id: true }
    });
    if (!post) {
      res.status(404).json({ message: 'Article not found.' });
      return;
    }

    const comment = await prisma.blogComment.create({
      data: {
        postId: post.id,
        userId: req.user!.id,
        authorName: req.user!.name,
        body: body.body.trim(),
        isApproved: req.user!.role === Role.ADMIN || req.user!.role === Role.MARKETING
      },
      select: { id: true, authorName: true, body: true, createdAt: true, isApproved: true }
    });

    res.status(201).json({
      comment,
      message: comment.isApproved ? 'Comment posted.' : 'Comment submitted for review.'
    });
  })
);

blogRouter.get(
  ['/blog/:slug', '/hope-hub/blog/:slug'],
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim().toLowerCase();
    const where = publicWhere(req.path);
    const post = await prisma.blogPost.findFirst({
      where: { slug, ...where }
    });
    if (!post) {
      res.status(404).json({ message: 'Article not found.' });
      return;
    }

    const updated = await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
      select: BLOG_DETAIL_SELECT
    });

    res.json({ post: updated });
  })
);
