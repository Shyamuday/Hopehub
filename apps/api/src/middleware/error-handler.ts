import type express from 'express';
import { z } from 'zod';

export function registerErrorHandler(app: express.Application) {
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', issues: error.issues });
    }

    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  });
}
