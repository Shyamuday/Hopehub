import type express from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { allowRoles, authRequired } from '../auth.js';
import { prisma } from '../db.js';
import { asyncRoute } from '../middleware/async-route.js';
import { routeParam } from '../lib/http-params.js';

const ALLOWED_TOOL_KEYS = new Set(['kingdom', 'miasm']);

const answersSchema = z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length <= 200, 'Too many fields');

function normalizeAnswers(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim();
    if (!key || key.length > 200) {
      continue;
    }
    const val = typeof v === 'string' ? v.trim().slice(0, 8000) : '';
    if (val) {
      out[key] = val;
    }
  }
  return out;
}

export function registerPatientSelfDiagnosisRoutes(app: express.Application) {
  app.get(
    '/patient/self-diagnosis',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const rows = await prisma.patientSelfDiagnosisResult.findMany({
        where: { patientId: req.user!.id },
        orderBy: { updatedAt: 'desc' }
      });
      res.json({
        results: rows.map((r) => ({
          toolKey: r.toolKey,
          answers: r.answers as Record<string, string>,
          updatedAt: r.updatedAt.toISOString()
        }))
      });
    })
  );

  app.put(
    '/patient/self-diagnosis/:toolKey',
    authRequired,
    allowRoles(Role.PATIENT),
    asyncRoute(async (req, res) => {
      const rawKey = routeParam(req, 'toolKey') ?? '';
      const toolKey = rawKey.toLowerCase();
      if (!/^[a-z]{2,32}$/.test(toolKey) || !ALLOWED_TOOL_KEYS.has(toolKey)) {
        return res.status(400).json({ message: 'Unknown self-diagnosis tool.' });
      }

      const body = z.object({ answers: answersSchema }).parse(req.body);
      const answers = normalizeAnswers(body.answers);

      const saved = await prisma.patientSelfDiagnosisResult.upsert({
        where: {
          patientId_toolKey: { patientId: req.user!.id, toolKey }
        },
        create: {
          patientId: req.user!.id,
          toolKey,
          answers
        },
        update: { answers }
      });

      res.json({
        result: {
          toolKey: saved.toolKey,
          answers: saved.answers as Record<string, string>,
          updatedAt: saved.updatedAt.toISOString()
        },
        message: 'Saved.'
      });
    })
  );
}
