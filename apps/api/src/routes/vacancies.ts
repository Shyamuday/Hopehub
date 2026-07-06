import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncRoute } from '../utils/helpers.js';

export const vacanciesRouter = Router();

/** Public endpoint — no auth required — serves open vacancies to the patient portal. */
vacanciesRouter.get(
  '/vacancies',
  asyncRoute(async (_req, res) => {
    const vacancies = await prisma.jobVacancy.findMany({
      where: { status: 'OPEN' },
      select: {
        id: true,
        title: true,
        department: true,
        jobType: true,
        locationType: true,
        location: true,
        description: true,
        requirements: true,
        responsibilities: true,
        isUrgent: true,
        deadline: true,
        salaryRange: true,
        createdAt: true
      },
      orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }]
    });

    res.json({ vacancies });
  })
);
