import { Router } from 'express';
import { z } from 'zod';
import { asyncRoute } from '../../utils/helpers.js';
import { refreshAuthSession, revokeAuthSession } from '../../services/auth-sessions.js';

export function registerAuthSessionRoutes(router: Router) {
  router.post(
    '/auth/refresh',
    asyncRoute(async (req, res) => {
      const body = z.object({ refreshToken: z.string().min(20) }).parse(req.body);
      const response = await refreshAuthSession(body.refreshToken, req);
      if (!response) {
        return res.status(401).json({ message: 'Invalid or expired refresh session.' });
      }
      res.json(response);
    })
  );

  router.post(
    '/auth/logout',
    asyncRoute(async (req, res) => {
      const body = z.object({ refreshToken: z.string().min(20).optional() }).parse(req.body);
      if (body.refreshToken) {
        await revokeAuthSession(body.refreshToken, req);
      }
      res.json({ message: 'Logged out.' });
    })
  );
}
