import { Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { authRequired } from '../auth.js';
import {
  BLOG_CATEGORIES,
  BLOG_DETAIL_SELECT,
  BLOG_PUBLIC_SELECT
} from '../constants/blog.constants.js';
import { prisma } from '../db.js';
import { asyncRoute, routeParam } from '../utils/helpers.js';

export const blogRouter = Router();

const publicWhere = { isPublished: true, isHidden: false };

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
  '/blog/categories',
  asyncRoute(async (_req, res) => {
    const fromDb = await prisma.blogPost.findMany({
      where: publicWhere,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    const merged = [...new Set([...BLOG_CATEGORIES, ...fromDb.map((c) => c.category)])].sort();
    res.json({ categories: merged });
  })
);

blogRouter.get(
  '/blog/most-viewed',
  asyncRoute(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query['limit']) || 5, 1), 20);
    const posts = await prisma.blogPost.findMany({
      where: publicWhere,
      select: BLOG_PUBLIC_SELECT,
      orderBy: [{ viewCount: 'desc' }, { publishedAt: { sort: 'desc', nulls: 'last' } }],
      take: limit
    });
    res.json({ posts });
  })
);

blogRouter.get(
  '/blog',
  asyncRoute(async (req, res) => {
    const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
    const concern =
      typeof req.query['concern'] === 'string' ? req.query['concern'].trim() : undefined;
    const sort = typeof req.query['sort'] === 'string' ? req.query['sort'] : 'recent';
    const featuredOnly = req.query['featured'] === 'true';

    const posts = await prisma.blogPost.findMany({
      where: {
        ...publicWhere,
        ...(category ? { category } : {}),
        ...(concern ? { concernSlugs: { has: concern } } : {}),
        ...(featuredOnly ? { isFeatured: true } : {})
      },
      select: BLOG_PUBLIC_SELECT,
      orderBy: resolveOrderBy(sort)
    });

    const fromDb = await prisma.blogPost.findMany({
      where: publicWhere,
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });
    const categories = [...new Set([...BLOG_CATEGORIES, ...fromDb.map((c) => c.category)])].sort();

    res.json({ posts, categories });
  })
);

blogRouter.get(
  '/blog/:slug/comments',
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim().toLowerCase();
    const post = await prisma.blogPost.findFirst({
      where: { slug, ...publicWhere },
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
  '/blog/:slug/comments',
  authRequired,
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim().toLowerCase();
    const body = z.object({ body: z.string().min(2).max(2000) }).parse(req.body);

    const post = await prisma.blogPost.findFirst({
      where: { slug, ...publicWhere },
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
  '/blog/:slug',
  asyncRoute(async (req, res) => {
    const slug = routeParam(req, 'slug').trim().toLowerCase();
    const post = await prisma.blogPost.findFirst({
      where: { slug, ...publicWhere }
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
