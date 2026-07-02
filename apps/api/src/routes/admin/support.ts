import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authRequired, allowRoles } from '../../auth.js';
import { asyncRoute, routeParam, writeAuditLog } from '../../utils/helpers.js';
import {
  buildPatientSupportContext,
  createPatientSupportNote,
  listPatientSupportNotes,
  parseSupportNoteCategory
} from '../../services/admin-support.js';

const supportNoteSchema = z.object({
  category: z.string().optional(),
  body: z.string().trim().min(2).max(4000),
  consultationId: z.string().optional()
});

export function registerAdminSupportRoutes(router: Router) {
  router.get(
    '/admin/consumers/:id/support',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'id');
      const [notes, context] = await Promise.all([
        listPatientSupportNotes(patientId),
        buildPatientSupportContext(patientId)
      ]);

      if (!context) {
        return res.status(404).json({ message: 'Consumer not found' });
      }

      res.json({
        notes: notes.map((note) => ({
          id: note.id,
          category: note.category,
          body: note.body,
          consultationId: note.consultationId,
          createdAt: note.createdAt,
          author: note.author,
          consultation: note.consultation
        })),
        context
      });
    })
  );

  router.post(
    '/admin/consumers/:id/support-notes',
    authRequired,
    allowRoles(Role.ADMIN),
    asyncRoute(async (req, res) => {
      const patientId = routeParam(req, 'id');
      const body = supportNoteSchema.parse(req.body);

      try {
        const note = await createPatientSupportNote({
          patientId,
          authorId: req.user!.id,
          category: parseSupportNoteCategory(body.category || 'GENERAL'),
          body: body.body,
          consultationId: body.consultationId
        });

        await writeAuditLog({
          actorId: req.user!.id,
          actorRole: req.user!.role,
          action: 'support.note_created',
          targetType: 'patient',
          targetId: patientId,
          summary: `Support note (${note.category}) added for patient.`,
          metadata: { noteId: note.id, consultationId: note.consultationId }
        });

        res.status(201).json({ note });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not save support note.';
        return res.status(400).json({ message });
      }
    })
  );
}
