import { Router, Request } from 'express';
import jwt from 'jsonwebtoken';
import { HR_API_ROUTES, HR_ROLES } from '../../constants/hr-api-routes.constants.js';
import { HR_JWT_EXPIRY } from '../../constants/auth.constants.js';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../utils/helpers.js';
import { AuthPayload, hrAuthMiddleware, JWT_SECRET } from './shared.js';

export function registerHrAuthRoutes(router: Router) {
  // ─── HR User Auth ─────────────────────────────────────────────────────────────

  // POST /hr/auth/login
  router.post(
    HR_API_ROUTES.AUTH_LOGIN,
    asyncRoute(async (req, res) => {
      const { email, password } = req.body as { email: string; password: string };
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
      }

      const bcrypt = await import('bcryptjs');
      const user = await prisma.user.findFirst({
        where: { email: email.trim().toLowerCase(), role: HR_ROLES.HR },
        include: { hrProfile: true }
      });

      if (!user || user.role !== HR_ROLES.HR) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      if (!user.isActive) {
        res.status(401).json({ error: 'Account deactivated' });
        return;
      }
      if (!user.passwordHash) {
        res.status(401).json({ error: 'Password not set' });
        return;
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, {
        expiresIn: HR_JWT_EXPIRY
      });
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hrProfile: user.hrProfile
        }
      });
    })
  );

  // GET /hr/auth/me
  router.get(
    HR_API_ROUTES.AUTH_ME,
    hrAuthMiddleware,
    asyncRoute(async (req, res) => {
      const { userId } = (req as Request & { hrPayload: AuthPayload }).hrPayload;
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { hrProfile: true }
      });
      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hrProfile: user.hrProfile
        }
      });
    })
  );
}
